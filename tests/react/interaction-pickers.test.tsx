import { afterEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { Calendar, ColorPicker, DatePicker, DateRangePicker, DateTimePicker, TimePicker, Upload } from '../../src/react/pickers'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | undefined
function render(el: React.ReactElement) {
  const host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => root!.render(el))
  return host
}
const key = (el: Element, k: string, init: KeyboardEventInit = {}) =>
  act(() => void el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, ...init })))
const click = (el: Element | null) => act(() => void (el as HTMLElement).click())
const day = (host: Element, k: string) => host.querySelector(`[data-day="${k}"]`)!
const typeInto = (input: HTMLInputElement, value: string) =>
  act(() => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
/** Open a picker and let the dropdown transition mount its panel. */
function open(host: Element) {
  click(host.querySelector('.ml-datepicker__trigger'))
  return host.querySelector('[role="dialog"]') as HTMLElement
}

afterEach(() => {
  act(() => root?.unmount())
  root = undefined
  document.body.innerHTML = ''
})

describe('React pickers', () => {
  it('Calendar moves by keyboard across months and selects with Enter', () => {
    const onChange = vi.fn()
    const onMonth = vi.fn()
    const host = render(<Calendar defaultValue={new Date(2026, 1, 27)} onChange={onChange} onMonthChange={onMonth} />)
    const grid = host.querySelector('[role="grid"]')!
    expect(day(host, '2026-02-27').getAttribute('tabindex')).toBe('0')
    key(grid, 'ArrowDown')
    expect(onMonth).toHaveBeenCalledWith(2026, 2)
    expect(document.activeElement).toBe(day(host, '2026-03-06'))
    key(grid, 'PageUp')
    expect(document.activeElement).toBe(day(host, '2026-02-06'))
    key(grid, 'Enter')
    expect(onChange).toHaveBeenLastCalledWith(new Date(2026, 1, 6))
    expect(day(host, '2026-02-06').classList).toContain('ml-calendar__day--selected')
    click(host.querySelectorAll('.ml-calendar__nav')[1])
    expect(host.querySelector('.ml-calendar__body')!.classList).toContain('ml-calendar__body--next')
  })

  it('Calendar respects min / max', () => {
    const onChange = vi.fn()
    const host = render(<Calendar defaultValue={new Date(2026, 1, 10)} min={new Date(2026, 1, 8)} onChange={onChange} />)
    expect((day(host, '2026-02-07') as HTMLButtonElement).disabled).toBe(true)
    click(day(host, '2026-02-09'))
    expect(onChange).toHaveBeenCalledWith(new Date(2026, 1, 9))
  })

  it('DatePicker opens, focuses the grid, picks by click and closes with Escape', () => {
    const onChange = vi.fn()
    const host = render(<DatePicker defaultValue={new Date(2026, 1, 12)} onChange={onChange} locale="en" />)
    const trigger = host.querySelector('.ml-datepicker__trigger')!
    let panel = open(host)
    expect(trigger.getAttribute('aria-expanded')).toBe('true')
    expect(document.activeElement).toBe(day(host, '2026-02-12'))
    key(panel, 'Escape')
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(trigger)
    panel = open(host)
    key(panel.querySelector('[role="grid"]')!, 'ArrowRight')
    key(panel.querySelector('[role="grid"]')!, 'Enter')
    expect(onChange).toHaveBeenLastCalledWith(new Date(2026, 1, 13))
    expect(trigger.textContent).toContain('02/13/2026')
    open(host)
    click(day(host, '2026-02-20'))
    expect(onChange).toHaveBeenLastCalledWith(new Date(2026, 1, 20))
  })

  it('DateRangePicker commits once both ends are picked', () => {
    const onChange = vi.fn()
    const host = render(<DateRangePicker defaultValue={[new Date(2026, 1, 1), new Date(2026, 1, 3)]} onChange={onChange} presets={[]} locale="en" />)
    const panel = open(host)
    expect(panel.querySelector('.ml-daterange__presets')).toBeNull()
    click(day(host, '2026-02-10'))
    expect(onChange).not.toHaveBeenCalled()
    expect(host.querySelector('.ml-daterange__status')!.textContent).toContain('02/10/2026')
    act(() => void day(host, '2026-02-14').dispatchEvent(new MouseEvent('mouseover', { bubbles: true })))
    expect(day(host, '2026-02-12').parentElement!.classList).toContain('ml-calendar__cell--range')
    click(day(host, '2026-02-05'))
    expect(onChange).toHaveBeenCalledWith([new Date(2026, 1, 5), new Date(2026, 1, 10)])
    expect(host.querySelector('.ml-daterange__days')!.textContent).toContain('6')
  })

  it('DateRangePicker presets commit straight away', () => {
    const onChange = vi.fn()
    const host = render(<DateRangePicker presets={[{ label: 'Feb', value: [new Date(2026, 1, 1), new Date(2026, 1, 28)] }]} onChange={onChange} />)
    open(host)
    click(host.querySelector('.ml-daterange__preset'))
    expect(onChange).toHaveBeenCalledWith([new Date(2026, 1, 1), new Date(2026, 1, 28)])
  })

  it('TimePicker picks by click and keyboard, honouring min', () => {
    const onChange = vi.fn()
    const host = render(<TimePicker defaultValue="09:30" min="08:15" minuteStep={15} onChange={onChange} />)
    open(host)
    const [hours, minutes] = host.querySelectorAll('[role="listbox"]')
    expect(document.activeElement).toBe(hours)
    expect(hours.querySelectorAll('[role="option"]')[7].getAttribute('aria-disabled')).toBe('true')
    click(hours.querySelectorAll('[role="option"]')[8])
    expect(onChange).toHaveBeenLastCalledWith('08:30')
    key(minutes, 'ArrowUp')
    expect(onChange).toHaveBeenLastCalledWith('08:15')
    key(minutes, 'ArrowUp') // 08:00 is out of range
    expect(onChange).toHaveBeenCalledTimes(2)
    key(minutes, 'End')
    expect(onChange).toHaveBeenLastCalledWith('08:45')
    key(minutes, 'Enter')
    expect(host.querySelector('.ml-datepicker__trigger')!.getAttribute('aria-expanded')).toBe('false')
  })

  it('DateTimePicker combines the day and the time', () => {
    const onChange = vi.fn()
    const host = render(<DateTimePicker defaultValue={new Date(2026, 1, 12, 9, 30)} onChange={onChange} />)
    open(host)
    click(day(host, '2026-02-14'))
    expect(onChange).toHaveBeenLastCalledWith(new Date(2026, 1, 14, 9, 30))
    const [hours] = host.querySelectorAll('[role="listbox"]')
    click(hours.querySelectorAll('[role="option"]')[18])
    expect(onChange).toHaveBeenLastCalledWith(new Date(2026, 1, 14, 18, 30))
  })

  it('ColorPicker accepts a typed hex, presets and the keyboard', () => {
    const onChange = vi.fn()
    const host = render(<ColorPicker defaultValue="#f0ad2f" clearable onChange={onChange} />)
    open(host)
    const hex = host.querySelector('.ml-colorpicker__hex input') as HTMLInputElement
    expect(hex.value).toBe('#f0ad2f')
    typeInto(hex, '3EEED0')
    key(hex, 'Enter')
    expect(onChange).toHaveBeenLastCalledWith('#3eeed0')
    expect(host.querySelector('.ml-colorpicker__trigger')!.textContent).toBe('#3eeed0')
    typeInto(hex, 'nope')
    key(hex, 'Enter')
    expect(hex.value).toBe('#3eeed0')
    click(host.querySelector('[aria-label="#ff5c48"]'))
    expect(onChange).toHaveBeenLastCalledWith('#ff5c48')
    expect(host.querySelector('[aria-label="#ff5c48"]')!.getAttribute('aria-pressed')).toBe('true')
    key(host.querySelector('[role="slider"]')!, 'ArrowDown', { shiftKey: true })
    expect(onChange).toHaveBeenCalledTimes(3)
    typeInto(hex, '')
    key(hex, 'Enter')
    expect(onChange).toHaveBeenLastCalledWith(null)
  })

  it('Upload adds files, rejects bad ones and removes rows', () => {
    const onChange = vi.fn()
    const onReject = vi.fn()
    const host = render(<Upload accept="image/*,.pdf" maxSize={1000} onChange={onChange} onReject={onReject} />)
    const input = host.querySelector('input[type="file"]') as HTMLInputElement
    const ok = new File(['x'], 'cat.png', { type: 'image/png' })
    const big = new File([new Uint8Array(2000)], 'big.pdf', { type: 'application/pdf' })
    const txt = new File(['x'], 'note.txt', { type: 'text/plain' })
    Object.defineProperty(input, 'files', { configurable: true, value: [ok, big, txt] })
    act(() => void input.dispatchEvent(new Event('change', { bubbles: true })))
    expect(onChange).toHaveBeenLastCalledWith([ok])
    expect(onReject).toHaveBeenCalledWith(big, 'size')
    expect(onReject).toHaveBeenCalledWith(txt, 'type')
    expect(host.querySelectorAll('.ml-upload__file')).toHaveLength(1)
    expect(host.querySelector('.ml-upload__size')!.textContent).toBe('1 B')

    const zone = host.querySelector('.ml-upload__zone')!
    act(() => void zone.dispatchEvent(new Event('dragenter', { bubbles: true })))
    expect(host.querySelector('.ml-upload')!.classList).toContain('ml-upload--dragging')
    const dropped = new File(['yy'], 'dog.png', { type: 'image/png' })
    const drop = Object.assign(new Event('drop', { bubbles: true }), { dataTransfer: { files: [dropped] } })
    act(() => void zone.dispatchEvent(drop))
    expect(host.querySelector('.ml-upload')!.classList).not.toContain('ml-upload--dragging')
    expect(onChange).toHaveBeenLastCalledWith([ok, dropped])
    click(host.querySelector('.ml-upload__remove'))
    expect(onChange).toHaveBeenLastCalledWith([dropped])
  })
})
