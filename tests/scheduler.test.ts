// MlScheduler and its layout maths.
import { afterEach, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import { MlScheduler, allDayBars, layoutColumns, moveEvent, resizeEvent, timedSegments, viewDays, type MlSchedulerEvent } from '../src'
import { formatMinutes, minutesAt, schedulerTitle, shiftAnchor, toDate } from '../src/components/scheduler'

let wrapper: VueWrapper | undefined
afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
  document.body.innerHTML = ''
})

// Wednesday 7 Oct 2026; its week (Sunday start) is 4–10 Oct.
const now = new Date(2026, 9, 7, 10, 30)
const at = (day: number, h: number, m = 0) => new Date(2026, 9, day, h, m)

describe('scheduler maths', () => {
  it('reads local dates and times', () => {
    expect(toDate('2026-10-07')).toEqual(new Date(2026, 9, 7))
    expect(toDate('2026-10-07T09:30')).toEqual(new Date(2026, 9, 7, 9, 30))
    expect(toDate('nope')).toBeNull()
  })

  it('visible days follow the view and week start', () => {
    expect(viewDays(now, 'week').map((d) => d.getDate())).toEqual([4, 5, 6, 7, 8, 9, 10])
    expect(viewDays(now, 'week', 1).map((d) => d.getDate())).toEqual([5, 6, 7, 8, 9, 10, 11])
    expect(viewDays(now, 'day').map((d) => d.getDate())).toEqual([7])
    expect(shiftAnchor(now, 'week', -1).getDate()).toBe(30)
    expect(shiftAnchor(now, 'day', 1).getDate()).toBe(8)
  })

  it('cuts timed events at midnight into per-day segments', () => {
    const days = viewDays(now, 'week')
    const segs = timedSegments([{ id: 'n', title: '夜班', start: at(5, 22), end: at(6, 6) }], days)
    expect(segs[1]).toMatchObject([{ start: 1320, end: 1440, before: false, after: true }])
    expect(segs[2]).toMatchObject([{ start: 0, end: 360, before: true, after: false }])
  })

  it('zero-length and backwards events still show a sliver', () => {
    const segs = timedSegments([{ id: 'z', title: 'ping', start: at(7, 9), end: at(7, 9) }], viewDays(now, 'day'))
    expect(segs[0][0]).toMatchObject({ start: 540, end: 555 })
  })

  it('lays overlapping events side by side', () => {
    const days = viewDays(now, 'day')
    const ev = (id: string, s: number, e: number): MlSchedulerEvent => ({ id, title: id, start: at(7, s), end: at(7, e) })
    const [list] = timedSegments([ev('a', 9, 11), ev('b', 10, 12), ev('c', 11, 13), ev('d', 14, 15)], days)
    const byId = Object.fromEntries(list.map((s) => [s.event.id, [s.col, s.cols]]))
    // a and c can share a column; d stands alone.
    expect(byId).toEqual({ a: [0, 2], b: [1, 2], c: [0, 2], d: [0, 1] })
  })

  it('layoutColumns handles a three-way overlap', () => {
    const seg = (id: string, start: number, end: number) => ({ event: { id, title: id, start: 0, end: 0 }, day: 0, start, end, before: false, after: false, col: 0, cols: 1 })
    const out = layoutColumns([seg('a', 0, 120), seg('b', 30, 90), seg('c', 60, 150)])
    expect(out.map((s) => `${s.event.id}${s.col}/${s.cols}`)).toEqual(['a0/3', 'b1/3', 'c2/3'])
  })

  it('stacks all-day bars into lanes, clipped to the view', () => {
    const days = viewDays(now, 'week')
    const bars = allDayBars(
      [
        { id: 'trip', title: '出差', start: '2026-10-06', end: '2026-10-08', allDay: true },
        { id: 'hol', title: '連假', start: '2026-10-09', end: '2026-10-12', allDay: true },
        { id: 'conf', title: '研討會', start: '2026-10-07', end: '2026-10-07', allDay: true },
        { id: 'past', title: '上週', start: '2026-09-28', end: '2026-09-30', allDay: true },
      ],
      days,
    )
    expect(bars.map((b) => [b.event.id, b.from, b.to, b.lane, b.after])).toEqual([
      ['trip', 2, 4, 0, false],
      ['conf', 3, 3, 1, false],
      ['hol', 5, 6, 0, true],
    ])
  })

  it('moves and resizes', () => {
    const e: MlSchedulerEvent = { id: 'x', title: 'x', start: at(7, 9), end: at(7, 10) }
    expect(moveEvent(e, 1, 30)).toEqual({ start: at(8, 9, 30), end: at(8, 10, 30) })
    expect(resizeEvent(e, 45, 15)).toEqual({ start: at(7, 9), end: at(7, 10, 45) })
    expect(resizeEvent(e, -120, 15)).toEqual({ start: at(7, 9), end: at(7, 9, 15) })
    const allDay: MlSchedulerEvent = { id: 'a', title: 'a', start: '2026-10-07', end: '2026-10-08', allDay: true }
    expect(moveEvent(allDay, 2, 999)).toEqual({ start: new Date(2026, 9, 9), end: new Date(2026, 9, 10) })
    expect(resizeEvent(allDay, -3 * 1440, 15)).toEqual({ start: new Date(2026, 9, 7), end: new Date(2026, 9, 7) })
  })

  it('snaps pointer positions and formats', () => {
    expect(minutesAt(100, 48, 15)).toBe(120)
    expect(minutesAt(100, 48, 15, 8)).toBe(600)
    expect(minutesAt(-50, 48, 15)).toBe(0)
    expect(formatMinutes(570)).toBe('09:30')
    expect(schedulerTitle(viewDays(now, 'week'), 'zh-TW')).toBe('2026年10月4日 – 10日')
    expect(schedulerTitle(viewDays(new Date(2026, 8, 30), 'week'), 'zh-TW')).toBe('2026年9月27日 – 10月3日')
    expect(schedulerTitle(viewDays(new Date(2026, 11, 30), 'week'), 'zh-TW')).toBe('2026年12月27日 – 2027年1月2日')
    expect(schedulerTitle(viewDays(now, 'week'), 'en').replace(/\s/g, ' ')).toBe('October 4 – 10, 2026')
  })
})

describe('MlScheduler', () => {
  const events: MlSchedulerEvent[] = [
    { id: 'a', title: '晨會', start: at(7, 9), end: at(7, 9, 30), tone: 'tech', location: '會議室' },
    { id: 'b', title: '審查', start: at(7, 9), end: at(7, 11) },
    { id: 'c', title: '出差', start: '2026-10-08', end: '2026-10-09', allDay: true },
    { id: 'd', title: '鎖定', start: at(6, 14), end: at(6, 15), editable: false },
  ]
  const prop = (key: string) => (wrapper!.props() as Record<string, unknown>)[key]

  it('renders the week with today, events, all-day bars and the now line', () => {
    wrapper = mount(MlScheduler, { props: { events, now, date: now } })
    expect(wrapper.find('.ml-scheduler__title').text()).toBe('2026年10月4日 – 10日')
    expect(wrapper.findAll('.ml-scheduler__day')).toHaveLength(7)
    expect(wrapper.find('.ml-scheduler__day--today .ml-scheduler__date').text()).toBe('7')
    expect(wrapper.findAll('.ml-scheduler__col')[3].findAll('.ml-scheduler__event')).toHaveLength(2)
    expect(wrapper.find('.ml-scheduler__event--allday').attributes('aria-label')).toBe('出差，全天')
    const a = wrapper.find('[data-id="a"]')
    expect(a.attributes('aria-label')).toBe('晨會，09:00–09:30，會議室')
    expect(a.attributes('style')).toContain('top: 432px')
    expect(a.attributes('style')).toContain('width: 50%')
    expect(wrapper.find('.ml-scheduler__now').attributes('style')).toContain('top: 504px')
  })

  it('toolbar pages, jumps to today and switches view', async () => {
    wrapper = mount(MlScheduler, {
      props: { now, date: now, 'onUpdate:date': (d?: Date) => wrapper!.setProps({ date: d }), 'onUpdate:view': (v: string) => wrapper!.setProps({ view: v }) },
    })
    await wrapper.find('[aria-label="下一頁"]').trigger('click')
    expect((prop('date') as Date).getDate()).toBe(14)
    await wrapper.find('.ml-scheduler__today').trigger('click')
    expect((prop('date') as Date).getDate()).toBe(7)
    await wrapper.findAll('.ml-scheduler__view')[1].trigger('click')
    expect(prop('view')).toBe('day')
    expect(wrapper.findAll('.ml-scheduler__day')).toHaveLength(1)
    expect(wrapper.find('.ml-scheduler__view--active').attributes('aria-pressed')).toBe('true')
  })

  it('clicks report the event; start/end hours crop the grid', () => {
    wrapper = mount(MlScheduler, { props: { events, now, date: now, startHour: 9, endHour: 18 } })
    expect(wrapper.findAll('.ml-scheduler__hour').map((h) => h.text())[0]).toBe('09:00')
    expect(wrapper.find('[data-id="a"]').attributes('style')).toContain('top: 0px')
    wrapper.find('[data-id="b"]').trigger('click')
    expect((wrapper.emitted('event-click')?.[0][0] as MlSchedulerEvent).id).toBe('b')
  })

  it('editable: arrow keys move, Shift resizes, locked events stay put', async () => {
    wrapper = mount(MlScheduler, { props: { events, now, date: now, editable: true }, attachTo: document.body })
    const a = wrapper.find('[data-id="a"]')
    expect(a.attributes('aria-describedby')).toMatch(/^ml-scheduler-hint-/)
    expect(wrapper.find('[data-id="d"]').attributes('aria-describedby')).toBeUndefined()
    await a.trigger('keydown', { key: 'ArrowDown' })
    await a.trigger('keydown', { key: 'ArrowRight' })
    await a.trigger('keydown', { key: 'ArrowDown', shiftKey: true })
    await wrapper.find('[data-id="d"]').trigger('keydown', { key: 'ArrowDown' })
    expect(wrapper.emitted('change')?.map(([e, r]) => [(e as MlSchedulerEvent).id, (r as { start: Date }).start.getHours() * 60 + (r as { start: Date }).start.getMinutes(), (r as { end: Date }).end.getMinutes()])).toEqual([
      ['a', 555, 45],
      ['a', 540, 30],
      ['a', 540, 45],
    ])
    expect(wrapper.find('[aria-live="polite"].ml-visually-hidden').text()).toContain('晨會 改到')
  })

  it('editable: dragging an event emits change; a drag is not a click', async () => {
    wrapper = mount(MlScheduler, { props: { events, now, date: now, editable: true, step: 30 }, attachTo: document.body })
    const b = wrapper.find('[data-id="b"]')
    b.element.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, button: 0, clientX: 0, clientY: 100, bubbles: true }))
    window.dispatchEvent(new PointerEvent('pointermove', { pointerId: 1, clientX: 0, clientY: 148 }))
    await nextTick()
    expect(wrapper.find('.ml-scheduler__event--draft').exists()).toBe(true)
    window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, clientX: 0, clientY: 148 }))
    await b.trigger('click')
    const [event, range] = wrapper.emitted('change')![0] as [MlSchedulerEvent, { start: Date; end: Date }]
    expect(event.id).toBe('b')
    expect([range.start.getHours(), range.end.getHours()]).toEqual([10, 12])
    expect(wrapper.emitted('event-click')).toBeUndefined()
  })

  it('editable: resizing from the handle', async () => {
    wrapper = mount(MlScheduler, { props: { events, now, date: now, editable: true }, attachTo: document.body })
    const handle = wrapper.find('[data-id="b"] .ml-scheduler__handle')
    handle.element.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 2, button: 0, clientX: 0, clientY: 0, bubbles: true }))
    window.dispatchEvent(new PointerEvent('pointermove', { pointerId: 2, clientX: 0, clientY: 24 }))
    window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 2, clientX: 0, clientY: 24 }))
    const [, range] = wrapper.emitted('change')![0] as [MlSchedulerEvent, { start: Date; end: Date }]
    expect([range.start.getHours(), range.end.getHours(), range.end.getMinutes()]).toEqual([9, 11, 30])
  })

  it('editable: dragging on an empty slot creates', async () => {
    wrapper = mount(MlScheduler, { props: { events: [], now, date: now, editable: true, step: 30 }, attachTo: document.body })
    const col = wrapper.findAll('.ml-scheduler__col')[2]
    col.element.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 3, button: 0, clientY: 9 * 48, bubbles: true }))
    window.dispatchEvent(new PointerEvent('pointermove', { pointerId: 3, clientY: 11 * 48 }))
    await nextTick()
    expect(wrapper.find('.ml-scheduler__ghost').text()).toBe('09:00–11:00')
    window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 3, clientY: 11 * 48 }))
    const [range] = wrapper.emitted('create')![0] as [{ start: Date; end: Date }]
    expect(range.start).toEqual(at(6, 9))
    expect(range.end).toEqual(at(6, 11))
  })

  it('without a toolbar; English', async () => {
    wrapper = mount(MlScheduler, { props: { now, date: now, toolbar: false } })
    expect(wrapper.find('.ml-scheduler__toolbar').exists()).toBe(false)
  })
})
