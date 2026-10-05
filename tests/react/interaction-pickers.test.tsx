import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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

  describe('Upload picture wall', () => {
    const img = (name: string) => new File(['x'], name, { type: 'image/png' })
    const names = (fn: ReturnType<typeof vi.fn>) => (fn.mock.lastCall![0] as File[]).map((f) => f.name)
    const pointer = (el: Element, type: string, init: MouseEventInit = {}) =>
      act(() => void el.dispatchEvent(new MouseEvent(type, { bubbles: true, button: 0, ...init })))
    let made = 0
    const created: string[] = []
    const revoked: string[] = []
    beforeEach(() => {
      created.length = revoked.length = 0
      vi.spyOn(URL, 'createObjectURL').mockImplementation(() => {
        const url = `blob:test/${made++}`
        created.push(url)
        return url
      })
      vi.spyOn(URL, 'revokeObjectURL').mockImplementation((url) => void revoked.push(url))
    })
    afterEach(() => {
      vi.restoreAllMocks()
      delete (document as { elementsFromPoint?: unknown }).elementsFromPoint
    })

    it('shows thumbnails, previews from the clicked image and revokes URLs', () => {
      const onChange = vi.fn()
      const host = render(<Upload listType="picture" defaultValue={[img('a.png'), new File(['x'], 'spec.pdf', { type: 'application/pdf' }), img('b.png')]} onChange={onChange} />)
      const cards = host.querySelectorAll('[role="listitem"]')
      expect(host.querySelector('ul')!.getAttribute('role')).toBe('list')
      expect(cards[0].querySelector('img')!.getAttribute('src')).toBe(created[0])
      expect(cards[1].querySelector('img')).toBeNull()
      expect(cards[1].querySelector('.ml-upload__doc-name')!.textContent).toBe('spec.pdf')
      expect(host.querySelector('[aria-label="預覽 spec.pdf"]')).toBeNull()

      click(host.querySelector('[aria-label="預覽 b.png"]'))
      const preview = document.body.querySelector('.ml-preview')!
      expect(preview.querySelector('img')!.getAttribute('src')).toBe(created[1])
      expect(preview.querySelector('img')!.getAttribute('alt')).toBe('b.png')

      click(host.querySelector('[aria-label="移除 a.png"]'))
      expect(names(onChange)).toEqual(['spec.pdf', 'b.png'])
      expect(revoked).toEqual([created[0]])
      act(() => root!.unmount())
      root = undefined
      expect(revoked).toEqual(created)
    })

    it('rejects past maxCount and drops the add tile when full', () => {
      const onChange = vi.fn()
      const onReject = vi.fn()
      const host = render(<Upload listType="picture" maxCount={2} onChange={onChange} onReject={onReject} />)
      const drop = (files: File[]) =>
        act(() => void host.querySelector('.ml-upload__add')!.dispatchEvent(Object.assign(new Event('drop', { bubbles: true }), { dataTransfer: { files } })))
      drop([img('a.png'), img('b.png'), img('c.png')])
      expect(names(onChange)).toEqual(['a.png', 'b.png'])
      expect(onReject.mock.calls.map(([f, reason]) => [f.name, reason])).toEqual([['c.png', 'count']])
      expect(host.querySelector('.ml-upload__add')).toBeNull()
      expect((host.querySelector('input[type="file"]') as HTMLInputElement).disabled).toBe(true)
    })

    it('shows progress and error overlays', () => {
      const busy = Object.assign(img('busy.png'), { status: 'uploading' as const, percent: 120 })
      const bad = Object.assign(img('bad.png'), { status: 'error' as const, error: '太大了' })
      const host = render(<Upload listType="picture" value={[busy, bad]} />)
      const bar = host.querySelector('[role="progressbar"]')!
      expect(bar.getAttribute('aria-valuenow')).toBe('100')
      expect(host.querySelector('.ml-upload__percent')!.textContent).toBe('100%')
      expect(host.querySelector('.ml-upload__card--error .ml-upload__error')!.textContent).toBe('太大了')
    })

    it('reorders with Alt+Arrow keys, keeping focus and announcing', () => {
      const onChange = vi.fn()
      const host = render(<Upload listType="picture" defaultValue={[img('a.png'), img('b.png'), img('c.png')]} onChange={onChange} />)
      const card = host.querySelectorAll<HTMLElement>('[role="listitem"]')[2]
      card.focus()
      key(card, 'ArrowLeft')
      expect(onChange).not.toHaveBeenCalled()
      key(card, 'ArrowLeft', { altKey: true })
      expect(names(onChange)).toEqual(['a.png', 'c.png', 'b.png'])
      expect(host.querySelector('[aria-live="polite"]')!.textContent).toBe('已移到第 2 張')
      expect(document.activeElement?.getAttribute('aria-label')).toBe('c.png')
      expect(document.activeElement).toBe(host.querySelectorAll('[role="listitem"]')[1])
    })

    it('reorders by dragging a card onto another', () => {
      const onChange = vi.fn()
      const host = render(<Upload listType="picture" defaultValue={[img('a.png'), img('b.png'), img('c.png')]} onChange={onChange} />)
      const cards = host.querySelectorAll('[role="listitem"]')
      document.elementsFromPoint = () => [cards[2], cards[1]]
      pointer(cards[2], 'pointerdown', { clientX: 300, clientY: 10 })
      pointer(cards[2], 'pointermove', { clientX: 2, clientY: 10 })
      document.elementsFromPoint = () => [cards[2], cards[0]]
      pointer(cards[2], 'pointermove', { clientX: 1, clientY: 10 })
      expect(cards[2].classList).toContain('ml-upload__card--dragging')
      expect(cards[0].classList).toContain('ml-upload__card--over')
      pointer(cards[2], 'pointerup')
      expect(names(onChange)).toEqual(['c.png', 'a.png', 'b.png'])
      expect(host.querySelector('.ml-upload__card--dragging')).toBeNull()
    })
  })
})
