import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { AmountInput, InputMask, NumberKeyboard } from '../../src/react'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | undefined
function render(el: React.ReactElement) {
  const host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => root!.render(el))
  return host
}
const click = (el: Element | null | undefined) => act(() => void (el as HTMLElement).click())
function type(el: HTMLInputElement, value: string, inputType = 'insertText') {
  act(() => {
    el.focus()
    el.value = value
    el.setSelectionRange(value.length, value.length)
    el.dispatchEvent(new InputEvent('input', { inputType, bubbles: true }))
  })
}

afterEach(() => {
  act(() => root?.unmount())
  root = undefined
  document.body.innerHTML = ''
  vi.useRealTimers()
})

describe('React keypad', () => {
  it('InputMask formats, reports raw value and completion', () => {
    const onChange = vi.fn()
    const onComplete = vi.fn()
    const host = render(<InputMask preset="mobile" onChange={onChange} onComplete={onComplete} />)
    const input = host.querySelector('input')!
    type(input, '09123')
    expect(input.value).toBe('0912-3')
    expect(input.selectionStart).toBe(6)
    expect(onChange).toHaveBeenLastCalledWith('09123')
    type(input, '0912-345678')
    expect(input.value).toBe('0912-345-678')
    expect(onComplete).toHaveBeenCalledWith('0912345678', '0912-345-678')
  })

  it('InputMask leaves an IME alone until compositionend', () => {
    const onChange = vi.fn()
    const host = render(<InputMask mask="AAA" onChange={onChange} />)
    const input = host.querySelector('input')!
    act(() => {
      input.value = 'ㄅ'
      input.dispatchEvent(new InputEvent('input', { isComposing: true, bubbles: true }))
    })
    expect(onChange).not.toHaveBeenCalled()
    act(() => {
      input.value = 'abc'
      input.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }))
    })
    expect(onChange).toHaveBeenLastCalledWith('ABC')
    expect(input.value).toBe('ABC')
  })

  it('InputMask follows a controlled value', () => {
    let setOuter: (v: string) => void = () => {}
    function Host() {
      const [v, setV] = useState('')
      setOuter = setV
      return <InputMask preset="zip" value={v} onChange={setV} />
    }
    const host = render(<Host />)
    act(() => setOuter('100603'))
    expect(host.querySelector('input')!.value).toBe('100-603')
  })

  it('AmountInput groups, clamps on blur and spells 中文大寫', () => {
    const onChange = vi.fn()
    function Host() {
      const [v, setV] = useState<number | null>(null)
      return (
        <AmountInput
          value={v}
          max={10000}
          capital
          onChange={(n) => {
            onChange(n)
            setV(n)
          }}
        />
      )
    }
    const host = render(<Host />)
    const input = host.querySelector('input')!
    type(input, '1234567')
    expect(input.value).toBe('1,234,567')
    expect(onChange).toHaveBeenLastCalledWith(1234567)
    act(() => {
      input.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
      input.dispatchEvent(new FocusEvent('blur'))
    })
    expect(onChange).toHaveBeenLastCalledWith(10000)
    expect(input.value).toBe('10,000')
    expect(host.querySelector('.ml-amount__words')!.textContent).toBe('壹萬元整')
  })

  it('NumberKeyboard types, deletes and long-presses ⌫', async () => {
    vi.useFakeTimers()
    const onChange = vi.fn()
    function Host() {
      const [v, setV] = useState('')
      return (
        <>
          <output>{v}</output>
          <NumberKeyboard
            value={v}
            maxlength={6}
            onChange={(s) => {
              onChange(s)
              setV(s)
            }}
          />
        </>
      )
    }
    const host = render(<Host />)
    const key = (t: string) => [...host.querySelectorAll('button')].find((b) => b.textContent === t)
    for (const d of ['1', '2', '3', '4', '5', '6', '7']) click(key(d))
    expect(host.querySelector('output')!.textContent).toBe('123456')
    const del = host.querySelector('.ml-numkey__key--delete')!
    click(del)
    expect(host.querySelector('output')!.textContent).toBe('12345')
    act(() => void del.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })))
    await act(async () => void vi.advanceTimersByTime(450 + 70 * 3))
    act(() => void del.dispatchEvent(new PointerEvent('pointerup', { bubbles: true })))
    click(del)
    expect(host.querySelector('output')!.textContent).toBe('12')
  })

  it('NumberKeyboard fixed: opens, closes on Done, outside tap and Esc', () => {
    const onShowChange = vi.fn()
    let open: (v: boolean) => void = () => {}
    function Host() {
      const [show, setShow] = useState(false)
      open = setShow
      return (
        <NumberKeyboard
          fixed
          show={show}
          onShowChange={(v) => {
            onShowChange(v)
            setShow(v)
          }}
        />
      )
    }
    const host = render(<Host />)
    const kb = host.querySelector('.ml-numkey')!
    expect(kb.getAttribute('aria-hidden')).toBe('true')
    expect(kb.hasAttribute('inert')).toBe(true)
    act(() => open(true))
    expect(kb.classList.contains('ml-numkey--open')).toBe(true)
    click(host.querySelector('.ml-numkey__done'))
    expect(onShowChange).toHaveBeenLastCalledWith(false)

    act(() => open(true))
    act(() => void document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })))
    expect(kb.classList.contains('ml-numkey--open')).toBe(false)

    act(() => open(true))
    act(() => void document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })))
    expect(kb.classList.contains('ml-numkey--open')).toBe(false)

    act(() => open(true))
    click(host.querySelector('.ml-numkey__key--collapse'))
    expect(kb.classList.contains('ml-numkey--open')).toBe(false)
  })

  it('NumberKeyboard random shuffles after mount', () => {
    const host = render(<NumberKeyboard random />)
    const digits = [...host.querySelectorAll('.ml-numkey__key--digit')].map((b) => b.textContent)
    expect([...digits].sort()).toEqual(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'])
  })
})
