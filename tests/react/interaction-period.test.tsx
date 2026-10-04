import { afterEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { DatePicker, DateRangePicker } from '../../src/react/pickers'
import { PeriodPanel } from '../../src/react/period'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | undefined
function render(el: React.ReactElement) {
  const host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => root!.render(el))
  return host
}
const key = (el: Element, k: string) => act(() => void el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true })))
const click = (el: Element | null) => act(() => void (el as HTMLElement).click())
const cell = (host: Element, k: string) => host.querySelector(`[data-period="${k}"]`) as HTMLButtonElement
const focused = () => (document.activeElement as HTMLElement).dataset.period
function open(host: Element) {
  click(host.querySelector('.ml-datepicker__trigger'))
  return host.querySelector('[role="dialog"]') as HTMLElement
}

afterEach(() => {
  act(() => root?.unmount())
  root = undefined
  document.body.innerHTML = ''
})

describe('React period pickers', () => {
  it('month panel: arrows, Home / End, PageDown and Enter', () => {
    const onChange = vi.fn()
    const host = render(<PeriodPanel type="month" defaultValue={new Date(2026, 4, 20)} onChange={onChange} />)
    const grid = host.querySelector('[role="grid"]')!
    expect(cell(host, '2026-05').getAttribute('tabindex')).toBe('0')
    key(grid, 'ArrowRight')
    expect(focused()).toBe('2026-06')
    key(grid, 'ArrowDown')
    expect(focused()).toBe('2026-09')
    key(grid, 'Home')
    expect(focused()).toBe('2026-07')
    key(grid, 'End')
    expect(focused()).toBe('2026-09')
    key(grid, 'PageDown')
    expect(focused()).toBe('2027-09')
    expect(host.querySelector('.ml-calendar__title')!.textContent).toBe('2027 年')
    expect(host.querySelector('.ml-calendar__body')!.classList).toContain('ml-calendar__body--next')
    key(grid, 'Enter')
    expect(onChange).toHaveBeenLastCalledWith(new Date(2027, 8, 1))
    expect(cell(host, '2027-09').classList).toContain('ml-calendar__period--selected')
  })

  it('quarter and year panels page by year / decade', () => {
    const onChange = vi.fn()
    const host = render(<PeriodPanel type="quarter" defaultValue={new Date(2026, 7, 3)} onChange={onChange} />)
    const grid = host.querySelector('[role="grid"]')!
    key(grid, 'End')
    expect(focused()).toBe('2026-Q4')
    key(grid, 'ArrowRight')
    expect(focused()).toBe('2027-Q1')
    key(grid, 'PageUp')
    expect(focused()).toBe('2026-Q1')
    key(grid, ' ')
    expect(onChange).toHaveBeenLastCalledWith(new Date(2026, 0, 1))
    act(() => root!.unmount())

    const years = render(<PeriodPanel type="year" defaultValue={new Date(2026, 2, 3)} onChange={onChange} />)
    expect(years.querySelector('.ml-calendar__title')!.textContent).toBe('2020 – 2029 年')
    const yGrid = years.querySelector('[role="grid"]')!
    key(yGrid, 'Home')
    expect(focused()).toBe('2025')
    key(yGrid, 'PageDown')
    expect(focused()).toBe('2035')
    click(years.querySelectorAll('.ml-calendar__nav')[0])
    expect(years.querySelector('.ml-calendar__title')!.textContent).toBe('2020 – 2029 年')
    click(cell(years, '2030'))
    expect(onChange).toHaveBeenLastCalledWith(new Date(2030, 0, 1))
    expect(years.querySelector('.ml-calendar__title')!.textContent).toBe('2030 – 2039 年')
  })

  it('respects min / max', () => {
    const onChange = vi.fn()
    const host = render(<PeriodPanel type="month" defaultValue={new Date(2026, 5, 1)} min={new Date(2026, 2, 15)} max={new Date(2026, 9, 1)} onChange={onChange} />)
    const disabled = [...host.querySelectorAll<HTMLButtonElement>('button[data-period]')].filter((b) => b.disabled).map((b) => b.dataset.period)
    expect(disabled).toEqual(['2026-01', '2026-02', '2026-11', '2026-12'])
    click(cell(host, '2026-01'))
    expect(onChange).not.toHaveBeenCalled()
    const grid = host.querySelector('[role="grid"]')!
    key(grid, 'ArrowUp') // 2026-03
    key(grid, 'ArrowLeft') // 2026-02 is before min: stay
    expect(focused()).toBe('2026-03')
  })

  it('DatePicker type="quarter" opens, focuses and picks', () => {
    const onChange = vi.fn()
    const host = render(<DatePicker type="quarter" defaultValue={new Date(2026, 10, 9)} onChange={onChange} />)
    const trigger = host.querySelector('.ml-datepicker__trigger')!
    expect(trigger.textContent).toBe('2026 年第 4 季')
    const panel = open(host)
    expect(panel.getAttribute('aria-label')).toBe('選擇季度')
    expect(focused()).toBe('2026-Q4')
    key(panel.querySelector('[role="grid"]')!, 'ArrowLeft')
    key(panel.querySelector('[role="grid"]')!, 'Enter')
    expect(onChange).toHaveBeenLastCalledWith(new Date(2026, 6, 1))
    expect(trigger.textContent).toBe('2026 年第 3 季')
    expect(document.activeElement).toBe(trigger)
  })

  it('DateRangePicker type="month" previews on hover and commits', () => {
    const onChange = vi.fn()
    const host = render(<DateRangePicker type="month" defaultValue={[new Date(2026, 0, 1), new Date(2026, 1, 1)]} onChange={onChange} />)
    expect(host.querySelector('.ml-daterange__days')!.textContent).toBe('2 個月')
    const panel = open(host)
    expect(panel.querySelector('.ml-daterange__presets')).toBeNull()
    click(cell(host, '2026-08'))
    expect(onChange).not.toHaveBeenCalled()
    expect(host.querySelector('.ml-daterange__status')!.textContent).toBe('2026 年 8 月 → 再選結束')
    act(() => void cell(host, '2026-04').dispatchEvent(new MouseEvent('mouseover', { bubbles: true })))
    const band = [...host.querySelectorAll('.ml-calendar__cell--range button')].map((b) => (b as HTMLElement).dataset.period)
    expect(band).toEqual(['2026-05', '2026-06', '2026-07'])
    click(cell(host, '2026-04'))
    expect(onChange).toHaveBeenCalledWith([new Date(2026, 3, 1), new Date(2026, 7, 1)])
    expect(host.querySelector('.ml-daterange__days')!.textContent).toBe('5 個月')
  })
})
