// MlScheduler and its layout maths.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import { MlScheduler, allDayBars, layoutColumns, moveEvent, resizeEvent, timedSegments, viewDays, type MlSchedulerEvent } from '../src'
import {
  addMonths,
  eventDays,
  eventTimeText,
  formatMinutes,
  minutesAt,
  monthCellAt,
  monthKeyMove,
  monthKeyTarget,
  monthLayout,
  monthTitle,
  schedulerTitle,
  shiftAnchor,
  toDate,
} from '../src/components/scheduler'

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
    await wrapper.findAll('.ml-scheduler__view')[2].trigger('click')
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

describe('month maths', () => {
  const grid = viewDays(now, 'month')
  const idx = (day: number) => grid.findIndex((g) => g.getTime() === new Date(2026, 9, day).getTime())

  it('six weeks around the month, honouring the week start; paging by month', () => {
    expect(grid).toHaveLength(42)
    expect(grid[0]).toEqual(new Date(2026, 8, 27))
    expect(grid[41]).toEqual(new Date(2026, 10, 7))
    expect(viewDays(now, 'month', 1)[0]).toEqual(new Date(2026, 8, 28))
    expect(shiftAnchor(new Date(2026, 9, 31), 'month', 1)).toEqual(new Date(2026, 10, 30))
    expect(shiftAnchor(new Date(2028, 0, 31), 'month', 1)).toEqual(new Date(2028, 1, 29))
    expect(addMonths(new Date(2026, 2, 31), -1)).toEqual(new Date(2026, 1, 28))
    expect(monthTitle(now, 'zh-TW')).toBe('2026年10月')
    expect(monthTitle(now, 'en')).toBe('October 2026')
  })

  it('event days: timed ends are exclusive, all-day ends inclusive', () => {
    expect(eventDays({ id: 'x', title: 'x', start: at(7, 22), end: at(8, 0) })).toEqual({ first: new Date(2026, 9, 7), last: new Date(2026, 9, 7) })
    expect(eventDays({ id: 'x', title: 'x', start: at(7, 22), end: at(8, 4) })!.last).toEqual(new Date(2026, 9, 8))
    expect(eventDays({ id: 'x', title: 'x', start: '2026-10-07', end: '2026-10-05', allDay: true })!.last).toEqual(new Date(2026, 9, 7))
    expect(eventTimeText({ id: 'x', title: 'x', start: at(7, 9), end: at(7, 10, 30) })).toBe('09:00–10:30')
    expect(eventTimeText({ id: 'x', title: 'x', start: at(7, 22), end: at(8, 4) })).toBe('10/7 22:00–10/8 04:00')
    expect(eventTimeText({ id: 'x', title: 'x', start: '2026-10-07', end: '2026-10-07', allDay: true })).toBe('')
  })

  it('bars wrap across week rows; chips stay in their day; lanes are deterministic', () => {
    const events: MlSchedulerEvent[] = [
      { id: 'b', title: '審查', start: at(7, 14), end: at(7, 15) },
      { id: 'a', title: '晨會', start: at(7, 9), end: at(7, 9, 30) },
      { id: 'c', title: '午餐', start: at(7, 12), end: at(7, 13) },
      { id: 'conf', title: '研討會', start: '2026-10-07', end: '2026-10-07', allDay: true },
      { id: 'trip', title: '出差', start: '2026-10-06', end: '2026-10-08', allDay: true },
      { id: 'expo', title: '電腦展', start: '2026-10-09', end: '2026-10-13', allDay: true },
      { id: 'night', title: '夜班', start: at(20, 22), end: at(21, 4) },
      { id: 'gone', title: '去年', start: '2025-10-07', end: '2025-10-07', allDay: true },
    ]
    const { starts, perDay, more } = monthLayout(events, grid, 3)
    // Bars first (earlier first), then chips by start time; lane 3 and on are hidden.
    expect(perDay[idx(7)].map((p) => [p.event.id, p.lane])).toEqual([
      ['trip', 0],
      ['conf', 1],
      ['a', 2],
      ['c', 3],
      ['b', 4],
    ])
    expect(more[idx(7)]).toBe(2)
    expect(more[idx(6)]).toBe(0)
    expect(starts[idx(7)].map((p) => p.event.id)).toEqual(['conf', 'a'])
    expect(starts[idx(6)][0]).toMatchObject({ bar: true, from: 2, to: 4, before: false, after: false })
    expect(starts[idx(7)][1]).toMatchObject({ bar: false, time: '09:00' })
    // 9 → 13 Oct: Friday–Saturday, then Sunday–Tuesday of the next row.
    const expo = [...starts[idx(9)], ...starts[idx(11)]].filter((p) => p.event.id === 'expo')
    expect(expo.map((p) => [p.week, p.from, p.to, p.before, p.after])).toEqual([
      [1, 5, 6, false, true],
      [2, 0, 2, true, false],
    ])
    expect(starts[idx(20)][0]).toMatchObject({ bar: true, from: 2, to: 3 })
    expect(perDay.flat().some((p) => p.event.id === 'gone')).toBe(false)
    // maxRows 0: everything folds into "n more".
    expect(monthLayout(events, grid, 0).starts.flat()).toHaveLength(0)
  })

  it('a bar running past the grid is cut at both ends', () => {
    const { starts } = monthLayout([{ id: 'q', title: '季', start: '2026-09-01', end: '2026-12-31', allDay: true }], grid)
    expect(starts[0][0]).toMatchObject({ before: true, after: true, from: 0, to: 6 })
    expect(starts[35][0]).toMatchObject({ before: true, after: true })
  })

  it('pointer → cell, keys → day, keys → event move', () => {
    const box = { left: 10, top: 20, width: 700, height: 600 }
    expect(monthCellAt(10 + 350, 20 + 250, box)).toBe(17)
    expect(monthCellAt(-100, 9999, box)).toBe(35)
    expect(monthCellAt(5, 5, { left: 0, top: 0, width: 0, height: 0 })).toBe(0)
    const d = new Date(2026, 9, 7)
    expect(monthKeyTarget(d, 'ArrowRight')).toEqual(new Date(2026, 9, 8))
    expect(monthKeyTarget(d, 'ArrowUp')).toEqual(new Date(2026, 8, 30))
    expect(monthKeyTarget(d, 'Home')).toEqual(new Date(2026, 9, 4))
    expect(monthKeyTarget(d, 'Home', 1)).toEqual(new Date(2026, 9, 5))
    expect(monthKeyTarget(d, 'End')).toEqual(new Date(2026, 9, 10))
    expect(monthKeyTarget(d, 'PageDown')).toEqual(new Date(2026, 10, 7))
    expect(monthKeyTarget(d, 'PageUp', 0, true)).toEqual(new Date(2025, 9, 7))
    expect(monthKeyTarget(d, 'x')).toBeNull()
    const timed: MlSchedulerEvent = { id: 't', title: 't', start: at(7, 9), end: at(7, 10) }
    const allDay: MlSchedulerEvent = { id: 'a', title: 'a', start: '2026-10-07', end: '2026-10-08', allDay: true }
    expect(monthKeyMove(timed, 'ArrowDown')).toEqual({ start: at(14, 9), end: at(14, 10) })
    expect(monthKeyMove(timed, 'ArrowLeft')).toEqual({ start: at(6, 9), end: at(6, 10) })
    expect(monthKeyMove(timed, 'ArrowRight', true)).toBeNull()
    expect(monthKeyMove(allDay, 'ArrowRight', true)).toEqual({ start: new Date(2026, 9, 7), end: new Date(2026, 9, 9) })
    expect(monthKeyMove(allDay, 'Enter')).toBeNull()
  })
})

describe('MlScheduler month view', () => {
  const events: MlSchedulerEvent[] = [
    { id: 'a', title: '晨會', start: at(7, 9), end: at(7, 9, 30), tone: 'tech' },
    { id: 'b', title: '審查', start: at(7, 14), end: at(7, 15) },
    { id: 'c', title: '午餐', start: at(7, 12), end: at(7, 13) },
    { id: 'd', title: '鎖定', start: at(7, 16), end: at(7, 17), editable: false },
    { id: 'expo', title: '電腦展', start: '2026-10-09', end: '2026-10-13', allDay: true, tone: 'bean' },
  ]
  const prop = (key: string) => (wrapper!.props() as Record<string, unknown>)[key]
  const controlled = { 'onUpdate:date': (d?: Date) => wrapper!.setProps({ date: d }), 'onUpdate:view': (v: string) => wrapper!.setProps({ view: v }) }
  const cell = (month: number, day: number) => wrapper!.findAll('.ml-scheduler__mday').find((c) => c.attributes('aria-label')!.startsWith(`${month}月${day}日`))!
  const box = { left: 0, top: 0, width: 700, height: 600, right: 700, bottom: 600, x: 0, y: 0, toJSON: () => ({}) } as DOMRect
  const focused = () => (document.activeElement as HTMLElement).getAttribute('aria-label')

  it('renders six weeks with dimmed outside days, today, bars and chips', () => {
    wrapper = mount(MlScheduler, { props: { events, now, date: now, view: 'month' } })
    expect(wrapper.find('.ml-scheduler__title').text()).toBe('2026年10月')
    expect(wrapper.find('[role="grid"]').attributes('aria-label')).toBe('2026年10月')
    expect(wrapper.findAll('[role="columnheader"]')).toHaveLength(7)
    expect(wrapper.findAll('[role="gridcell"]')).toHaveLength(42)
    expect(wrapper.findAll('.ml-scheduler__mday--outside')).toHaveLength(11)
    const today = wrapper.find('.ml-scheduler__mday--today')
    expect(today.attributes('aria-current')).toBe('date')
    expect(today.attributes('tabindex')).toBe('0')
    expect(wrapper.findAll('[tabindex="0"]')).toHaveLength(1)
    expect(today.attributes('aria-label')).toBe('10月7日星期三，4 項行程')
    expect(today.find('.ml-scheduler__mdate').text()).toBe('7')
    const chip = wrapper.find('[data-id="a"]')
    expect(chip.classes()).toContain('ml-scheduler__event--chip')
    expect(chip.text()).toBe('09:00晨會')
    expect(chip.attributes('aria-label')).toBe('晨會，09:00–09:30')
    const expo = wrapper.findAll('[data-id="expo"]')
    expect(expo.map((e) => [e.classes('ml-scheduler__event--before'), e.classes('ml-scheduler__event--after')])).toEqual([
      [false, true],
      [true, false],
    ])
    expect(expo[0].attributes('style')).toContain('--_sc-span: 2')
    expect(expo[0].attributes('aria-label')).toBe('電腦展，全天')
    // 4 events on 7 Oct, 3 rows: one folds.
    expect(today.find('.ml-scheduler__more').text()).toBe('還有 1 項')
    expect(today.findAll('.ml-scheduler__event')).toHaveLength(3)
    expect(wrapper.find('.ml-scheduler__now').exists()).toBe(false)
  })

  it('pages by month, switches views and opens a day from its number', async () => {
    wrapper = mount(MlScheduler, { props: { now, date: now, view: 'month', ...controlled } })
    expect(wrapper.findAll('.ml-scheduler__view').map((v) => v.text())).toEqual(['月', '週', '日'])
    await wrapper.find('[aria-label="下一頁"]').trigger('click')
    expect(prop('date')).toEqual(new Date(2026, 10, 7, 10, 30))
    expect(wrapper.find('.ml-scheduler__title').text()).toBe('2026年11月')
    await wrapper.find('[aria-label="上一頁"]').trigger('click')
    const nine = cell(10, 9).find('.ml-scheduler__mdate')
    expect(nine.attributes('aria-label')).toBe('查看 10月9日星期五')
    expect(nine.attributes('tabindex')).toBe('-1')
    await nine.trigger('click')
    expect(wrapper.emitted('update:date')!.at(-1)).toEqual([new Date(2026, 9, 9)])
    expect(wrapper.emitted('update:view')!.at(-1)).toEqual(['day'])
    expect(wrapper.findAll('.ml-scheduler__day')).toHaveLength(1)
    await wrapper.findAll('.ml-scheduler__view')[0].trigger('click')
    expect(prop('view')).toBe('month')
  })

  it('roving focus: arrows, Home / End and PageDown move the date; Enter opens the day', async () => {
    wrapper = mount(MlScheduler, { props: { now, date: now, view: 'month', ...controlled }, attachTo: document.body })
    await cell(10, 7).trigger('keydown', { key: 'ArrowRight' })
    await nextTick()
    expect(focused()).toBe('10月8日星期四')
    await cell(10, 8).trigger('keydown', { key: 'End' })
    await nextTick()
    expect(focused()).toBe('10月10日星期六')
    await cell(10, 10).trigger('keydown', { key: 'PageDown' })
    await nextTick()
    expect(wrapper.find('.ml-scheduler__title').text()).toBe('2026年11月')
    expect(focused()).toBe('11月10日星期二')
    await cell(11, 10).trigger('keydown', { key: 'Enter' })
    expect(prop('view')).toBe('day')
    expect(prop('date')).toEqual(new Date(2026, 10, 10))
  })

  it('"還有 n 項" opens the whole day; Escape and outside clicks close it, focus returns', async () => {
    wrapper = mount(MlScheduler, { props: { events, now, date: now, view: 'month', monthMaxEvents: 2 }, attachTo: document.body })
    const more = wrapper.find('.ml-scheduler__more')
    expect(more.text()).toBe('還有 2 項')
    await more.trigger('click')
    await nextTick()
    const pop = wrapper.find('[role="dialog"]')
    expect(pop.attributes('aria-label')).toBe('10月7日星期三')
    expect(pop.findAll('.ml-scheduler__event').map((e) => e.text())).toEqual(['09:00晨會', '12:00午餐', '14:00審查', '16:00鎖定'])
    expect(more.attributes('aria-expanded')).toBe('true')
    expect((document.activeElement as HTMLElement).dataset.id).toBe('a')
    await pop.find('[data-id="c"]').trigger('click')
    expect((wrapper.emitted('event-click')![0][0] as MlSchedulerEvent).id).toBe('c')
    await pop.find('[data-id="c"]').trigger('keydown', { key: 'Escape' })
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    expect(document.activeElement).toBe(more.element)
    await more.trigger('click')
    await nextTick()
    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
    await nextTick()
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    expect(document.activeElement).toBe(more.element)
  })

  it('editable: drag an event to another day keeping its time; arrows move it by days and weeks', async () => {
    const rect = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(box)
    wrapper = mount(MlScheduler, { props: { events, now, date: now, view: 'month', editable: true }, attachTo: document.body })
    expect(wrapper.find('.ml-visually-hidden').text()).toContain('上下換週')
    // 7 Oct is row 1, column 3 of a 700 × 600 grid; drop on row 2, column 5 (16 Oct).
    wrapper.find('[data-id="a"]').element.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, button: 0, clientX: 350, clientY: 150, bubbles: true }))
    window.dispatchEvent(new PointerEvent('pointermove', { pointerId: 1, clientX: 550, clientY: 250 }))
    await nextTick()
    expect(wrapper.find('.ml-scheduler__event--draft').exists()).toBe(true)
    window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, clientX: 550, clientY: 250 }))
    await wrapper.find('[data-id="a"]').trigger('click')
    expect(wrapper.emitted('change')![0][1]).toEqual({ start: at(16, 9), end: at(16, 9, 30) })
    expect(wrapper.emitted('event-click')).toBeUndefined()
    await wrapper.find('[data-id="a"]').trigger('keydown', { key: 'ArrowDown' })
    await wrapper.find('[data-id="expo"]').trigger('keydown', { key: 'ArrowRight', shiftKey: true })
    expect(wrapper.emitted('change')!.slice(1).map(([, r]) => r)).toEqual([
      { start: at(14, 9), end: at(14, 9, 30) },
      { start: new Date(2026, 9, 9), end: new Date(2026, 9, 14) },
    ])
    expect(wrapper.find('[aria-live="polite"].ml-visually-hidden').text()).toContain('電腦展 改到')
    rect.mockRestore()
  })

  it('editable: click or drag across empty days to create an all-day event', async () => {
    const rect = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(box)
    wrapper = mount(MlScheduler, { props: { now, date: now, view: 'month', editable: true }, attachTo: document.body })
    cell(10, 14).element.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 2, button: 0, clientX: 350, clientY: 250, bubbles: true }))
    window.dispatchEvent(new PointerEvent('pointermove', { pointerId: 2, clientX: 550, clientY: 250 }))
    await nextTick()
    expect(wrapper.findAll('.ml-scheduler__mday--ghost')).toHaveLength(3)
    window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 2, clientX: 550, clientY: 250 }))
    cell(10, 20).element.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 3, button: 0, clientX: 250, clientY: 350, bubbles: true }))
    window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 3, clientX: 250, clientY: 350 }))
    expect(wrapper.emitted('create')).toEqual([
      [{ start: new Date(2026, 9, 14), end: new Date(2026, 9, 16), allDay: true }],
      [{ start: new Date(2026, 9, 20), end: new Date(2026, 9, 20), allDay: true }],
    ])
    rect.mockRestore()
  })
})
