import { afterEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { ConfigProvider, en } from '../../src/react'
import { Form, FormItem, type FormHandle } from '../../src/react/validation'
import { TimeRangePicker } from '../../src/react/time-range'
import { timeRangeRules, type MlTimeRange } from '../../src/components/time-range'

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
const focus = (el: Element) => act(() => (el as HTMLElement).focus())
const trigger = (host: Element) => host.querySelector('.ml-timerange__trigger') as HTMLButtonElement
function open(host: Element) {
  click(trigger(host))
  return [...host.querySelectorAll('[role="group"]')]
}
const options = (list: Element) => [...list.querySelectorAll('[role="option"]')]

afterEach(() => {
  act(() => root?.unmount())
  root = undefined
  document.body.innerHTML = ''
  vi.useRealTimers()
})

describe('React TimeRangePicker', () => {
  it('shows the range, the duration and （隔日）', () => {
    const host = render(<TimeRangePicker defaultValue={['09:00', '10:30']} />)
    expect(trigger(host).textContent).toBe('09:0010:30')
    expect(host.querySelector('.ml-timerange__duration')!.textContent).toBe('共 1 小時 30 分')
    const night = render(<TimeRangePicker defaultValue={['22:00', '06:00']} allowOvernight />)
    expect(trigger(night).textContent).toContain('06:00（隔日）')
    expect(night.querySelector('.ml-timerange__duration')!.textContent).toBe('共 8 小時')
  })

  it('focuses the start hours; the end wheels stay after the start', () => {
    const onChange = vi.fn()
    const host = render(<TimeRangePicker defaultValue={['09:30', null]} minuteStep={15} onChange={onChange} />)
    const groups = open(host)
    expect(groups.map((g) => g.getAttribute('aria-label'))).toEqual(['開始時間', '結束時間'])
    const [startHours] = groups[0].querySelectorAll('[role="listbox"]')
    const [endHours, endMinutes] = groups[1].querySelectorAll('[role="listbox"]')
    expect(document.activeElement).toBe(startHours)
    expect(options(endHours)[8].getAttribute('aria-disabled')).toBe('true')
    click(options(endHours)[9])
    expect(onChange).toHaveBeenLastCalledWith(['09:30', '09:45'])
    key(endMinutes, 'End')
    expect(onChange).toHaveBeenLastCalledWith(['09:30', '09:45'])
    click(options(endHours)[17])
    expect(onChange).toHaveBeenLastCalledWith(['09:30', '17:45'])
    expect(host.querySelector('.ml-timerange__status')!.textContent).toBe('共 8 小時 15 分')
    // Moving the start past the end drops the end.
    click(options(startHours)[18])
    expect(onChange).toHaveBeenLastCalledWith(['18:30', null])
    key(endHours, 'Enter')
    expect(trigger(host).getAttribute('aria-expanded')).toBe('false')
  })

  it('wraps past midnight with allowOvernight', () => {
    const onChange = vi.fn()
    const host = render(<TimeRangePicker defaultValue={['22:00', null]} allowOvernight onChange={onChange} />)
    const groups = open(host)
    const [endHours] = groups[1].querySelectorAll('[role="listbox"]')
    expect(endHours.querySelectorAll('[aria-disabled="true"]')).toHaveLength(0)
    click(options(endHours)[6])
    expect(onChange).toHaveBeenLastCalledWith(['22:00', '06:00'])
    expect(groups[1].getAttribute('aria-label')).toBe('結束時間（隔日）')
  })

  it('現在 fills the focused end; Escape closes and returns focus', () => {
    vi.useFakeTimers({ now: new Date(2026, 9, 5, 14, 37), toFake: ['Date'] })
    const onChange = vi.fn()
    const host = render(<TimeRangePicker defaultValue={['09:00', null]} minuteStep={15} onChange={onChange} />)
    const groups = open(host)
    focus(groups[1].querySelector('[role="listbox"]')!)
    const [now, confirm] = host.querySelectorAll('.ml-timepicker__footer button')
    expect([now.textContent, confirm.textContent]).toEqual(['現在', '確定'])
    click(now)
    expect(onChange).toHaveBeenLastCalledWith(['09:00', '14:30'])
    key(host.querySelector('[role="dialog"]')!, 'Escape')
    expect(trigger(host).getAttribute('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(trigger(host))
  })

  it('applies presets and clears', () => {
    const onChange = vi.fn()
    const presets = [{ label: '上午', value: ['09:00', '12:00'] as MlTimeRange }]
    const host = render(<TimeRangePicker presets={presets} clearable onChange={onChange} />)
    open(host)
    click(host.querySelector('.ml-daterange__preset'))
    expect(onChange).toHaveBeenLastCalledWith(['09:00', '12:00'])
    expect(trigger(host).getAttribute('aria-expanded')).toBe('false')
    click(host.querySelector('.ml-datepicker__clear'))
    expect(onChange).toHaveBeenLastCalledWith([null, null])
  })

  it('follows the en locale', () => {
    const host = render(
      <ConfigProvider locale={en}>
        <TimeRangePicker defaultValue={['09:00:00', '09:00:30']} seconds />
      </ConfigProvider>,
    )
    expect(host.querySelector('.ml-timerange__duration')!.textContent).toBe('30 s')
    const groups = open(host)
    expect(groups.map((g) => g.getAttribute('aria-label'))).toEqual(['Start time', 'End time'])
    expect(groups[0].querySelectorAll('[role="listbox"]')).toHaveLength(3)
  })

  it('shows FormItem errors from timeRangeRules', async () => {
    const form = { current: null as FormHandle | null }
    const host = render(
      <Form ref={(f) => void (form.current = f)} model={{ hours: ['18:00', '09:00'] }} rules={{ hours: timeRangeRules({ required: true }) }}>
        <FormItem prop="hours">
          <TimeRangePicker value={['18:00', '09:00']} label="營業時間" />
        </FormItem>
      </Form>,
    )
    let ok = true
    await act(async () => {
      ok = await form.current!.validate()
    })
    expect(ok).toBe(false)
    expect(trigger(host).getAttribute('aria-invalid')).toBe('true')
    expect(host.textContent).toContain('結束時間需晚於開始時間')
  })
})

describe('React entry', () => {
  it('keeps the shared picker shell out of the public API', async () => {
    const entry = await import('../../src/react')
    for (const name of ['cleanId', 'usePopup', 'PickerFrame', 'TimeColumns', 'TimeFooter']) expect(entry).not.toHaveProperty(name)
    expect(entry).toHaveProperty('TimePicker')
    expect(entry).toHaveProperty('TimeRangePicker')
  })
})
