import { afterEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { Table } from '../../src/react/table'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | undefined
function render(el: React.ReactElement) {
  const host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => root!.render(el))
  return host
}
const click = (el: Element | null) => act(() => void (el as HTMLElement).click())
const names = (host: HTMLElement) => [...host.querySelectorAll('tbody tr')].map((tr) => tr.querySelectorAll('td')[tr.querySelector('.ml-table__select') ? 1 : 0]?.textContent)

afterEach(() => {
  act(() => root?.unmount())
  root = undefined
  document.body.innerHTML = ''
})

const columns = [{ key: 'name', title: 'Name', sortable: true }, { key: 'age', title: 'Age', sortable: true }]
const rows = [
  { id: 1, name: 'Nala', age: 3 },
  { id: 2, name: 'Simba', age: 5 },
  { id: 3, name: 'Kiara', age: 1 },
]

describe('Table', () => {
  it('cycles sort none → asc → desc → none and reports it', () => {
    const onSortChange = vi.fn()
    const host = render(<Table columns={columns} rows={rows} onSortChange={onSortChange} hoverPaw={false} />)
    const th = host.querySelectorAll('th')[1]
    expect(th.getAttribute('aria-sort')).toBe('none')
    click(th.querySelector('button'))
    expect(onSortChange).toHaveBeenLastCalledWith({ key: 'age', order: 'asc' })
    expect(th.getAttribute('aria-sort')).toBe('ascending')
    expect(names(host)).toEqual(['Kiara', 'Nala', 'Simba'])
    click(th.querySelector('button'))
    expect(th.getAttribute('aria-sort')).toBe('descending')
    expect(names(host)).toEqual(['Simba', 'Nala', 'Kiara'])
    click(th.querySelector('button'))
    expect(onSortChange).toHaveBeenLastCalledWith(null)
    expect(names(host)).toEqual(['Nala', 'Simba', 'Kiara'])
  })

  it('selects rows, shows indeterminate, and select-all toggles visible rows', () => {
    const onSelectedChange = vi.fn()
    const host = render(<Table columns={columns} rows={rows} selectable onSelectedChange={onSelectedChange} hoverPaw={false} />)
    const boxes = () => host.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')
    click(boxes()[2])
    expect(onSelectedChange).toHaveBeenLastCalledWith([2])
    expect(boxes()[0].indeterminate).toBe(true)
    expect(host.querySelectorAll('.ml-table__row--selected')).toHaveLength(1)
    click(boxes()[0])
    expect(onSelectedChange).toHaveBeenLastCalledWith([1, 2, 3])
    expect(boxes()[0].checked).toBe(true)
    expect(boxes()[0].indeterminate).toBe(false)
    click(boxes()[0])
    expect(onSelectedChange).toHaveBeenLastCalledWith([])
  })

  it('expands a detail row without firing row clicks', () => {
    const onRowClick = vi.fn()
    const onExpandedChange = vi.fn()
    const host = render(
      <Table columns={columns} rows={rows} onRowClick={onRowClick} onExpandedChange={onExpandedChange} rowExpandable={(r) => r.id !== 3} renderExpand={({ row }) => <em>Detail {row.name}</em>} />,
    )
    expect(host.querySelectorAll('.ml-table__expander')).toHaveLength(2)
    const btn = host.querySelector('.ml-table__expander')!
    click(btn)
    expect(btn.getAttribute('aria-expanded')).toBe('true')
    expect(onExpandedChange).toHaveBeenCalledWith([1])
    expect(host.querySelector('.ml-table__detail')?.textContent).toBe('Detail Nala')
    expect(onRowClick).not.toHaveBeenCalled()
    click(host.querySelectorAll('tbody td')[1])
    expect(onRowClick).toHaveBeenCalledWith(rows[0])
    click(btn)
    expect(host.querySelector('.ml-table__detail')).toBeNull()
  })

  it('pages rows and renders custom cells', () => {
    const onPageChange = vi.fn()
    const host = render(
      <Table columns={columns} rows={rows} pageSize={2} onPageChange={onPageChange} hoverPaw={false} renderCell={({ column, value }) => (column.key === 'age' ? <b>{String(value)}y</b> : undefined)} />,
    )
    expect(names(host)).toEqual(['Nala', 'Simba'])
    expect(host.querySelector('tbody b')?.textContent).toBe('3y')
    click(host.querySelector('.ml-pagination [aria-label*="2"]') ?? host.querySelectorAll('.ml-pagination__btn')[2])
    expect(onPageChange).toHaveBeenCalledWith(2)
    expect(names(host)).toEqual(['Kiara'])
  })

  it('opens tree rows', () => {
    const host = render(<Table columns={columns} rows={[{ id: 1, name: 'Pride', age: 9, children: [{ id: 11, name: 'Cub', age: 1 }] }]} hoverPaw={false} />)
    expect(host.querySelector('table')?.getAttribute('role')).toBe('treegrid')
    expect(host.querySelectorAll('tbody tr')).toHaveLength(1)
    click(host.querySelector('.ml-table__tree-toggle'))
    expect(host.querySelectorAll('tbody tr')).toHaveLength(2)
    expect(host.querySelectorAll('tbody tr')[1].getAttribute('aria-level')).toBe('2')
  })
})

const key = (el: Element | null, k: string, init: KeyboardEventInit = {}) =>
  act(() => void el!.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...init })))
const type = (el: Element | null, text: string) =>
  act(() => {
    const input = el as HTMLInputElement
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, text)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
const pick = (el: Element | null, value: string) =>
  act(() => {
    const select = el as HTMLSelectElement
    Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')!.set!.call(select, value)
    select.dispatchEvent(new Event('change', { bubbles: true }))
  })
const cellAt = (host: HTMLElement, r: number, c: number) => host.querySelectorAll('tbody tr')[r].querySelectorAll('td')[c]

describe('Table — inline editing', () => {
  const editCols = [
    { key: 'name', title: '名字', editable: true, validate: (v: unknown) => (String(v).trim() ? undefined : '不能空白') },
    { key: 'age', title: '年齡', editable: 'number' as const },
    { key: 'role', title: '角色', editable: 'select' as const, options: [{ value: 'king', label: '國王' }, { value: 'cub', label: '幼獅' }] },
  ]
  const editRows = [
    { id: 1, name: 'Simba', age: 5, role: 'king' },
    { id: 2, name: 'Kiara', age: 1, role: 'cub' },
  ]

  it('opens on double-click, commits on Enter, shows pending until new rows arrive', () => {
    const onCellEdit = vi.fn()
    const onRowClick = vi.fn()
    const host = render(<Table columns={editCols} rows={editRows} onCellEdit={onCellEdit} onRowClick={onRowClick} hoverPaw={false} />)
    const cell = cellAt(host, 0, 0)
    expect(cell.getAttribute('tabindex')).toBe('0')
    act(() => void cell.dispatchEvent(new MouseEvent('dblclick', { bubbles: true })))
    const input = host.querySelector<HTMLInputElement>('.ml-table__editor input')!
    expect(input.getAttribute('aria-label')).toBe('編輯 名字')
    expect(document.activeElement).toBe(input)
    click(input)
    expect(onRowClick).not.toHaveBeenCalled()
    type(input, 'Mufasa')
    key(input, 'Enter')
    expect(onCellEdit).toHaveBeenCalledWith({ row: editRows[0], key: 'name', value: 'Mufasa', oldValue: 'Simba', rowIndex: 0 })
    expect(host.querySelector('.ml-table__editor')).toBeNull()
    expect(cell.classList).toContain('ml-table__cell--pending')
    expect(cell.getAttribute('aria-busy')).toBe('true')
    expect(cell.textContent).toContain('Mufasa')
    expect(document.activeElement).toBe(cell)
    act(() => root!.render(<Table columns={editCols} rows={[{ ...editRows[0], name: 'Mufasa' }, editRows[1]]} onCellEdit={onCellEdit} hoverPaw={false} />))
    expect(host.querySelector('.ml-table__cell--pending')).toBeNull()
    expect(cellAt(host, 0, 0).textContent).toBe('Mufasa')
  })

  it('blocks invalid values with aria-invalid and a message; Esc restores focus to the cell', () => {
    const onCellEdit = vi.fn()
    const host = render(<Table columns={editCols} rows={editRows} onCellEdit={onCellEdit} hoverPaw={false} />)
    const cell = cellAt(host, 1, 0)
    key(cell, 'F2')
    const input = host.querySelector<HTMLInputElement>('.ml-table__editor input')!
    type(input, ' ')
    key(input, 'Enter')
    expect(onCellEdit).not.toHaveBeenCalled()
    expect(input.getAttribute('aria-invalid')).toBe('true')
    const error = host.querySelector('.ml-table__edit-error')!
    expect(error.textContent).toBe('不能空白')
    expect(input.getAttribute('aria-describedby')).toBe(error.id)
    expect(host.querySelector('.ml-table__editor')?.classList).toContain('ml-input--error')
    key(input, 'Escape')
    expect(host.querySelector('.ml-table__editor')).toBeNull()
    expect(cell.textContent).toBe('Kiara')
    expect(document.activeElement).toBe(cell)
  })

  it('Tab commits and moves on; number and select editors convert values', () => {
    const onCellEdit = vi.fn()
    const host = render(<Table columns={editCols} rows={editRows} onCellEdit={onCellEdit} hoverPaw={false} />)
    key(cellAt(host, 0, 1), 'Enter')
    const input = host.querySelector<HTMLInputElement>('.ml-table__editor input')!
    type(input, 'x')
    key(input, 'Tab')
    expect(host.querySelector('.ml-table__edit-error')?.textContent).toBe('請輸入數字')
    type(input, '7')
    key(input, 'Tab')
    expect(onCellEdit).toHaveBeenLastCalledWith(expect.objectContaining({ key: 'age', value: 7, oldValue: 5 }))
    const select = host.querySelector<HTMLSelectElement>('.ml-table__editor select')!
    expect(document.activeElement).toBe(select)
    pick(select, 'cub')
    act(() => select.blur())
    expect(onCellEdit).toHaveBeenLastCalledWith(expect.objectContaining({ key: 'role', value: 'cub', oldValue: 'king' }))
    expect(cellAt(host, 0, 2).textContent).toContain('幼獅')
    expect(cellAt(host, 1, 2).textContent).toBe('幼獅')
  })
})

describe('Table — column resizing', () => {
  const resizeCols = [
    { key: 'name', title: 'Name', sortable: true, resizable: true, minWidth: 80, maxWidth: 300 },
    { key: 'age', title: 'Age', width: '120px' },
  ]

  it('resizes with arrow keys, uncontrolled or controlled', () => {
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(150)
    const onColumnWidthsChange = vi.fn()
    const onColumnResize = vi.fn()
    const host = render(<Table columns={resizeCols} rows={rows} onColumnWidthsChange={onColumnWidthsChange} onColumnResize={onColumnResize} />)
    const handle = host.querySelector('[role="separator"]')!
    expect(handle.getAttribute('aria-valuenow')).toBe('150')
    expect(handle.getAttribute('aria-label')).toBe('調整「Name」欄寬')
    key(handle, 'ArrowRight')
    expect(onColumnWidthsChange).toHaveBeenLastCalledWith({ name: 160 })
    expect(onColumnResize).toHaveBeenLastCalledWith('name', 160)
    key(handle, 'ArrowLeft', { shiftKey: true })
    expect(onColumnWidthsChange).toHaveBeenLastCalledWith({ name: 110 })
    expect(host.querySelector('th')!.style.width).toBe('110px')
    expect(handle.getAttribute('aria-valuenow')).toBe('110')
    vi.restoreAllMocks()
  })

  it('drags the handle and the release click does not sort', async () => {
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(150)
    const onSortChange = vi.fn()
    const onColumnWidthsChange = vi.fn()
    const host = render(<Table columns={resizeCols} rows={rows} columnWidths={{ name: 200 }} onColumnWidthsChange={onColumnWidthsChange} onSortChange={onSortChange} />)
    expect(host.querySelector('th')!.style.width).toBe('200px')
    const handle = host.querySelector('[role="separator"]')!
    act(() => void handle.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, button: 0, clientX: 100 })))
    expect(host.querySelector('.ml-table')?.classList).toContain('ml-table--resizing')
    act(() => void window.dispatchEvent(new MouseEvent('pointermove', { clientX: 60 })))
    expect(onColumnWidthsChange).toHaveBeenLastCalledWith({ name: 160 })
    act(() => void window.dispatchEvent(new MouseEvent('pointerup', { clientX: 60 })))
    click(host.querySelector('.ml-table__sort'))
    expect(onSortChange).not.toHaveBeenCalled()
    expect(host.querySelector('.ml-table')?.classList).not.toContain('ml-table--resizing')
    // Controlled: stays at the prop until the parent agrees.
    expect(host.querySelector('th')!.style.width).toBe('200px')
    await new Promise((r) => setTimeout(r))
    click(host.querySelector('.ml-table__sort'))
    expect(onSortChange).toHaveBeenCalledWith({ key: 'name', order: 'asc' })
    vi.restoreAllMocks()
  })
})
