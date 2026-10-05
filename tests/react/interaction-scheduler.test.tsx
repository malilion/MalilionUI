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
    act(() => host.querySelectorAll<HTMLElement>('.ml-scheduler__view')[2].click())
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

  describe('month view', () => {
    const crowded: MlSchedulerEvent[] = [
      ...initial,
      { id: 'c', title: '午餐', start: at(7, 12), end: at(7, 13) },
      { id: 'd', title: '週會', start: at(7, 15), end: at(7, 16) },
      { id: 'expo', title: '電腦展', start: '2026-10-09', end: '2026-10-13', allDay: true },
    ]
    const box = { left: 0, top: 0, width: 700, height: 600, right: 700, bottom: 600, x: 0, y: 0, toJSON: () => ({}) } as DOMRect
    const cell = (host: HTMLElement, label: string) => [...host.querySelectorAll<HTMLElement>('.ml-scheduler__mday')].find((c) => c.getAttribute('aria-label')!.startsWith(label))!
    const key = (el: Element, k: string, shiftKey = false) => act(() => void el.dispatchEvent(new KeyboardEvent('keydown', { key: k, shiftKey, bubbles: true })))

    function MonthHost({ onChange, onCreate, onEventClick }: { onChange?: (e: MlSchedulerEvent, r: SchedulerRange) => void; onCreate?: (r: SchedulerRange) => void; onEventClick?: (e: MlSchedulerEvent) => void }) {
      const [events, setEvents] = useState(crowded)
      return (
        <Scheduler
          events={events}
          now={now}
          defaultDate={now}
          defaultView="month"
          editable
          onEventClick={onEventClick}
          onCreate={onCreate}
          onChange={(e, r) => {
            onChange?.(e, r)
            setEvents((list) => list.map((x) => (x.id === e.id ? { ...x, ...r } : x)))
          }}
        />
      )
    }

    it('pages by month; a day number opens day view', () => {
      const onViewChange = vi.fn()
      const onDateChange = vi.fn()
      const host = render(<Scheduler now={now} defaultDate={now} defaultView="month" onViewChange={onViewChange} onDateChange={onDateChange} />)
      const title = () => host.querySelector('.ml-scheduler__title')!.textContent
      expect(title()).toBe('2026年10月')
      act(() => host.querySelector<HTMLElement>('[aria-label="下一頁"]')!.click())
      expect(title()).toBe('2026年11月')
      act(() => host.querySelector<HTMLElement>('[aria-label="上一頁"]')!.click())
      act(() => cell(host, '10月9日').querySelector<HTMLElement>('.ml-scheduler__mdate')!.click())
      expect(onDateChange).toHaveBeenLastCalledWith(new Date(2026, 9, 9))
      expect(onViewChange).toHaveBeenLastCalledWith('day')
      expect(title()).toBe('2026年10月9日星期五')
    })

    it('roving focus over days; PageUp changes month; Enter opens the day', () => {
      const host = render(<Scheduler now={now} defaultDate={now} defaultView="month" />)
      expect(host.querySelectorAll('[tabindex="0"]')).toHaveLength(1)
      const focused = () => (document.activeElement as HTMLElement).getAttribute('aria-label')
      key(cell(host, '10月7日'), 'ArrowDown')
      expect(focused()).toBe('10月14日星期三')
      key(document.activeElement!, 'Home')
      expect(focused()).toBe('10月11日星期日')
      key(document.activeElement!, 'PageUp')
      expect(host.querySelector('.ml-scheduler__title')!.textContent).toBe('2026年9月')
      expect(focused()).toBe('9月11日星期五')
      key(document.activeElement!, 'Enter')
      expect(host.querySelectorAll('.ml-scheduler__day')).toHaveLength(1)
    })

    it('"還有 n 項" popover: lists the day, Escape and outside clicks close it and return focus', () => {
      const onEventClick = vi.fn()
      const host = render(<MonthHost onEventClick={onEventClick} />)
      const more = host.querySelector<HTMLElement>('.ml-scheduler__more')!
      expect(more.textContent).toBe('還有 1 項')
      act(() => more.click())
      const pop = host.querySelector<HTMLElement>('[role="dialog"]')!
      expect(pop.getAttribute('aria-label')).toBe('10月7日星期三')
      expect([...pop.querySelectorAll('.ml-scheduler__event')].map((e) => e.textContent)).toEqual(['09:00晨會', '09:00審查', '12:00午餐', '15:00週會'])
      expect((document.activeElement as HTMLElement).dataset.id).toBe('a')
      act(() => pop.querySelector<HTMLElement>('[data-id="d"]')!.click())
      expect(onEventClick.mock.calls[0][0].id).toBe('d')
      key(document.activeElement!, 'Escape')
      expect(host.querySelector('[role="dialog"]')).toBeNull()
      expect(document.activeElement).toBe(more)
      act(() => more.click())
      act(() => void document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })))
      expect(host.querySelector('[role="dialog"]')).toBeNull()
      expect(document.activeElement).toBe(more)
    })

    it('drags an event to another day, keeping its time; keyboard moves by days and weeks', () => {
      const rect = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(box)
      const onChange = vi.fn()
      const onEventClick = vi.fn()
      const host = render(<MonthHost onChange={onChange} onEventClick={onEventClick} />)
      const a = host.querySelector<HTMLElement>('[data-id="a"]')!
      act(() => void a.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, button: 0, clientX: 350, clientY: 150, bubbles: true })))
      act(() => void window.dispatchEvent(new PointerEvent('pointermove', { pointerId: 1, clientX: 450, clientY: 150 })))
      expect(host.querySelector('.ml-scheduler__event--draft')).not.toBeNull()
      act(() => void window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, clientX: 450, clientY: 150 })))
      act(() => host.querySelector<HTMLElement>('[data-id="a"]')!.click())
      expect(onChange.mock.calls[0][1]).toEqual({ start: at(8, 9), end: at(8, 9, 30) })
      expect(onEventClick).not.toHaveBeenCalled()
      const moved = host.querySelector<HTMLElement>('[data-id="a"]')!
      act(() => moved.focus())
      key(moved, 'ArrowUp')
      expect(onChange.mock.calls[1][1]).toEqual({ start: at(1, 9), end: at(1, 9, 30) })
      expect((document.activeElement as HTMLElement).dataset.id).toBe('a')
      expect(host.querySelector('[aria-live="polite"].ml-visually-hidden')!.textContent).toContain('晨會 改到')
      rect.mockRestore()
    })

    it('click or drag across empty days to create an all-day event', () => {
      const rect = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(box)
      const onCreate = vi.fn()
      const host = render(<MonthHost onCreate={onCreate} />)
      const day = cell(host, '10月21日')
      act(() => void day.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 5, button: 0, clientX: 350, clientY: 350, bubbles: true })))
      act(() => void window.dispatchEvent(new PointerEvent('pointermove', { pointerId: 5, clientX: 150, clientY: 350 })))
      expect(host.querySelectorAll('.ml-scheduler__mday--ghost')).toHaveLength(3)
      act(() => void window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 5, clientX: 150, clientY: 350 })))
      expect(onCreate).toHaveBeenCalledWith({ start: new Date(2026, 9, 19), end: new Date(2026, 9, 21), allDay: true })
      rect.mockRestore()
    })
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
