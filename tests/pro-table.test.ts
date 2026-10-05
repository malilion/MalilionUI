// MlProTable and the ProTable logic (columns → fields, local pipeline, request guard).
import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { h, nextTick } from 'vue'
import { MlDialogHost, MlProTable, clampPage, createRequestGuard, localQuery, proFilterFields, proFormFields, proFormRules, proFormValues, proRequestParams, proTableColumns, sortRows, twRules, type MlProTableColumn, type MlProTableRequestParams } from '../src'
import { errorText, optionLabel, resolveRowActions, rowsByKeys } from '../src/components/pro-table'
import { validateValue } from '../src/form-rules'

let wrapper: VueWrapper | undefined
afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
  document.body.innerHTML = ''
})

interface Lion {
  id: number
  name: string
  role: string
  age: number
  phone?: string
  active?: boolean
}

const roles = [
  { value: 'king', label: '獅王' },
  { value: 'cub', label: '幼獅' },
]

const columns: MlProTableColumn<Lion>[] = [
  { key: 'id', title: 'ID', sortable: true, form: { type: 'number', disabled: (mode) => mode === 'edit' } },
  { key: 'name', title: '名字', sortable: true, filter: true, form: { required: true } },
  { key: 'role', title: '角色', options: roles, filter: true, form: true },
  { key: 'age', title: '年齡', sortable: true, filter: { type: 'number-range' }, form: { type: 'number', default: 3 } },
  { key: 'phone', title: '手機', hideInTable: true, form: { rules: twRules.mobile() } },
  { key: 'active', title: '在線', form: { type: 'switch' }, hideInFilter: true, filter: true },
  { key: 'bio', title: '簡介', hideInTable: true, form: { type: 'textarea' } },
]

const lions: Lion[] = [
  { id: 1, name: 'Leo', role: 'king', age: 9 },
  { id: 2, name: 'Simba', role: 'cub', age: 2 },
  { id: 3, name: 'Nala', role: 'cub', age: 3 },
  { id: 4, name: 'Mufasa', role: 'king', age: 12 },
  { id: 5, name: 'Kiara', role: 'cub', age: 1 },
]

describe('pro-table logic', () => {
  it('splits columns into table columns, filter fields and form fields', () => {
    const table = proTableColumns(columns)
    expect(table.map((c) => c.key)).toEqual(['id', 'name', 'role', 'age', 'active'])
    expect(table[2].format!('king', lions[0])).toBe('獅王')
    expect('filter' in table[1]).toBe(false)

    const filters = proFilterFields(columns)
    expect(filters).toEqual([
      { key: 'name', label: '名字', type: 'text' },
      { key: 'role', label: '角色', type: 'select', options: roles },
      { key: 'age', label: '年齡', type: 'number-range' },
    ])

    const form = proFormFields(columns)
    expect(form.map((f) => [f.key, f.type])).toEqual([
      ['id', 'number'],
      ['name', 'text'],
      ['role', 'select'],
      ['age', 'number'],
      ['phone', 'text'],
      ['active', 'switch'],
      ['bio', 'textarea'],
    ])
    expect(form.find((f) => f.key === 'name')!.required).toBe(true)
    expect(form.find((f) => f.key === 'bio')!.wide).toBe(true)
    expect(Object.keys(proFormRules(form))).toEqual(['name', 'phone'])
  })

  it('accepts twRules in form rules', async () => {
    const phone = proFormFields(columns).find((f) => f.key === 'phone')!
    expect(await validateValue('0912345678', phone.rules)).toBeUndefined()
    expect(await validateValue('12345', phone.rules)).toBeTruthy()
    expect(await validateValue('', phone.rules)).toBeUndefined()
  })

  it('starts the form from defaults or a copy of the row', () => {
    const fields = proFormFields(columns)
    expect(proFormValues(fields)).toEqual({ id: 0, name: '', role: '', age: 3, phone: '', active: false, bio: '' })
    const day = new Date(2026, 9, 4)
    const values = proFormValues([{ ...fields[1], key: 'day', type: 'date' }], { day })
    expect(values.day).toEqual(day)
    expect(values.day).not.toBe(day)
    expect(proFormValues(fields, lions[0])).toMatchObject({ id: 1, name: 'Leo', role: 'king', active: false, phone: '' })
    let n = 0
    expect(proFormValues([{ ...fields[0], default: () => ++n }])).toEqual({ id: 1 })
  })

  it('filters → sorts → paginates locally, clamping the page', () => {
    const fields = proFilterFields(columns)
    const q = (over: Partial<Parameters<typeof localQuery>[1]>) => localQuery(lions, { page: 1, pageSize: 2, filters: {}, sort: null, ...over }, fields)
    expect(q({}).data.map((r) => r.id)).toEqual([1, 2])
    expect(q({}).total).toBe(5)
    expect(q({ page: 3 }).data.map((r) => r.id)).toEqual([5])
    expect(q({ page: 9 }).page).toBe(3)
    expect(q({ filters: { role: 'cub' }, sort: { key: 'age', order: 'desc' } }).data.map((r) => r.name)).toEqual(['Nala', 'Simba'])
    expect(q({ filters: { age: [3, 10] }, pageSize: 10 }).data.map((r) => r.name)).toEqual(['Leo', 'Nala'])
    expect(q({ filters: { name: 'zzz' } })).toEqual({ data: [], total: 0, page: 1 })
  })

  it('sorts like MlTable: numbers, natural text, empties last', () => {
    const rows = [{ v: 'a10' }, { v: '' }, { v: 'a2' }, { v: null }, { v: 'a1' }]
    expect(sortRows(rows, { key: 'v', order: 'asc' }).map((r) => r.v)).toEqual(['a1', 'a2', 'a10', '', null])
    expect(sortRows(rows, { key: 'v', order: 'desc' }).map((r) => r.v).slice(0, 3)).toEqual(['a10', 'a2', 'a1'])
    expect(sortRows(rows, null)).toBe(rows)
  })

  it('builds request params and pages', () => {
    expect(proRequestParams({ page: 0, pageSize: 20, filters: { a: '', b: [], c: 'x', d: [null, 3] }, sort: { key: 'a', order: 'asc' } })).toEqual({
      page: 1,
      pageSize: 20,
      filters: { c: 'x', d: [null, 3] },
      sort: { key: 'a', order: 'asc' },
    })
    expect(clampPage(5, 21, 10)).toBe(3)
    expect(clampPage(5, 0, 10)).toBe(1)
    expect(clampPage(-1, 50, 10)).toBe(1)
  })

  it('only the newest request is current', () => {
    const guard = createRequestGuard()
    const a = guard.next()
    const b = guard.next()
    expect(guard.isLatest(a)).toBe(false)
    expect(guard.isLatest(b)).toBe(true)
    guard.cancel()
    expect(guard.isLatest(b)).toBe(false)
  })

  it('small helpers', () => {
    expect(optionLabel(roles, ['king', 'cub'])).toBe('獅王、幼獅')
    expect(optionLabel(roles, null)).toBe('—')
    expect(optionLabel(roles, 'x')).toBe('x')
    expect(rowsByKeys([3, 9, 1], lions, 'id').map((r) => r.name)).toEqual(['Nala', 'Leo'])
    expect(resolveRowActions(undefined, { edit: '編輯' }).map((a) => a.key)).toEqual(['edit'])
    expect(errorText(new Error('boom'), 'x')).toBe('boom')
    expect(errorText({}, 'fallback')).toBe('fallback')
  })
})


describe('MlProTable (local)', () => {
  it('filters, sorts and pages the data', async () => {
    wrapper = mount(MlProTable, { props: { columns, data: lions, pageSize: 2, title: '獅群' } as never })
    expect(wrapper.find('.ml-pro-table__title').text()).toBe('獅群')
    expect(wrapper.find('.ml-pro-table__total').text()).toBe('共 5 筆')
    expect(wrapper.findAll('tbody tr')).toHaveLength(2)
    // No CRUD hooks: no actions column, no checkboxes, no 新增.
    expect(wrapper.find('.ml-pro-table__row-actions').exists()).toBe(false)
    expect(wrapper.find('.ml-table__select').exists()).toBe(false)
    expect(wrapper.findAll('.ml-pro-table__toolbar .ml-btn')).toHaveLength(1)

    const input = wrapper.find('.ml-filter input')
    await input.setValue('a')
    await wrapper.find('.ml-filter').trigger('submit')
    expect(wrapper.find('.ml-pro-table__total').text()).toBe('共 4 筆')
    expect(wrapper.emitted('update:filters')![0]).toEqual([{ name: 'a' }])

    await wrapper.findAll('.ml-table__sort')[2].trigger('click') // 年齡 asc
    expect(wrapper.emitted('update:sort')!.at(-1)).toEqual([{ key: 'age', order: 'asc' }])
    expect(wrapper.findAll('tbody tr').map((tr) => tr.findAll('td')[1].text())).toEqual(['Kiara', 'Simba'])

    await wrapper.findAll('.ml-pagination__btn').at(-1)!.trigger('click')
    expect(wrapper.emitted('update:page')!.at(-1)).toEqual([2])
    expect(wrapper.findAll('tbody tr').map((tr) => tr.findAll('td')[1].text())).toEqual(['Nala', 'Mufasa'])
  })

  it('shows option labels, honours v-model:page and clamps it', async () => {
    wrapper = mount(MlProTable, { props: { columns, data: lions, page: 9, pageSize: 2, 'onUpdate:page': (p: number) => void wrapper?.setProps({ page: p } as never) } as never })
    await nextTick()
    expect(wrapper.emitted('update:page')![0]).toEqual([3])
    expect(wrapper.find('tbody td:nth-child(3)').text()).toBe('幼獅')
  })

  it('creates, edits and deletes through the hooks', async () => {
    const data = [...lions]
    const onCreate = vi.fn(async (values: Record<string, unknown>) => void data.push(values as unknown as Lion))
    const onUpdate = vi.fn(async () => {})
    const onDelete = vi.fn(async () => {})
    wrapper = mount(MlProTable, { props: { columns, data, onCreate, onUpdate, onDelete, confirmDelete: false, pageSize: 10 } as never, attachTo: document.body })
    // Actions column + checkboxes now.
    expect(wrapper.findAll('.ml-pro-table__action').map((b) => b.text()).slice(0, 2)).toEqual(['編輯', '刪除'])
    expect(wrapper.find('.ml-table__select').exists()).toBe(true)

    // 新增: required name blocks the save.
    await wrapper.findAll('.ml-pro-table__actions .ml-btn').at(-1)!.trigger('click')
    await flushPromises()
    const modal = () => document.querySelector('.ml-modal')!
    expect(modal().querySelector('.ml-modal__title')!.textContent).toBe('新增資料')
    expect(modal().querySelectorAll('.ml-form-item')).toHaveLength(7)
    const save = () => [...modal().querySelectorAll<HTMLButtonElement>('.ml-modal__footer .ml-btn')].at(-1)!
    save().click()
    await flushPromises()
    expect(onCreate).not.toHaveBeenCalled()
    expect(modal().textContent).toContain('此欄位為必填')

    const name = modal().querySelector<HTMLInputElement>('[data-prop="name"] input')!
    name.value = 'Kovu'
    name.dispatchEvent(new Event('input'))
    await flushPromises()
    save().click()
    await flushPromises()
    expect(onCreate).toHaveBeenCalledWith(expect.objectContaining({ name: 'Kovu', age: 3, active: false }))
    expect(wrapper.emitted('created')).toHaveLength(1)
    await new Promise((r) => setTimeout(r, 260))
    expect(document.querySelector('.ml-modal')).toBeNull()
    await wrapper.setProps({ data: [...data] } as never)
    expect(wrapper.find('.ml-pro-table__total').text()).toBe('共 6 筆')

    // 編輯: id is locked, values start from the row.
    await wrapper.findAll('.ml-pro-table__action')[0].trigger('click')
    await flushPromises()
    expect(modal().querySelector('.ml-modal__title')!.textContent).toBe('編輯資料')
    expect(modal().querySelector<HTMLInputElement>('[data-prop="id"] input')!.disabled).toBe(true)
    expect(modal().querySelector<HTMLInputElement>('[data-prop="name"] input')!.value).toBe('Leo')
    save().click()
    await flushPromises()
    expect(onUpdate).toHaveBeenCalledWith(lions[0], expect.objectContaining({ name: 'Leo', role: 'king' }))

    // Batch delete of the selection.
    const boxes = wrapper.findAll('tbody .ml-table__select input')
    await boxes[1].setValue(true)
    await boxes[2].setValue(true)
    expect(wrapper.find('.ml-pro-table__selection').text()).toContain('已選取 2 筆')
    const batch = wrapper.findAll('.ml-pro-table__actions .ml-btn').find((b) => b.text().includes('刪除選取'))!
    await batch.trigger('click')
    await flushPromises()
    expect(onDelete).toHaveBeenCalledWith([lions[1], lions[2]])
    expect(wrapper.emitted('deleted')).toHaveLength(1)
    expect(wrapper.find('.ml-pro-table__selection').exists()).toBe(false)
  })

  it('keeps the dialog open and shows the error when saving fails', async () => {
    const pending = deferred<void>()
    const onCreate = vi.fn(() => pending.promise)
    wrapper = mount(MlProTable, { props: { columns: columns.slice(1, 2), data: lions, onCreate } as never, attachTo: document.body })
    ;(wrapper.vm as unknown as { openCreate: () => void }).openCreate()
    await flushPromises()
    const name = document.querySelector<HTMLInputElement>('.ml-modal [data-prop="name"] input')!
    name.value = 'Leo'
    name.dispatchEvent(new Event('input'))
    await flushPromises()
    const save = [...document.querySelectorAll<HTMLButtonElement>('.ml-modal__footer .ml-btn')].at(-1)!
    save.click()
    await flushPromises()
    expect(onCreate).toHaveBeenCalled()
    expect(save.classList.contains('ml-btn--loading')).toBe(true)
    pending.reject(new Error('名字重複'))
    await flushPromises()
    expect(document.querySelector('.ml-pro-table__form-error')!.textContent).toBe('名字重複')
    expect(document.querySelector('.ml-modal')).not.toBeNull()
    expect(wrapper.emitted('error')).toHaveLength(1)
    expect(save.classList.contains('ml-btn--loading')).toBe(false)
  })

  it('asks before deleting a row', async () => {
    mount(MlDialogHost, { attachTo: document.body })
    const onDelete = vi.fn()
    wrapper = mount(MlProTable, { props: { columns, data: lions, onDelete } as never, attachTo: document.body })
    await wrapper.find('.ml-pro-table__action--danger').trigger('click')
    await flushPromises()
    expect(document.querySelector('.ml-dialog__message')!.textContent).toBe('確定刪除這筆資料？刪除後無法復原。')
    // Cancel first.
    document.querySelector<HTMLButtonElement>('.ml-modal__footer button')!.click()
    await flushPromises()
    expect(onDelete).not.toHaveBeenCalled()
    await new Promise((r) => setTimeout(r, 260))

    await wrapper.find('.ml-pro-table__action--danger').trigger('click')
    await flushPromises()
    await new Promise((r) => setTimeout(r, 260))
    await flushPromises()
    ;[...document.querySelectorAll<HTMLButtonElement>('.ml-modal__footer button')].at(-1)!.click()
    await flushPromises()
    expect(onDelete).toHaveBeenCalledWith([lions[0]])
  })

  it('renders cell, actions, toolbar and form slots', async () => {
    wrapper = mount(MlProTable, {
      props: { columns, data: lions, onUpdate: () => {} } as never,
      slots: {
        'cell-name': ({ value }: { value: unknown }) => h('b', { class: 'big' }, String(value).toUpperCase()),
        actions: ({ row, edit }: { row: Record<string, unknown>; edit: () => void }) => h('button', { class: 'mine', onClick: edit }, `改 ${row.name}`),
        toolbar: () => h('span', { class: 'extra' }, '匯出'),
        'form-name': ({ value, update }: { value: unknown; update: (v: unknown) => void }) => h('input', { class: 'custom', value: String(value), onInput: (e: Event) => update((e.target as HTMLInputElement).value) }),
      },
      attachTo: document.body,
    })
    expect(wrapper.find('.big').text()).toBe('LEO')
    expect(wrapper.find('.extra').text()).toBe('匯出')
    await wrapper.find('.mine').trigger('click')
    await flushPromises()
    expect(document.querySelector<HTMLInputElement>('.ml-modal input.custom')!.value).toBe('Leo')
  })

  it('custom rowActions run their own handlers', async () => {
    const onClick = vi.fn()
    wrapper = mount(MlProTable, {
      props: { columns, data: lions, rowActions: [{ key: 'view', label: '查看', onClick }, { key: 'x', label: '停用', disabled: (r: Lion) => r.age > 5, hidden: (r: Lion) => r.id === 2 }] } as never,
    })
    const first = wrapper.findAll('tbody tr')[0].findAll('.ml-pro-table__action')
    expect(first.map((b) => b.text())).toEqual(['查看', '停用'])
    expect(first[1].attributes('disabled')).toBeDefined()
    expect(wrapper.findAll('tbody tr')[1].findAll('.ml-pro-table__action')).toHaveLength(1)
    await first[0].trigger('click')
    expect(onClick).toHaveBeenCalledWith(lions[0])
  })
})

function deferred<T>() {
  let resolve!: (v: T) => void
  let reject!: (e: unknown) => void
  const promise = new Promise<T>((a, b) => {
    resolve = a
    reject = b
  })
  return { promise, resolve, reject }
}

describe('MlProTable (remote)', () => {
  it('loads pages, shows loading and ignores stale responses', async () => {
    const calls: { params: MlProTableRequestParams; d: ReturnType<typeof deferred<{ data: Lion[]; total: number }>> }[] = []
    const request = vi.fn((params: MlProTableRequestParams) => {
      const d = deferred<{ data: Lion[]; total: number }>()
      calls.push({ params, d })
      return d.promise
    })
    wrapper = mount(MlProTable, { props: { columns, request, pageSize: 2 } as never })
    await flushPromises()
    expect(request).toHaveBeenCalledTimes(1)
    expect(calls[0].params).toEqual({ page: 1, pageSize: 2, filters: {}, sort: null })
    expect(wrapper.find('.ml-table--loading').exists()).toBe(true)
    calls[0].d.resolve({ data: lions.slice(0, 2), total: 5 })
    await flushPromises()
    expect(wrapper.find('.ml-table--loading').exists()).toBe(false)
    expect(wrapper.find('.ml-pro-table__total').text()).toBe('共 5 筆')
    expect(wrapper.emitted('load')).toHaveLength(1)

    // Page 2, then page 3 before page 2 answers: page 2's late answer is dropped.
    await wrapper.setProps({ page: 2 } as never)
    await flushPromises()
    await wrapper.setProps({ page: 3 } as never)
    await flushPromises()
    expect(calls.map((c) => c.params.page)).toEqual([1, 2, 3])
    calls[2].d.resolve({ data: lions.slice(4), total: 5 })
    await flushPromises()
    calls[1].d.resolve({ data: lions.slice(2, 4), total: 5 })
    await flushPromises()
    expect(wrapper.findAll('tbody tr').map((tr) => tr.findAll('td')[1].text())).toEqual(['Kiara'])
    expect(wrapper.emitted('load')).toHaveLength(2)
  })

  it('sends filters and sort, resets to page 1', async () => {
    const request = vi.fn(async (_p: MlProTableRequestParams) => ({ data: lions.slice(0, 1), total: 1 }))
    wrapper = mount(MlProTable, { props: { columns, request, page: 2 } as never })
    await flushPromises()
    await wrapper.find('.ml-filter input').setValue('Leo')
    await wrapper.find('.ml-filter').trigger('submit')
    await flushPromises()
    expect(wrapper.emitted('update:page')!.at(-1)).toEqual([1])
    await wrapper.setProps({ page: 1 } as never)
    await flushPromises()
    expect(request.mock.calls.at(-1)![0]).toEqual({ page: 1, pageSize: 10, filters: { name: 'Leo' }, sort: null })
  })

  it('shows the error with a retry', async () => {
    let fail = true
    const request = vi.fn(async () => {
      if (fail) throw new Error('伺服器忙碌')
      return { data: lions, total: 5 }
    })
    wrapper = mount(MlProTable, { props: { columns, request } as never })
    await flushPromises()
    expect(wrapper.find('.ml-pro-table__error').text()).toContain('伺服器忙碌')
    expect(wrapper.emitted('error')).toHaveLength(1)
    fail = false
    await wrapper.find('.ml-pro-table__retry').trigger('click')
    await flushPromises()
    expect(wrapper.find('.ml-pro-table__error').exists()).toBe(false)
    expect(wrapper.findAll('tbody tr')).toHaveLength(5)
  })

  it('refreshes after a delete and steps back from an emptied last page', async () => {
    let store = lions.slice()
    const request = vi.fn(async ({ page, pageSize }: MlProTableRequestParams) => ({ data: store.slice((page - 1) * pageSize, page * pageSize), total: store.length }))
    const onDelete = vi.fn(async (rows: Lion[]) => void (store = store.filter((l) => !rows.includes(l))))
    let w!: VueWrapper
    w = wrapper = mount(MlProTable, { props: { columns, request, onDelete, confirmDelete: false, pageSize: 2, page: 3, 'onUpdate:page': (p: number) => w.setProps({ page: p } as never) } as never })
    await flushPromises()
    expect(w.findAll('tbody tr')).toHaveLength(1)
    await w.find('.ml-pro-table__action--danger').trigger('click')
    await flushPromises()
    expect(onDelete).toHaveBeenCalledWith([lions[4]])
    expect(w.emitted('update:page')!.at(-1)).toEqual([2])
    await flushPromises()
    expect(w.findAll('tbody tr').map((tr) => tr.findAll('td')[2].text())).toEqual(['Nala', 'Mufasa'])

    // The reload button fetches again.
    const before = request.mock.calls.length
    await w.find('.ml-pro-table__actions .ml-btn--square').trigger('click')
    await flushPromises()
    expect(request.mock.calls.length).toBe(before + 1)
  })
})
