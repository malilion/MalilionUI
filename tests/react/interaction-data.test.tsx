import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, createRef } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { Transfer, Tree, VirtualList, type TreeHandle, type VirtualListHandle } from '../../src/react/data'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | undefined
function render(el: React.ReactElement) {
  const host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => root!.render(el))
  return host
}
const key = (el: Element | null, k: string) => act(() => void el!.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true })))
const click = (el: Element | null) => act(() => void (el as HTMLElement).click())
const type = (el: Element | null, text: string) =>
  act(() => {
    const input = el as HTMLInputElement
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, text)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
const $ = (s: string) => document.querySelector(s)
const $$ = (s: string) => [...document.querySelectorAll(s)]
const labels = () => $$('[role="treeitem"] .ml-tree__label').map((e) => e.textContent)

afterEach(() => {
  act(() => root?.unmount())
  root = undefined
  document.body.innerHTML = ''
  vi.useRealTimers()
})

const tree = [
  { key: 'x', label: 'Fruit', children: [{ key: 'x1', label: 'Apple' }, { key: 'x2', label: 'Pear' }, { key: 'x3', label: 'Plum', disabled: true }] },
  { key: 'y', label: 'Veg', children: [{ key: 'y1', label: 'Leek' }] },
  { key: 'z', label: 'Nuts' },
]

describe('Tree', () => {
  it('navigates with arrows, expands/collapses and jumps with Home/End', () => {
    const onExpandedChange = vi.fn()
    render(<Tree data={tree} onExpandedChange={onExpandedChange} />)
    const first = $('[role="treeitem"]') as HTMLElement
    expect(first.tabIndex).toBe(0)
    act(() => first.focus())
    key(first, 'ArrowRight')
    expect(onExpandedChange).toHaveBeenLastCalledWith(['x'])
    expect(labels()).toEqual(['Fruit', 'Apple', 'Pear', 'Plum', 'Veg', 'Nuts'])
    key(first, 'ArrowRight')
    expect(document.activeElement?.textContent).toBe('Apple')
    key(document.activeElement, 'ArrowDown')
    expect(document.activeElement?.textContent).toBe('Pear')
    key(document.activeElement, 'ArrowLeft')
    expect(document.activeElement?.textContent).toBe('Fruit')
    key(document.activeElement, 'ArrowLeft')
    expect(labels()).toEqual(['Fruit', 'Veg', 'Nuts'])
    key(document.activeElement, 'End')
    expect(document.activeElement?.textContent).toBe('Nuts')
    key(document.activeElement, 'Home')
    expect(document.activeElement?.textContent).toBe('Fruit')
    key(document.activeElement, 'n')
    expect(document.activeElement?.textContent).toBe('Nuts')
  })

  it('selects on click / Enter and expands parents on click', () => {
    const onSelect = vi.fn()
    const onSelectedChange = vi.fn()
    render(<Tree data={tree} onSelect={onSelect} onSelectedChange={onSelectedChange} />)
    click($$('[role="treeitem"]')[0])
    expect(onSelectedChange).toHaveBeenLastCalledWith('x')
    expect(labels()).toContain('Apple')
    const apple = $$('[role="treeitem"]')[1]
    key(apple, 'Enter')
    expect(onSelect).toHaveBeenLastCalledWith(expect.objectContaining({ key: 'x1' }))
    expect(apple.getAttribute('aria-selected')).toBe('true')
    expect(apple.classList.contains('ml-tree__row--selected')).toBe(true)
    click($$('[role="treeitem"]')[3])
    expect(onSelect).toHaveBeenCalledTimes(2)
  })

  it('cascades tri-state checks and skips disabled leaves', () => {
    const onCheckedChange = vi.fn()
    const onCheck = vi.fn()
    render(<Tree data={tree} checkable selectable={false} defaultExpanded={['x']} onCheckedChange={onCheckedChange} onCheck={onCheck} />)
    const rowsNow = () => $$('[role="treeitem"]')
    key(rowsNow()[1], ' ')
    expect(onCheckedChange).toHaveBeenLastCalledWith(['x1'])
    expect(rowsNow()[0].getAttribute('aria-checked')).toBe('mixed')
    click(rowsNow()[2])
    expect(rowsNow()[0].getAttribute('aria-checked')).toBe('true')
    expect(onCheckedChange.mock.lastCall![0].sort()).toEqual(['x', 'x1', 'x2'])
    click(rowsNow()[0].querySelector('.ml-tree__check'))
    expect(onCheckedChange).toHaveBeenLastCalledWith([])
    expect(onCheck).toHaveBeenLastCalledWith(expect.objectContaining({ key: 'x' }), false)
    expect(rowsNow()[3].getAttribute('aria-checked')).toBe('false')
  })

  it('filters with highlighted matches and exposes expandAll / collapseAll', () => {
    const ref = createRef<TreeHandle>()
    const host = render(<Tree ref={ref} data={tree} filter="le" />)
    expect(labels()).toEqual(['Fruit', 'Apple', 'Veg', 'Leek'])
    expect($$('mark.ml-combobox__hit').map((m) => m.textContent)).toEqual(['le', 'Le'])
    act(() => root!.render(<Tree ref={ref} data={tree} />))
    expect(labels()).toEqual(['Fruit', 'Veg', 'Nuts'])
    act(() => ref.current!.expandAll())
    expect(labels()).toHaveLength(7)
    act(() => ref.current!.collapseAll())
    expect(labels()).toHaveLength(3)
    act(() => root!.render(<Tree data={tree} filter="zzz" emptyText="Nope" />))
    expect(host.querySelector('.ml-tree__empty')?.textContent).toBe('Nope')
  })

  it('renders custom node content', () => {
    render(<Tree data={tree} renderNode={(n, level) => <i>{`${n.label}@${level}`}</i>} />)
    expect($('.ml-tree__label i')?.textContent).toBe('Fruit@1')
  })
})

const items = [
  { key: 1, label: 'Lion' },
  { key: 2, label: 'Tiger' },
  { key: 3, label: 'Lynx', disabled: true },
  { key: 4, label: 'Puma' },
]

describe('Transfer', () => {
  const panels = () => $$('.ml-transfer__panel')
  const listed = (i: number) => [...panels()[i].querySelectorAll('.ml-transfer__item')].map((e) => e.textContent)
  const boxes = (i: number) => [...panels()[i].querySelectorAll('.ml-transfer__item input')]

  it('moves checked items right and back', () => {
    const onChange = vi.fn()
    render(<Transfer data={items} onChange={onChange} />)
    const [toRight, toLeft] = $$('.ml-transfer__actions button') as HTMLButtonElement[]
    expect(toRight.disabled).toBe(true)
    click(boxes(0)[3])
    click(boxes(0)[0])
    expect(panels()[0].querySelector('.ml-transfer__count')?.textContent).toBe('2 / 4')
    expect(toRight.disabled).toBe(false)
    click(toRight)
    expect(onChange).toHaveBeenLastCalledWith([4, 1], 'right', [4, 1])
    expect(listed(1)).toEqual(['Puma', 'Lion'])
    expect(listed(0)).toEqual(['Tiger', 'Lynx'])
    click(boxes(1)[0])
    click(toLeft)
    expect(onChange).toHaveBeenLastCalledWith([1], 'left', [4])
    expect(listed(1)).toEqual(['Lion'])
  })

  it('select-all covers visible enabled items and search filters', () => {
    render(<Transfer data={items} filterable />)
    const all = panels()[0].querySelector('.ml-transfer__head input') as HTMLInputElement
    click(all)
    expect(boxes(0).map((b) => (b as HTMLInputElement).checked)).toEqual([true, true, false, true])
    expect(all.checked).toBe(true)
    click(boxes(0)[0])
    expect(all.indeterminate).toBe(true)
    type(panels()[0].querySelector('input[type="search"]'), 'ti')
    expect(listed(0)).toEqual(['Tiger'])
    type(panels()[0].querySelector('input[type="search"]'), 'zz')
    expect(panels()[0].querySelector('.ml-transfer__empty')?.textContent).toBeTruthy()
  })

  it('respects a controlled value', () => {
    const onChange = vi.fn()
    render(<Transfer data={items} value={[2]} onChange={onChange} />)
    click(boxes(0)[0])
    click($$('.ml-transfer__actions button')[0])
    expect(onChange).toHaveBeenCalledWith([2, 1], 'right', [1])
    expect(listed(1)).toEqual(['Tiger'])
  })
})

describe('VirtualList', () => {
  const rows = Array.from({ length: 1000 }, (_, i) => `Row ${i}`)

  it('windows rows, scrolls, reports the end and scrollToIndex', () => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame'] })
    const ref = createRef<VirtualListHandle>()
    const onScroll = vi.fn()
    const onReachEnd = vi.fn()
    const host = render(
      <VirtualList ref={ref} items={rows} itemHeight={20} height={100} overscan={2} onScroll={onScroll} onReachEnd={onReachEnd}>
        {(item, i) => <span data-i={i}>{item}</span>}
      </VirtualList>,
    )
    const vp = host.querySelector('.ml-vlist') as HTMLElement
    const shown = () => [...host.querySelectorAll('.ml-vlist__row')].map((r) => r.textContent)
    expect(shown()).toEqual(['Row 0', 'Row 1', 'Row 2', 'Row 3', 'Row 4', 'Row 5', 'Row 6'])
    Object.defineProperty(vp, 'clientHeight', { configurable: true, value: 100 })
    act(() => {
      vp.scrollTop = 1000
      vp.dispatchEvent(new Event('scroll'))
      vi.advanceTimersToNextFrame()
    })
    expect(onScroll).toHaveBeenLastCalledWith(1000)
    expect(shown()[0]).toBe('Row 48')
    expect(host.querySelector('.ml-vlist__row')?.getAttribute('aria-posinset')).toBe('49')
    act(() => ref.current!.scrollToIndex(999, 'end'))
    expect(vp.scrollTop).toBe(19900)
    expect(shown().at(-1)).toBe('Row 999')
    act(() => {
      vp.dispatchEvent(new Event('scroll'))
      vi.advanceTimersToNextFrame()
    })
    expect(onReachEnd).toHaveBeenCalledTimes(1)
    act(() => {
      vp.dispatchEvent(new Event('scroll'))
      vi.advanceTimersToNextFrame()
    })
    expect(onReachEnd).toHaveBeenCalledTimes(1)
  })

  it('shows the empty slot', () => {
    const host = render(<VirtualList items={[]} itemHeight={20} empty={<p className="none">Nothing</p>} />)
    expect(host.querySelector('.none')?.textContent).toBe('Nothing')
  })
})
