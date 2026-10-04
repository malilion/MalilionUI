import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { Scheduler, type MlSchedulerEvent, type SchedulerRange } from '../../src/react'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | undefined
function render(el: React.ReactElement) {
  const host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => root!.render(el))
  return host
}
afterEach(() => {
  act(() => root?.unmount())
  root = undefined
  document.body.innerHTML = ''
})

const now = new Date(2026, 9, 7, 10, 30)
const at = (day: number, h: number, m = 0) => new Date(2026, 9, day, h, m)
const initial: MlSchedulerEvent[] = [
  { id: 'a', title: '晨會', start: at(7, 9), end: at(7, 9, 30) },
  { id: 'b', title: '審查', start: at(7, 9), end: at(7, 11) },
]

function Host({ onChange, onCreate, onEventClick }: { onChange?: (e: MlSchedulerEvent, r: SchedulerRange) => void; onCreate?: (r: SchedulerRange) => void; onEventClick?: (e: MlSchedulerEvent) => void }) {
  const [events, setEvents] = useState(initial)
  return (
    <Scheduler
      events={events}
      now={now}
      defaultDate={now}
      editable
      step={30}
      onEventClick={onEventClick}
      onCreate={onCreate}
      onChange={(e, r) => {
        onChange?.(e, r)
        setEvents((list) => list.map((x) => (x.id === e.id ? { ...x, ...r } : x)))
      }}
    />
  )
}

describe('React Scheduler', () => {
  it('pages with the toolbar and switches views', () => {
    const host = render(<Scheduler now={now} defaultDate={now} />)
    const title = () => host.querySelector('.ml-scheduler__title')!.textContent
    expect(title()).toBe('2026年10月4日 – 10日')
    act(() => host.querySelector<HTMLElement>('[aria-label="下一頁"]')!.click())
    expect(title()).toBe('2026年10月11日 – 17日')
    act(() => host.querySelector<HTMLElement>('.ml-scheduler__today')!.click())
    act(() => host.querySelectorAll<HTMLElement>('.ml-scheduler__view')[1].click())
    expect(host.querySelectorAll('.ml-scheduler__day')).toHaveLength(1)
    expect(title()).toBe('2026年10月7日星期三')
  })

  it('drags an event to a new time; the drag is not a click', () => {
    const onChange = vi.fn()
    const onEventClick = vi.fn()
    const host = render(<Host onChange={onChange} onEventClick={onEventClick} />)
    const b = host.querySelector<HTMLElement>('[data-id="b"]')!
    act(() => void b.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, button: 0, clientX: 0, clientY: 100, bubbles: true })))
    act(() => void window.dispatchEvent(new PointerEvent('pointermove', { pointerId: 1, clientX: 0, clientY: 148 })))
    expect(host.querySelector('.ml-scheduler__event--draft')).not.toBeNull()
    act(() => void window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, clientX: 0, clientY: 148 })))
    act(() => host.querySelector<HTMLElement>('[data-id="b"]')!.click())
    expect(onChange.mock.calls[0][1].start).toEqual(at(7, 10))
    expect(onEventClick).not.toHaveBeenCalled()
    act(() => host.querySelector<HTMLElement>('[data-id="b"]')!.click())
    expect(onEventClick).toHaveBeenCalledTimes(1)
  })

  it('keyboard moves keep focus on the event, even across days', () => {
    const onChange = vi.fn()
    const host = render(<Host onChange={onChange} />)
    const a = host.querySelector<HTMLElement>('[data-id="a"]')!
    act(() => a.focus())
    act(() => void a.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })))
    expect(onChange.mock.calls[0][1].start).toEqual(at(8, 9))
    expect((document.activeElement as HTMLElement).dataset.id).toBe('a')
    expect(host.querySelector('[aria-live="polite"].ml-visually-hidden')!.textContent).toContain('晨會 改到')
  })

  it('drags on an empty slot to create', () => {
    const onCreate = vi.fn()
    const host = render(<Host onCreate={onCreate} />)
    const col = host.querySelectorAll<HTMLElement>('.ml-scheduler__col')[1]
    act(() => void col.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 4, button: 0, clientY: 13 * 48, bubbles: true })))
    act(() => void window.dispatchEvent(new PointerEvent('pointermove', { pointerId: 4, clientY: 14 * 48 + 24 })))
    expect(host.querySelector('.ml-scheduler__ghost')!.textContent).toBe('13:00–14:30')
    act(() => void window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 4, clientY: 14 * 48 + 24 })))
    expect(onCreate).toHaveBeenCalledWith({ start: at(5, 13), end: at(5, 14, 30) })
  })
})
