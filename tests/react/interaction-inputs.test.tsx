import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, createRef, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { Mention, NumberInput, PinInput, Rate, Slider, TagInput, type PinInputHandle } from '../../src/react/inputs'

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
const setValue = (el: Element | null, text: string, event = 'input') =>
  act(() => {
    const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
    Object.getOwnPropertyDescriptor(proto, 'value')!.set!.call(el, text)
    el!.dispatchEvent(new Event(event, { bubbles: true }))
  })
const paste = (el: Element | null, text: string) =>
  act(() => {
    const event = new Event('paste', { bubbles: true, cancelable: true })
    Object.assign(event, { clipboardData: { getData: () => text } })
    el!.dispatchEvent(event)
  })
const $ = (s: string) => document.querySelector(s)
const $$ = (s: string) => [...document.querySelectorAll(s)]

afterEach(() => {
  act(() => root?.unmount())
  root = undefined
  document.body.innerHTML = ''
})

describe('NumberInput', () => {
  it('steps with the buttons, rounds to the step precision and clamps', () => {
    const onChange = vi.fn()
    render(<NumberInput defaultValue={0.1} step={0.1} max={0.3} onChange={onChange} />)
    const [minus, plus] = $$('.ml-number__btn') as HTMLButtonElement[]
    click(plus)
    expect(onChange).toHaveBeenLastCalledWith(0.2)
    click(plus)
    expect(onChange).toHaveBeenLastCalledWith(0.3)
    expect(($('input') as HTMLInputElement).value).toBe('0.3')
    expect(plus.disabled).toBe(true)
    expect(minus.disabled).toBe(false)
  })

  it('commits typed text on change, clamped to min/max', () => {
    const onChange = vi.fn()
    render(<NumberInput min={1} max={10} defaultValue={5} onChange={onChange} />)
    const input = $('input') as HTMLInputElement
    setValue(input, '42', 'change')
    expect(onChange).toHaveBeenLastCalledWith(10)
    expect(input.value).toBe('10')
    setValue(input, '', 'change')
    expect(onChange).toHaveBeenLastCalledWith(1)
  })
})

describe('PinInput', () => {
  it('auto-advances, ignores non-digits and fires onComplete', () => {
    const onComplete = vi.fn()
    render(<PinInput length={4} onComplete={onComplete} />)
    const boxes = $$('.ml-pin__box') as HTMLInputElement[]
    act(() => boxes[0].focus())
    setValue(boxes[0], 'x')
    expect(boxes[0].value).toBe('')
    setValue(boxes[0], '1')
    expect(document.activeElement).toBe(boxes[1])
    setValue(boxes[1], '2')
    setValue(boxes[2], '3')
    setValue(boxes[3], '4')
    expect(onComplete).toHaveBeenCalledWith('1234')
    expect(boxes.map((b) => b.value).join('')).toBe('1234')
  })

  it('spreads a paste over the boxes; Backspace deletes; reset() clears', () => {
    const onChange = vi.fn()
    const ref = createRef<PinInputHandle>()
    render(<PinInput ref={ref} length={6} type="alphanumeric" onChange={onChange} />)
    const boxes = $$('.ml-pin__box') as HTMLInputElement[]
    paste(boxes[0], 'ab-12')
    expect(onChange).toHaveBeenLastCalledWith('AB12')
    expect(document.activeElement).toBe(boxes[4])
    key(boxes[4], 'Backspace')
    expect(onChange).toHaveBeenLastCalledWith('AB1')
    expect(document.activeElement).toBe(boxes[3])
    // Clicking past the end jumps back to the first empty box.
    act(() => boxes[5].focus())
    expect(document.activeElement).toBe(boxes[3])
    act(() => ref.current!.reset())
    expect(onChange).toHaveBeenLastCalledWith('')
    expect(document.activeElement).toBe(boxes[0])
  })
})

describe('TagInput', () => {
  it('adds on Enter and separators, rejects duplicates, Backspace twice removes', () => {
    const onChange = vi.fn()
    const onReject = vi.fn()
    render(<TagInput onChange={onChange} onReject={onReject} />)
    const input = $('input') as HTMLInputElement
    setValue(input, 'vue')
    key(input, 'Enter')
    expect(onChange).toHaveBeenLastCalledWith(['vue'])
    setValue(input, 'react, svelte,solid')
    expect(onChange).toHaveBeenLastCalledWith(['vue', 'react', 'svelte'])
    expect(input.value).toBe('solid')
    key(input, ',')
    expect($$('.ml-taginput__tag').map((t) => t.textContent)).toEqual(['vue', 'react', 'svelte', 'solid'])
    setValue(input, 'vue')
    key(input, 'Enter')
    expect(onReject).toHaveBeenCalled()
    expect(input.getAttribute('aria-invalid')).toBe('true')
    expect($('.ml-field__error')).not.toBeNull()
    setValue(input, '')
    expect(input.getAttribute('aria-invalid')).toBeNull()
    key(input, 'Backspace')
    expect($('.ml-taginput__tag--armed')?.textContent).toBe('solid')
    key(input, 'Backspace')
    expect(onChange).toHaveBeenLastCalledWith(['vue', 'react', 'svelte'])
    click($$('.ml-combobox__tag-remove')[0])
    expect(onChange).toHaveBeenLastCalledWith(['react', 'svelte'])
  })

  it('hides the entry once max is reached and clears all', () => {
    const Harness = () => {
      const [tags, setTags] = useState(['a'])
      return <TagInput value={tags} onChange={setTags} max={2} clearable />
    }
    render(<Harness />)
    const input = $('input') as HTMLInputElement
    setValue(input, 'b')
    key(input, 'Enter')
    expect(input.style.display).toBe('none')
    expect($('.ml-taginput__count')?.textContent).toBe('2/2')
    click($('.ml-datepicker__clear'))
    expect($$('.ml-taginput__tag')).toHaveLength(0)
    expect(input.style.display).toBe('')
  })
})

describe('Mention', () => {
  const people = [{ value: 'nala', label: 'Nala' }, { value: 'simba', label: 'Simba' }, { value: 'zazu', label: 'Zazu', disabled: true }]

  it('opens on the trigger, filters, and inserts the pick', () => {
    const onSelect = vi.fn()
    const onSearch = vi.fn()
    const Harness = () => {
      const [text, setText] = useState('')
      return <Mention options={people} value={text} onChange={setText} onSelect={onSelect} onSearch={onSearch} />
    }
    render(<Harness />)
    const area = $('textarea') as HTMLTextAreaElement
    setValue(area, 'hi @')
    expect(area.getAttribute('aria-expanded')).toBe('true')
    expect($$('[role="option"]')).toHaveLength(2)
    setValue(area, 'hi @si')
    expect(onSearch).toHaveBeenLastCalledWith('si', '@')
    expect($$('[role="option"] .ml-dropdown__label').map((o) => o.textContent)).toEqual(['Simba'])
    key(area, 'Enter')
    expect(area.value).toBe('hi @Simba ')
    expect(onSelect).toHaveBeenCalledWith(people[1], '@')
    expect(area.getAttribute('aria-expanded')).toBe('false')
    expect(area.selectionStart).toBe(10)
  })

  it('needs the trigger to start a word; Escape closes', () => {
    render(<Mention options={people} />)
    const area = $('textarea') as HTMLTextAreaElement
    setValue(area, 'mail@n')
    expect(area.getAttribute('aria-expanded')).toBe('false')
    setValue(area, '@')
    key(area, 'ArrowDown')
    expect(area.getAttribute('aria-activedescendant')).toMatch(/-list-1$/)
    key(area, 'Escape')
    expect(area.getAttribute('aria-expanded')).toBe('false')
  })
})

describe('Slider', () => {
  it('reports numbers and shows the value with its unit', () => {
    const onChange = vi.fn()
    render(<Slider defaultValue={20} min={0} max={50} unit="%" onChange={onChange} />)
    const input = $('input') as HTMLInputElement
    expect(input.min).toBe('0')
    expect(input.max).toBe('50')
    setValue(input, '35')
    expect(onChange).toHaveBeenCalledWith(35)
    expect($('output')?.textContent).toBe('35%')
    expect(($('.ml-slider') as HTMLElement).style.getPropertyValue('--_pct')).toBe('70%')
  })
})

describe('Rate', () => {
  it('steps by half with the keyboard and clamps to 0…max', () => {
    const onChange = vi.fn()
    render(<Rate allowHalf max={3} onChange={onChange} />)
    const rate = $('[role="slider"]')!
    key(rate, 'ArrowRight')
    expect(onChange).toHaveBeenLastCalledWith(0.5)
    expect($$('.ml-rate__item--half')).toHaveLength(1)
    key(rate, 'End')
    expect(rate.getAttribute('aria-valuenow')).toBe('3')
    key(rate, 'ArrowUp')
    expect(rate.getAttribute('aria-valuenow')).toBe('3')
    key(rate, 'Home')
    key(rate, 'ArrowLeft')
    expect(rate.getAttribute('aria-valuenow')).toBe('0')
  })

  it('clicks set the value, clearable resets; readonly ignores input', () => {
    render(<Rate clearable texts={['a', 'b', 'c', 'd', 'e']} />)
    const items = $$('.ml-rate__item')
    click(items[2])
    expect($('[role="slider"]')!.getAttribute('aria-valuetext')).toBe('3 / 5，c')
    expect($('.ml-rate__text')?.textContent).toBe('c')
    click(items[2])
    expect($('[role="slider"]')!.getAttribute('aria-valuenow')).toBe('0')
    act(() => root!.render(<Rate readOnly value={2} />))
    expect($('[role="img"]')!.getAttribute('tabindex')).toBeNull()
  })
})
