import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { CheckboxGroup, PasswordInput } from '../../src/react/choice'
import { Checkbox } from '../../src/react/form'
import { ConfigProvider } from '../../src/react/locale'
import { en } from '../../src/locale-data'

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
const setValue = (el: Element | null, text: string) =>
  act(() => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(el, text)
    el!.dispatchEvent(new Event('input', { bubbles: true }))
  })
const $ = (s: string) => document.querySelector(s)
const $$ = (s: string) => [...document.querySelectorAll(s)]

afterEach(() => {
  act(() => root?.unmount())
  root = undefined
  document.body.innerHTML = ''
})

const options = [
  { value: 'a', label: 'A' },
  { value: 'b', label: 'B' },
  { value: 'c', label: 'C' },
  { value: 'x', label: 'X', disabled: true },
]

describe('CheckboxGroup', () => {
  it('toggles values (uncontrolled) and reports the array', () => {
    const onChange = vi.fn()
    render(<CheckboxGroup options={options} defaultValue={['b']} onChange={onChange} label="Pick" />)
    const inputs = $$('input') as HTMLInputElement[]
    expect(inputs.map((i) => i.checked)).toEqual([false, true, false, false])
    click(inputs[0])
    expect(onChange).toHaveBeenLastCalledWith(['b', 'a'])
    click(inputs[1])
    expect(onChange).toHaveBeenLastCalledWith(['a'])
    expect(($$('input') as HTMLInputElement[]).map((i) => i.checked)).toEqual([true, false, false, false])
    const group = $('[role="group"]')!
    expect(group.getAttribute('aria-labelledby')).toBe(`${group.id}-label`)
  })

  it('disables the rest at max and locks the last box at min', () => {
    render(<CheckboxGroup options={options} defaultValue={['a']} min={1} max={2} />)
    const boxes = () => $$('input') as HTMLInputElement[]
    expect(boxes()[0].disabled).toBe(true)
    click(boxes()[1])
    expect(boxes().map((b) => b.disabled)).toEqual([false, false, true, true])
    expect($$('.ml-check')[2].classList.contains('ml-check--disabled')).toBe(true)
  })

  it('select-all: indeterminate, fill enabled, clear', () => {
    const onChange = vi.fn()
    render(<CheckboxGroup options={options} defaultValue={['x']} checkAll onChange={onChange} />)
    const all = () => $('.ml-check-group__all input') as HTMLInputElement
    expect($('.ml-check-group__all')!.textContent).toBe('全選')
    expect(all().indeterminate).toBe(false)
    click($$('.ml-check-group__items input')[0])
    expect(all().indeterminate).toBe(true)
    click(all())
    expect(onChange).toHaveBeenLastCalledWith(['x', 'a', 'b', 'c'])
    expect(all().checked).toBe(true)
    expect(all().indeterminate).toBe(false)
    click(all())
    expect(onChange).toHaveBeenLastCalledWith(['x'])
  })

  it('children with a value join the group (controlled) and register for select-all', () => {
    function Demo() {
      const [v, setV] = useState<(string | number)[]>([])
      return (
        <>
          <CheckboxGroup value={v} onChange={setV} checkAll name="n">
            <Checkbox value={1} label="One" />
            <Checkbox value={2} label="Two" />
          </CheckboxGroup>
          <output>{v.join(',')}</output>
        </>
      )
    }
    render(<Demo />)
    const items = $$('.ml-check-group__items input') as HTMLInputElement[]
    expect(items.map((i) => i.name)).toEqual(['n', 'n'])
    click(items[1])
    expect($('output')!.textContent).toBe('2')
    click($('.ml-check-group__all input'))
    expect($('output')!.textContent).toBe('2,1')
  })

  it('a standalone Checkbox is unaffected', () => {
    const onChange = vi.fn()
    render(<Checkbox value="yes" label="Solo" onChange={onChange} />)
    expect(($('input') as HTMLInputElement).value).toBe('yes')
    click($('input'))
    expect(onChange).toHaveBeenCalledWith(true)
  })
})

describe('PasswordInput', () => {
  it('toggles visibility', () => {
    const onVisibleChange = vi.fn()
    render(<PasswordInput defaultValue="secret" onVisibleChange={onVisibleChange} />)
    const input = $('input') as HTMLInputElement
    const btn = $('.ml-password__toggle')!
    expect(input.type).toBe('password')
    expect(input.autocomplete).toBe('current-password')
    expect(btn.getAttribute('aria-pressed')).toBe('false')
    expect(btn.getAttribute('aria-label')).toBe('顯示密碼')
    click(btn)
    expect(input.type).toBe('text')
    expect(btn.getAttribute('aria-pressed')).toBe('true')
    expect(btn.getAttribute('aria-label')).toBe('隱藏密碼')
    expect(onVisibleChange).toHaveBeenCalledWith(true)
  })

  it('meter and rules follow the typed value', () => {
    const onChange = vi.fn()
    render(<PasswordInput strength rules autoComplete="new-password" onChange={onChange} />)
    expect($('.ml-password__score')!.textContent).toBe('—')
    setValue($('input'), 'Nala-Pride-77')
    expect(onChange).toHaveBeenLastCalledWith('Nala-Pride-77')
    expect($('.ml-password__meter')!.classList.contains('ml-password__meter--4')).toBe(true)
    expect($$('.ml-password__bar--on')).toHaveLength(4)
    expect($('.ml-password__score')!.textContent).toBe('很強')
    expect($$('.ml-password__rule--ok')).toHaveLength(5)
    setValue($('input'), 'abc')
    expect($('.ml-password__score')!.textContent).toBe('很弱')
    expect($$('.ml-password__rule--ok').map((r) => r.textContent)).toEqual(['包含小寫英文字母（已符合）'])
    const id = $('input')!.id
    expect($('input')!.getAttribute('aria-describedby')).toBe(`${id}-strength ${id}-rules`)
  })

  it('warns while Caps Lock is on', () => {
    render(<PasswordInput />)
    const input = $('input')!
    const press = (caps: boolean, type = 'keydown') =>
      act(() => {
        const e = new KeyboardEvent(type, { key: 'A', bubbles: true })
        Object.defineProperty(e, 'getModifierState', { value: (k: string) => k === 'CapsLock' && caps })
        input.dispatchEvent(e)
      })
    press(true)
    expect($('.ml-password__caps')!.textContent).toBe('大寫鎖定已開啟')
    press(false, 'keyup')
    expect($('.ml-password__caps')).toBeNull()
    press(true)
    act(() => void input.dispatchEvent(new FocusEvent('focusout', { bubbles: true })))
    expect($('.ml-password__caps')).toBeNull()
  })

  it('follows the locale', () => {
    render(
      <ConfigProvider locale={en}>
        <PasswordInput value="kX9#mQ2$vL" strength />
      </ConfigProvider>,
    )
    expect($('.ml-password__toggle')!.getAttribute('aria-label')).toBe('Show password')
    expect($('.ml-password__score')!.textContent).toBe('Strong')
  })
})
