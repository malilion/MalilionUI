import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref, withDirectives } from 'vue'
import { MlTable, vLoading } from '../src'

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
      props: { columns, rows: rows.slice(0, 3), rowExpandable: (r: { id: number }) => r.id !== 2 },
      slots: { expand: ({ row }: { row: { name: string } }) => h('p', { class: 'detail' }, `More about ${row.name}`) },
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
