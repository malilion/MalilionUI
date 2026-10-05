import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref, withDirectives } from 'vue'
import { MlTable, vLoading } from '../src'
import { cellText, clampWidth, nextEditable, parseEdit, pxOf, resizeByKey } from '../src/components/table-edit'

afterEach(() => {
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

const columns = [
  { key: 'name', title: 'Name', sortable: true },
  { key: 'n', title: 'N', sortable: true },
]
const rows = Array.from({ length: 23 }, (_, i) => ({ id: i + 1, name: `Row ${String(i + 1).padStart(2, '0')}`, n: i + 1 }))

describe('MlTable — paging', () => {
  it('slices the sorted rows, shows the total and clamps the page', async () => {
    const wrapper = mount(MlTable, { props: { columns, rows, pageSize: 10, page: 3 } })
    expect(wrapper.findAll('tbody tr')).toHaveLength(3)
    expect(wrapper.find('.ml-table__count').text()).toBe('共 23 筆')
    await wrapper.setProps({ sort: { key: 'n', order: 'desc' }, page: 1 })
    expect(wrapper.get('tbody tr td:first-child').text()).toContain('Row 23')
    await wrapper.setProps({ rows: rows.slice(0, 5), page: 3 })
    expect(wrapper.emitted('update:page')?.at(-1)).toEqual([1])
    expect(wrapper.find('.ml-table__footer').exists()).toBe(false)
  })
})

describe('MlTable — expandable rows', () => {
  it('adds an expander column and renders the #expand slot for open rows', async () => {
    const wrapper = mount(MlTable, {
      props: { columns, rows: rows.slice(0, 3), rowExpandable: (r: Record<string, unknown>) => r.id !== 2 },
      slots: { expand: ({ row }: { row: Record<string, unknown> }) => h('p', { class: 'detail' }, `More about ${row.name}`) },
    })
    const buttons = wrapper.findAll('.ml-table__expander')
    expect(buttons).toHaveLength(2) // row 2 can't expand
    await buttons[0].trigger('click')
    expect(wrapper.emitted('update:expanded')?.[0]).toEqual([[1]])
    await wrapper.setProps({ expanded: [1] })
    expect(wrapper.find('.detail').text()).toBe('More about Row 01')
    expect(wrapper.get('.ml-table__detail-row td').attributes('colspan')).toBe('3')
  })
})

describe('MlTable — tree rows', () => {
  const tree = [
    { id: 'a', name: 'A', n: 2, children: [{ id: 'a2', name: 'A2', n: 9 }, { id: 'a1', name: 'A1', n: 1 }] },
    { id: 'b', name: 'B', n: 1 },
  ]

  it('shows children of open rows, indented, sorted per level', async () => {
    const wrapper = mount(MlTable, { props: { columns, rows: tree, sort: { key: 'n', order: 'asc' } } })
    expect(wrapper.get('table').attributes('role')).toBe('treegrid')
    expect(wrapper.findAll('tbody tr').map((r) => r.find('td').text())).toEqual(['B', 'A'])
    await wrapper.get('.ml-table__tree-toggle').trigger('click')
    expect(wrapper.emitted('update:treeOpen')?.[0]).toEqual([['a']])
    await wrapper.setProps({ treeOpen: ['a'] })
    const names = wrapper.findAll('tbody tr').map((r) => r.find('td').text())
    expect(names).toEqual(['B', 'A', 'A1', 'A2'])
    expect(wrapper.findAll('tbody tr')[2].attributes('aria-level')).toBe('2')
  })
})

describe('MlTable — sticky header & fixed columns', () => {
  it('scrolls inside max-height and pins fixed columns with measured offsets', async () => {
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(100)
    const wrapper = mount(MlTable, {
      props: {
        columns: [
          { key: 'name', title: 'Name', fixed: 'left' as const },
          { key: 'n', title: 'N' },
          { key: 'x', title: 'X', fixed: 'right' as const },
        ],
        rows: rows.slice(0, 2),
        selectable: true,
        maxHeight: 200,
      },
      attachTo: document.body,
    })
    await nextTick()
    expect(wrapper.classes()).toContain('ml-table--sticky')
    expect(wrapper.get('.ml-table__scroll').attributes('style')).toContain('max-height: 200px')
    const head = wrapper.findAll('thead th')
    expect(head[0].attributes('style')).toContain('left: 0px') // select column
    expect(head[1].attributes('style')).toContain('left: 100px') // name, after the checkbox
    expect(head[3].attributes('style')).toContain('right: 0px')
    expect(head[1].classes()).toContain('ml-table__fixed--last-left')
  })
})

describe('table-edit helpers', () => {
  const msgs = { invalidNumber: 'NaN!' }

  it('parses editor text per editor kind and runs the validator', () => {
    const text = { key: 'name', title: 'Name', editable: true as const, validate: (v: unknown) => (v === '' ? 'Required' : undefined) }
    expect(parseEdit(text, {}, 'Nala', 'Nala', msgs)).toEqual({ kind: 'same' })
    expect(parseEdit(text, {}, 'Nala', 'Kiara', msgs)).toEqual({ kind: 'ok', value: 'Kiara' })
    expect(parseEdit(text, {}, 'Nala', '', msgs)).toEqual({ kind: 'error', message: 'Required' })
    const num = { key: 'n', title: 'N', editable: 'number' as const }
    expect(parseEdit(num, {}, 3, ' 4.5 ', msgs)).toEqual({ kind: 'ok', value: 4.5 })
    expect(parseEdit(num, {}, 3, '', msgs)).toEqual({ kind: 'ok', value: null })
    expect(parseEdit(num, {}, 3, '3.0', msgs)).toEqual({ kind: 'same' })
    expect(parseEdit(num, {}, 3, 'abc', msgs)).toEqual({ kind: 'error', message: 'NaN!' })
    const sel = { key: 's', title: 'S', editable: 'select' as const, options: [{ value: 1, label: 'One' }, { value: 2, label: 'Two' }] }
    expect(parseEdit(sel, {}, 1, '2', msgs)).toEqual({ kind: 'ok', value: 2 })
    expect(cellText(sel, 2, {})).toBe('Two')
    expect(cellText(sel, null, {})).toBe('—')
  })

  it('finds the next editable column and clamps resize steps', () => {
    const cols = [
      { key: 'a', title: 'A', editable: true },
      { key: 'b', title: 'B' },
      { key: 'c', title: 'C', editable: 'number' as const },
    ]
    expect(nextEditable(cols, 0, 1)).toBe(2)
    expect(nextEditable(cols, 2, -1)).toBe(0)
    expect(nextEditable(cols, 2, 1)).toBe(-1)
    const col = { key: 'a', title: 'A', resizable: true, minWidth: 80, maxWidth: 200 }
    expect(resizeByKey(col, 100, 'ArrowRight', false)).toBe(110)
    expect(resizeByKey(col, 100, 'ArrowLeft', true)).toBe(80)
    expect(resizeByKey(col, 190, 'ArrowRight', true)).toBe(200)
    expect(resizeByKey(col, 100, 'End', false)).toBe(200)
    expect(resizeByKey(col, 100, 'Enter', false)).toBeNull()
    expect(clampWidth({ key: 'x', title: 'X' }, 10)).toBe(48)
    expect(pxOf('120px')).toBe(120)
    expect(pxOf('20%')).toBeUndefined()
  })
})

describe('MlTable — inline editing', () => {
  const editCols = [
    { key: 'name', title: '名字', editable: true, validate: (v: unknown) => (String(v).trim() ? undefined : '不能空白') },
    { key: 'n', title: '數量', editable: 'number' as const, align: 'right' as const },
    { key: 'role', title: '角色', editable: 'select' as const, options: [{ value: 'king', label: '國王' }, { value: 'cub', label: '幼獅' }] },
  ]
  const editRows = [
    { id: 1, name: 'Simba', n: 3, role: 'king' },
    { id: 2, name: 'Kiara', n: 1, role: 'cub' },
  ]
  const mountEdit = () => mount(MlTable, { props: { columns: editCols, rows: editRows, hoverPaw: false }, attachTo: document.body })
  const cellAt = (wrapper: ReturnType<typeof mountEdit>, r: number, c: number) => wrapper.findAll('tbody tr')[r].findAll('td')[c]

  it('opens on double-click, commits on Enter and reports without touching rows', async () => {
    const wrapper = mountEdit()
    const cell = cellAt(wrapper, 0, 0)
    expect(cell.attributes('tabindex')).toBe('0')
    expect(cell.classes()).toContain('ml-table__cell--editable')
    await cell.trigger('dblclick')
    await nextTick()
    const input = wrapper.get('.ml-table__editor input')
    expect(input.attributes('aria-label')).toBe('編輯 名字')
    expect(document.activeElement).toBe(input.element)
    await input.setValue('Mufasa')
    await input.trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('cell-edit')?.[0]).toEqual([{ row: editRows[0], key: 'name', value: 'Mufasa', oldValue: 'Simba', rowIndex: 0 }])
    expect(editRows[0].name).toBe('Simba')
    // The cell shows rows[] as given: a parent that ignores the edit keeps the old value…
    const after = cellAt(wrapper, 0, 0)
    expect(after.text()).toBe('Simba')
    expect(after.attributes('aria-busy')).toBeUndefined()
    await nextTick()
    expect(document.activeElement).toBe(after.element)
    // …and one that applies it shows the new value.
    await wrapper.setProps({ rows: [{ ...editRows[0], name: 'Mufasa' }, editRows[1]] })
    expect(cellAt(wrapper, 0, 0).text()).toBe('Mufasa')
  })

  it('blocks invalid values with a message, and Esc restores the cell', async () => {
    const wrapper = mountEdit()
    const cell = cellAt(wrapper, 1, 0)
    await cell.trigger('keydown', { key: 'F2' })
    await nextTick()
    const input = wrapper.get('.ml-table__editor input')
    await input.setValue('  ')
    await input.trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('cell-edit')).toBeUndefined()
    expect(input.attributes('aria-invalid')).toBe('true')
    const error = wrapper.get('.ml-table__edit-error')
    expect(error.text()).toBe('不能空白')
    expect(input.attributes('aria-describedby')).toBe(error.attributes('id'))
    await input.trigger('keydown', { key: 'Escape' })
    await nextTick()
    expect(wrapper.find('.ml-table__editor').exists()).toBe(false)
    expect(cell.text()).toBe('Kiara')
    expect(document.activeElement).toBe(cell.element)
  })

  it('Tab commits and moves to the next editable cell; number and select editors convert', async () => {
    const wrapper = mountEdit()
    await cellAt(wrapper, 0, 1).trigger('keydown', { key: 'Enter' })
    await nextTick()
    const input = wrapper.get('.ml-table__editor input')
    expect(input.attributes('inputmode')).toBe('decimal')
    await input.setValue('x')
    await input.trigger('keydown', { key: 'Tab' })
    expect(wrapper.get('.ml-table__edit-error').text()).toBe('請輸入數字')
    await input.setValue('12')
    await input.trigger('keydown', { key: 'Tab' })
    await nextTick()
    expect(wrapper.emitted('cell-edit')?.[0][0]).toMatchObject({ key: 'n', value: 12, oldValue: 3 })
    const select = wrapper.get('.ml-table__editor select')
    expect(select.attributes('aria-label')).toBe('編輯 角色')
    expect(document.activeElement).toBe(select.element)
    await select.setValue('cub')
    await select.trigger('blur')
    expect(wrapper.emitted('cell-edit')?.[1][0]).toMatchObject({ key: 'role', value: 'cub', oldValue: 'king' })
    // rows weren't updated, so the cell still shows the old option's label.
    expect(cellAt(wrapper, 0, 2).text()).toBe('國王')
    expect(cellAt(wrapper, 1, 2).text()).toBe('幼獅')
  })
})

describe('MlTable — column resizing', () => {
  const resizeCols = [
    { key: 'name', title: 'Name', sortable: true, resizable: true, minWidth: 80, maxWidth: 300 },
    { key: 'n', title: 'N', width: '120px' },
  ]

  it('resizes with the keyboard and reports v-model:column-widths', async () => {
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(150)
    const wrapper = mount(MlTable, { props: { columns: resizeCols, rows: rows.slice(0, 2) }, attachTo: document.body })
    await nextTick()
    const handle = wrapper.get('[role="separator"]')
    expect(handle.attributes()).toMatchObject({ tabindex: '0', 'aria-orientation': 'vertical', 'aria-valuemin': '80', 'aria-valuemax': '300', 'aria-label': '調整「Name」欄寬' })
    expect(handle.attributes('aria-valuenow')).toBe('150')
    await handle.trigger('keydown', { key: 'ArrowRight' })
    expect(wrapper.emitted('update:columnWidths')?.[0]).toEqual([{ name: 160 }])
    expect(wrapper.emitted('column-resize')?.[0]).toEqual(['name', 160])
    await handle.trigger('keydown', { key: 'ArrowLeft', shiftKey: true })
    expect(wrapper.emitted('update:columnWidths')?.[1]).toEqual([{ name: 110 }])
    expect(wrapper.get('thead th').attributes('style')).toContain('width: 110px')
    expect(wrapper.get('[role="separator"]').attributes('aria-valuenow')).toBe('110')
  })

  it('drags the handle without the release click sorting the column', async () => {
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(150)
    const wrapper = mount(MlTable, { props: { columns: resizeCols, rows: rows.slice(0, 2) }, attachTo: document.body })
    const handle = wrapper.get('[role="separator"]').element
    handle.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, button: 0, clientX: 100 }))
    await nextTick()
    expect(wrapper.classes()).toContain('ml-table--resizing')
    window.dispatchEvent(new MouseEvent('pointermove', { clientX: 140 }))
    expect(wrapper.emitted('update:columnWidths')?.at(-1)).toEqual([{ name: 190 }])
    window.dispatchEvent(new MouseEvent('pointermove', { clientX: 600 }))
    expect(wrapper.emitted('update:columnWidths')?.at(-1)).toEqual([{ name: 300 }])
    window.dispatchEvent(new MouseEvent('pointerup', { clientX: 600 }))
    ;(wrapper.get('.ml-table__sort').element as HTMLElement).click()
    expect(wrapper.emitted('update:sort')).toBeUndefined()
    expect(wrapper.emitted('column-resize')).toEqual([['name', 300]])
    await nextTick()
    expect(wrapper.classes()).not.toContain('ml-table--resizing')
    await new Promise((r) => setTimeout(r))
    await wrapper.get('.ml-table__sort').trigger('click')
    expect(wrapper.emitted('update:sort')?.[0]).toEqual([{ key: 'name', order: 'asc' }])
  })
})

describe('v-loading', () => {
  it('adds and removes the mask and marks the element busy', async () => {
    const busy = ref(true)
    const Comp = defineComponent({
      setup: () => () => withDirectives(h('div', { class: 'box' }, 'content'), [[vLoading, busy.value]]),
    })
    const wrapper = mount(Comp, { attachTo: document.body })
    const box = wrapper.get('.box').element as HTMLElement
    expect(box.querySelector('.ml-loading')).not.toBeNull()
    expect(box.getAttribute('aria-busy')).toBe('true')
    expect(box.style.position).toBe('relative')
    busy.value = false
    await nextTick()
    expect(box.hasAttribute('aria-busy')).toBe(false)
    await new Promise((r) => setTimeout(r, 450))
    expect(box.querySelector('.ml-loading')).toBeNull()
  })
})
