import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, createRef, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { DialogHost, ProTable, twRules, type MlProTableColumn, type MlProTableRequestParams, type ProTableHandle } from '../../src/react'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | undefined
function render(el: React.ReactElement) {
  const host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => root!.render(el))
  return host
}
afterEach(() => {
  act(() => root?.unmount())
  root = undefined
  document.body.innerHTML = ''
})

/** Set a form control's value the way React notices. */
function setValue(el: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
  Object.getOwnPropertyDescriptor(proto, 'value')!.set!.call(el, value)
  act(() => void el.dispatchEvent(new Event('input', { bubbles: true })))
}
const flush = () => act(async () => void (await new Promise((r) => setTimeout(r, 0))))
const click = (el: Element | null | undefined) => act(() => (el as HTMLElement).click())
const names = (host: Element, col = 1) => [...host.querySelectorAll('tbody tr')].map((tr) => tr.querySelectorAll('td')[col]?.textContent)

interface Lion {
  id: number
  name: string
  role: string
  phone?: string
}

const columns: MlProTableColumn<Lion>[] = [
  { key: 'id', title: 'ID', sortable: true },
  { key: 'name', title: '名字', filter: true, form: { required: true } },
  { key: 'role', title: '角色', options: [{ value: 'king', label: '獅王' }, { value: 'cub', label: '幼獅' }], filter: true, form: true },
  { key: 'phone', title: '手機', hideInTable: true, form: { rules: twRules.mobile() } },
]
const lions: Lion[] = [
  { id: 1, name: 'Leo', role: 'king' },
  { id: 2, name: 'Simba', role: 'cub' },
  { id: 3, name: 'Nala', role: 'cub' },
]

describe('React ProTable', () => {
  it('filters, sorts and pages local data', () => {
    const onPageChange = vi.fn()
    const host = render(<ProTable columns={columns} data={lions} defaultPageSize={2} onPageChange={onPageChange} />)
    expect(names(host, 0)).toEqual(['1', '2'])
    expect(host.querySelector('.ml-pro-table__total')!.textContent).toBe('共 3 筆')
    expect(host.querySelectorAll('tbody td')[2].textContent).toBe('獅王')
    click([...host.querySelectorAll('.ml-pagination__btn')].at(-1))
    expect(onPageChange).toHaveBeenLastCalledWith(2)
    expect(names(host, 1)).toEqual(['Nala'])

    setValue(host.querySelector('.ml-filter input')!, 'a')
    act(() => void host.querySelector('.ml-filter')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })))
    expect(onPageChange).toHaveBeenLastCalledWith(1)
    expect(names(host, 1)).toEqual(['Simba', 'Nala'])
    click(host.querySelector('.ml-table__sort')) // ID asc
    click(host.querySelector('.ml-table__sort')) // ID desc
    expect(names(host, 1)).toEqual(['Nala', 'Simba'])
  })

  it('creates with validation, keeps the dialog open on failure, edits and deletes', async () => {
    let fail = true
    const onCreate = vi.fn(async () => {
      if (fail) throw new Error('名字重複')
    })
    const onUpdate = vi.fn()
    const onDelete = vi.fn()
    const onCreated = vi.fn()
    const handle = createRef<ProTableHandle<Lion>>()
    const host = render(<ProTable ref={handle} columns={columns} data={lions} onCreate={onCreate} onUpdate={onUpdate} onDelete={onDelete} onCreated={onCreated} confirmDelete={false} />)
    expect([...host.querySelectorAll('tbody tr')[0].querySelectorAll('.ml-pro-table__action')].map((b) => b.textContent)).toEqual(['編輯', '刪除'])

    click([...host.querySelectorAll('.ml-pro-table__actions .ml-btn')].at(-1))
    await flush()
    const modal = () => document.querySelector('.ml-modal')!
    expect(modal().querySelector('.ml-modal__title')!.textContent).toBe('新增資料')
    const save = () => [...modal().querySelectorAll<HTMLButtonElement>('.ml-modal__footer .ml-btn')].at(-1)!
    click(save())
    await flush()
    expect(onCreate).not.toHaveBeenCalled()
    expect(modal().querySelector('[data-prop="name"]')!.textContent).toContain('此欄位為必填')

    setValue(modal().querySelector('[data-prop="name"] input')!, 'Kovu')
    setValue(modal().querySelector('[data-prop="phone"] input')!, '123')
    click(save())
    await flush()
    expect(onCreate).not.toHaveBeenCalled()
    setValue(modal().querySelector('[data-prop="phone"] input')!, '0912345678')
    click(save())
    await flush()
    expect(onCreate).toHaveBeenCalledWith({ name: 'Kovu', role: '', phone: '0912345678' })
    expect(modal().querySelector('.ml-pro-table__form-error')!.textContent).toBe('名字重複')
    expect(onCreated).not.toHaveBeenCalled()

    fail = false
    click(save())
    await flush()
    expect(onCreated).toHaveBeenCalledTimes(1)
    await act(async () => void (await new Promise((r) => setTimeout(r, 260))))
    expect(document.querySelector('.ml-modal')).toBeNull()

    act(() => handle.current!.openEdit(lions[1]))
    await flush()
    expect(modal().querySelector('.ml-modal__title')!.textContent).toBe('編輯資料')
    expect(modal().querySelector<HTMLInputElement>('[data-prop="name"] input')!.value).toBe('Simba')
    click(save())
    await flush()
    expect(onUpdate).toHaveBeenCalledWith(lions[1], { name: 'Simba', role: 'cub', phone: '' })

    // Select two rows → batch delete.
    const boxes = host.querySelectorAll<HTMLInputElement>('tbody .ml-table__select input')
    click(boxes[0])
    click(boxes[2])
    expect(host.querySelector('.ml-pro-table__selection')!.textContent).toContain('已選取 2 筆')
    expect(handle.current!.selectedRows.map((r) => r.name)).toEqual(['Leo', 'Nala'])
    click([...host.querySelectorAll('.ml-pro-table__actions .ml-btn')].find((b) => b.textContent?.includes('刪除選取')))
    await flush()
    expect(onDelete).toHaveBeenCalledWith([lions[0], lions[2]])
    expect(host.querySelector('.ml-pro-table__selection')).toBeNull()
  })

  it('confirms a row delete through the dialog', async () => {
    const onDelete = vi.fn()
    const host = render(
      <>
        <DialogHost />
        <ProTable columns={columns} data={lions} onDelete={onDelete} />
      </>,
    )
    click(host.querySelector('.ml-pro-table__action--danger'))
    await flush()
    await act(async () => void (await new Promise((r) => setTimeout(r, 50))))
    expect(document.querySelector('.ml-dialog__message')!.textContent).toBe('確定刪除這筆資料？刪除後無法復原。')
    click([...document.querySelectorAll('.ml-modal__footer button')].at(-1))
    await flush()
    expect(onDelete).toHaveBeenCalledWith([lions[0]])
  })

  it('loads remote pages and drops stale responses', async () => {
    const pending: { params: MlProTableRequestParams; resolve: (r: { data: Lion[]; total: number }) => void }[] = []
    const request = vi.fn((params: MlProTableRequestParams) => new Promise<{ data: Lion[]; total: number }>((resolve) => pending.push({ params, resolve })))
    function Host() {
      const [page, setPage] = useState(1)
      return (
        <>
          <button className="go" onClick={() => setPage(page + 1)} />
          <ProTable columns={columns} request={request} page={page} onPageChange={setPage} pageSize={1} />
        </>
      )
    }
    const host = render(<Host />)
    await flush()
    expect(host.querySelector('.ml-table--loading')).not.toBeNull()
    expect(pending.at(-1)!.params).toEqual({ page: 1, pageSize: 1, filters: {}, sort: null })
    await act(async () => pending.at(-1)!.resolve({ data: [lions[0]], total: 3 }))
    expect(host.querySelector('.ml-table--loading')).toBeNull()
    expect(names(host)).toEqual(['Leo'])

    click(host.querySelector('.go'))
    await flush()
    click(host.querySelector('.go'))
    await flush()
    const [two, three] = pending.slice(-2)
    expect([two.params.page, three.params.page]).toEqual([2, 3])
    await act(async () => three.resolve({ data: [lions[2]], total: 3 }))
    await act(async () => two.resolve({ data: [lions[1]], total: 3 }))
    expect(names(host)).toEqual(['Nala'])
  })

  it('shows a load error with retry', async () => {
    let fail = true
    const onError = vi.fn()
    const request = vi.fn(async () => {
      if (fail) throw new Error('伺服器忙碌')
      return { data: lions, total: 3 }
    })
    const host = render(<ProTable columns={columns} request={request} onError={onError} />)
    await flush()
    expect(host.querySelector('.ml-pro-table__error')!.textContent).toContain('伺服器忙碌')
    expect(onError).toHaveBeenCalledTimes(1)
    fail = false
    click(host.querySelector('.ml-pro-table__retry'))
    await flush()
    expect(host.querySelector('.ml-pro-table__error')).toBeNull()
    expect(names(host)).toEqual(['Leo', 'Simba', 'Nala'])
  })

  it('renders custom cells, actions, toolbar and form fields', async () => {
    const host = render(
      <ProTable
        columns={columns}
        data={lions}
        onUpdate={() => {}}
        renderCell={({ column, value }) => (column.key === 'name' ? <b className="big">{String(value).toUpperCase()}</b> : undefined)}
        renderActions={({ row, edit }) => (
          <button className="mine" onClick={edit}>
            改 {row.name}
          </button>
        )}
        renderToolbar={() => <span className="extra">匯出</span>}
        renderFormField={({ field, value, update }) => (field.key === 'name' ? <input className="custom" value={String(value)} onChange={(e) => update(e.target.value)} /> : undefined)}
      />,
    )
    expect(host.querySelector('.big')!.textContent).toBe('LEO')
    expect(host.querySelector('.extra')!.textContent).toBe('匯出')
    click(host.querySelector('.mine'))
    await flush()
    expect(document.querySelector<HTMLInputElement>('.ml-modal input.custom')!.value).toBe('Leo')
  })
})
