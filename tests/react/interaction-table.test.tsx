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
