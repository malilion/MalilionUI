import { afterEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { Autocomplete, Cascader, Combobox, Select, TreeSelect } from '../../src/react/select'

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

afterEach(() => {
  act(() => root?.unmount())
  root = undefined
  document.body.innerHTML = ''
  vi.useRealTimers()
})

const opts = [{ value: 'a', label: 'Alpha' }, { value: 'b', label: 'Beta', disabled: true }, { value: 'c', label: 'Gamma' }]

describe('Select', () => {
  it('maps the chosen option back to its typed value', () => {
    const onChange = vi.fn()
    render(<Select options={[{ value: 1, label: 'One' }, { value: 2, label: 'Two' }]} placeholder="Pick" onChange={onChange} />)
    const select = $('select') as HTMLSelectElement
    expect(select.value).toBe('')
    act(() => {
      select.value = '2'
      select.dispatchEvent(new Event('change', { bubbles: true }))
    })
    expect(onChange).toHaveBeenCalledWith(2)
    expect(select.value).toBe('2')
  })
})

describe('Combobox', () => {
  it('opens with the keyboard, skips disabled options and selects with Enter', () => {
    const onChange = vi.fn()
    render(<Combobox options={opts} onChange={onChange} />)
    const control = $('[role="combobox"]')!
    key(control, 'ArrowDown')
    expect(control.getAttribute('aria-expanded')).toBe('true')
    expect(control.getAttribute('aria-activedescendant')).toMatch(/-opt-0$/)
    key(control, 'ArrowDown')
    expect(control.getAttribute('aria-activedescendant')).toMatch(/-opt-2$/)
    key(control, 'Home')
    key(control, 'End')
    key(control, 'Enter')
    expect(onChange).toHaveBeenCalledWith('c')
    expect(control.getAttribute('aria-expanded')).toBe('false')
    expect($('.ml-combobox__single')?.textContent).toBe('Gamma')
  })

  it('type-ahead jumps to a matching label; Escape closes', () => {
    render(<Combobox options={opts} />)
    const control = $('[role="combobox"]')!
    key(control, 'g')
    expect(control.getAttribute('aria-expanded')).toBe('true')
    expect($('.ml-combobox__option--active')?.textContent).toBe('Gamma')
    key(control, 'Escape')
    expect(control.getAttribute('aria-expanded')).toBe('false')
  })

  it('multiple toggles tags, removes and clears', () => {
    const onChange = vi.fn()
    render(<Combobox options={opts} multiple clearable onChange={onChange} />)
    click($('.ml-combobox__box'))
    const items = $$('[role="option"]')
    click(items[0])
    click(items[2])
    expect(onChange).toHaveBeenLastCalledWith(['a', 'c'])
    expect($$('.ml-combobox__tag').map((t) => t.textContent)).toEqual(['Alpha', 'Gamma'])
    expect($('[role="listbox"]')?.getAttribute('aria-multiselectable')).toBe('true')
    click(items[0])
    expect(onChange).toHaveBeenLastCalledWith(['c'])
    click($('.ml-combobox__tag-remove'))
    expect(onChange).toHaveBeenLastCalledWith([])
    click(items[2])
    click($('.ml-combobox__clear'))
    expect(onChange).toHaveBeenLastCalledWith([])
    expect($('.ml-combobox__tag')).toBeNull()
  })

  it('searchable filters, highlights the match and shows no-match text', () => {
    const onChange = vi.fn()
    render(<Combobox options={opts} searchable onChange={onChange} noMatchText="Nope" />)
    const input = $('input[role="combobox"]')!
    type(input, 'amm')
    expect($$('[role="option"]').map((o) => o.textContent)).toEqual(['Gamma'])
    expect($('mark.ml-combobox__hit')?.textContent).toBe('amm')
    key(input, 'Enter')
    expect(onChange).toHaveBeenCalledWith('c')
    expect((input as HTMLInputElement).value).toBe('Gamma')
    type(input, 'zzz')
    expect($('.ml-combobox__empty')?.textContent).toBe('Nope')
  })

  it('closes on an outside pointerdown', () => {
    render(<Combobox options={opts} />)
    click($('.ml-combobox__box'))
    expect($('.ml-combobox--open')).not.toBeNull()
    act(() => void document.body.dispatchEvent(new Event('pointerdown', { bubbles: true })))
    expect($('.ml-combobox--open')).toBeNull()
  })
})

describe('Autocomplete', () => {
  it('suggests, moves with arrows and picks with Enter', () => {
    const onChange = vi.fn()
    const onSelect = vi.fn()
    render(<Autocomplete suggestions={['Lion', 'Lynx', { value: 'cat', label: 'Cat', hint: 'meow' }]} onChange={onChange} onSelect={onSelect} clearable />)
    const input = $('input')!
    act(() => (input as HTMLInputElement).focus())
    type(input, 'l')
    expect(input.getAttribute('aria-expanded')).toBe('true')
    expect($$('[role="option"]').map((o) => o.textContent)).toEqual(['Lion', 'Lynx'])
    key(input, 'ArrowDown')
    key(input, 'ArrowDown')
    key(input, 'Enter')
    expect(onSelect).toHaveBeenCalledWith({ value: 'Lynx', label: 'Lynx' })
    expect(onChange).toHaveBeenLastCalledWith('Lynx')
    expect(input.getAttribute('aria-expanded')).toBe('false')
    click($('.ml-autocomplete__clear'))
    expect(onChange).toHaveBeenLastCalledWith('')
  })

  it('Escape closes the list', () => {
    render(<Autocomplete suggestions={['Lion']} />)
    const input = $('input')!
    type(input, 'i')
    expect(input.getAttribute('aria-expanded')).toBe('true')
    key(input, 'Escape')
    expect(input.getAttribute('aria-expanded')).toBe('false')
  })

  it('debounces fetchSuggestions and shows the empty row', async () => {
    vi.useFakeTimers()
    const fetch = vi.fn(async (q: string) => (q === 'li' ? ['Lion'] : []))
    render(<Autocomplete fetchSuggestions={fetch} debounce={100} />)
    const input = $('input')!
    type(input, 'l')
    type(input, 'li')
    expect($('.ml-autocomplete__spinner')).not.toBeNull()
    await act(async () => void (await vi.advanceTimersByTimeAsync(150)))
    expect(fetch).toHaveBeenCalledTimes(1)
    expect($$('[role="option"]').map((o) => o.textContent)).toEqual(['Lion'])
    type(input, 'lix')
    await act(async () => void (await vi.advanceTimersByTimeAsync(150)))
    expect($('.ml-combobox__empty')?.textContent).toBe('沒有建議')
  })
})

const cascade = [
  { value: 'tw', label: 'Taiwan', children: [{ value: 'tpe', label: 'Taipei' }, { value: 'khh', label: 'Kaohsiung' }] },
  { value: 'jp', label: 'Japan', disabled: true },
  { value: 'kr', label: 'Korea' },
]

describe('Cascader', () => {
  it('browses columns with the keyboard and commits a leaf', () => {
    const onChange = vi.fn()
    render(<Cascader options={cascade} onChange={onChange} />)
    const trigger = $('[role="combobox"]')!
    key(trigger, 'ArrowDown')
    expect(trigger.getAttribute('aria-expanded')).toBe('true')
    expect(document.activeElement?.textContent).toBe('Taiwan')
    key(document.activeElement, 'ArrowRight')
    expect($$('.ml-cascader__col')).toHaveLength(2)
    expect(document.activeElement?.textContent).toBe('Taipei')
    key(document.activeElement, 'ArrowDown')
    expect(document.activeElement?.textContent).toBe('Kaohsiung')
    key(document.activeElement, 'Enter')
    expect(onChange).toHaveBeenCalledWith(['tw', 'khh'], [cascade[0], cascade[0].children![1]])
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    expect($('.ml-cascader__path')?.textContent).toBe('Taiwan/Kaohsiung')
    expect(document.activeElement).toBe(trigger)
  })

  it('searches every path, Escape closes, clear empties', () => {
    const onChange = vi.fn()
    render(<Cascader options={cascade} searchable clearable defaultValue={['kr']} onChange={onChange} />)
    click($('.ml-combobox__box'))
    type($('.ml-cascader__search input'), 'kao')
    const hits = $$('.ml-cascader__hit')
    expect(hits.map((h) => h.textContent)).toEqual(['Taiwan/Kaohsiung'])
    click(hits[0])
    expect(onChange).toHaveBeenLastCalledWith(['tw', 'khh'], expect.any(Array))
    click($('.ml-combobox__box'))
    key($('.ml-cascader__search input'), 'Escape')
    expect($('.ml-combobox--open')).toBeNull()
    click($('.ml-combobox__clear'))
    expect(onChange).toHaveBeenLastCalledWith([], [])
    expect($('.ml-combobox__placeholder')).not.toBeNull()
  })
})

const tree = [
  { key: 'f', label: 'Fruit', children: [{ key: 'f1', label: 'Apple' }, { key: 'f2', label: 'Pear' }] },
  { key: 'v', label: 'Veg' },
]

describe('TreeSelect', () => {
  it('single: expands, moves with arrows and picks with Enter', () => {
    const onChange = vi.fn()
    render(<TreeSelect data={tree} onChange={onChange} />)
    const trigger = $('[role="combobox"]')!
    key(trigger, 'Enter')
    expect(trigger.getAttribute('aria-expanded')).toBe('true')
    expect(document.activeElement?.getAttribute('role')).toBe('treeitem')
    key(document.activeElement, 'ArrowRight')
    expect($$('[role="treeitem"]')).toHaveLength(4)
    key(document.activeElement, 'ArrowDown')
    key(document.activeElement, 'ArrowDown')
    expect(document.activeElement?.textContent).toBe('Pear')
    key(document.activeElement, 'Enter')
    expect(onChange).toHaveBeenCalledWith('f2')
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    expect($('.ml-combobox__single')?.textContent).toBe('Pear')
    // Reopening reveals the chosen node's ancestors and marks it selected.
    click($('.ml-combobox__box'))
    expect($('[aria-selected="true"]')?.textContent).toBe('Pear')
    key(document.activeElement, 'Escape')
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
  })

  it('multiple: checking a parent shows one tag; removing and clearing', () => {
    const onChange = vi.fn()
    render(<TreeSelect data={tree} multiple clearable defaultExpanded={['f']} onChange={onChange} />)
    click($('.ml-combobox__box'))
    const fruit = $$('[role="treeitem"]')[0]
    click(fruit.querySelector('.ml-tree__check')) // the row itself would also collapse it
    expect(onChange).toHaveBeenLastCalledWith(expect.arrayContaining(['f', 'f1', 'f2']))
    expect($$('.ml-combobox__tag').map((t) => t.textContent)).toEqual(['Fruit'])
    expect(fruit.getAttribute('aria-checked')).toBe('true')
    click($$('[role="treeitem"]')[1])
    expect($$('[role="treeitem"]')[0].getAttribute('aria-checked')).toBe('mixed')
    expect($$('.ml-combobox__tag').map((t) => t.textContent)).toEqual(['Pear'])
    click($('.ml-combobox__tag-remove'))
    expect(onChange).toHaveBeenLastCalledWith([])
    key($$('[role="treeitem"]')[3], ' ')
    expect(onChange).toHaveBeenLastCalledWith(['v'])
    click($('.ml-combobox__clear'))
    expect(onChange).toHaveBeenLastCalledWith([])
  })

  it('search filters the tree', () => {
    render(<TreeSelect data={tree} searchable />)
    click($('.ml-combobox__box'))
    expect(document.activeElement).toBe($('.ml-treeselect__search input'))
    type($('.ml-treeselect__search input'), 'app')
    expect($$('[role="treeitem"]').map((r) => r.textContent)).toEqual(['Fruit', 'Apple'])
    type($('.ml-treeselect__search input'), 'zzz')
    expect($('.ml-tree__empty')).not.toBeNull()
  })
})
