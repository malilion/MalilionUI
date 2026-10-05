// Scheduler maths (framework-free, shared by MlScheduler and the React <Scheduler>):
// the visible days, events cut into per-day segments, side-by-side columns for
// overlapping events, lanes for all-day events, snapping for drag and drop, and
// the month grid (bars and chips in lanes, "n more" overflow, keyboard targets).
import type { MlChartTone } from '../types'

export type MlSchedulerDate = Date | string | number
export type MlSchedulerView = 'month' | 'week' | 'day'

export interface MlSchedulerEvent {
  id: string
  title: string
  start: MlSchedulerDate
  /** Timed events: when it ends (exclusive). All-day events: the last day (inclusive). */
  end: MlSchedulerDate
  allDay?: boolean
  tone?: MlChartTone
  location?: string
  /** false pins this event even when the scheduler is editable. */
  editable?: boolean
}

const MINUTE = 60_000
export const DAY_MINUTES = 1440

/** 'YYYY-MM-DD' is a local date; other strings and numbers go through Date. Invalid → null. */
export function toDate(input: MlSchedulerDate): Date | null {
  if (typeof input === 'string') {
    const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(input.trim())
    if (m) return new Date(+m[1], +m[2] - 1, +m[3])
  }
  const d = input instanceof Date ? new Date(input.getTime()) : new Date(input)
  return Number.isNaN(d.getTime()) ? null : d
}

export function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

export function addDays(d: Date, n: number) {
  const r = new Date(d.getTime())
  r.setDate(r.getDate() + n)
  return r
}

export function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

/** The same day in another month, clamped to its length (31 Jan + 1 → 28 / 29 Feb). */
export function addMonths(d: Date, n: number) {
  const length = new Date(d.getFullYear(), d.getMonth() + n + 1, 0).getDate()
  return new Date(d.getFullYear(), d.getMonth() + n, Math.min(d.getDate(), length), d.getHours(), d.getMinutes())
}

/** Midnight of each visible day: one day, one week, or the six weeks around a month. */
export function viewDays(anchor: Date, view: MlSchedulerView, weekStartsOn: 0 | 1 = 0) {
  const day = startOfDay(anchor)
  if (view === 'day') return [day]
  const from = view === 'month' ? new Date(day.getFullYear(), day.getMonth(), 1) : day
  const first = addDays(from, -((from.getDay() - weekStartsOn + 7) % 7))
  return Array.from({ length: view === 'month' ? 42 : 7 }, (_, i) => addDays(first, i))
}

/** Step the anchor by one page. */
export function shiftAnchor(anchor: Date, view: MlSchedulerView, direction: 1 | -1) {
  if (view === 'month') return addMonths(anchor, direction)
  return addDays(anchor, direction * (view === 'day' ? 1 : 7))
}

export interface SchedulerSegment {
  event: MlSchedulerEvent
  /** Column (day) index. */
  day: number
  /** Minutes after the day's midnight. */
  start: number
  end: number
  /** The event started on an earlier day / goes on past this day. */
  before: boolean
  after: boolean
  /** Side-by-side placement among overlapping events. */
  col: number
  cols: number
}

/** Timed events cut at midnight into one segment per visible day, laid out in columns. */
export function timedSegments(events: MlSchedulerEvent[], days: Date[], minDuration = 15): SchedulerSegment[][] {
  const perDay: SchedulerSegment[][] = days.map(() => [])
  for (const event of events) {
    if (event.allDay) continue
    const s = toDate(event.start)
    let e = toDate(event.end)
    if (!s) continue
    if (!e || e.getTime() <= s.getTime()) e = new Date(s.getTime() + minDuration * MINUTE)
    days.forEach((day, i) => {
      const dayStart = day.getTime()
      const dayEnd = addDays(day, 1).getTime()
      const from = Math.max(s.getTime(), dayStart)
      const to = Math.min(e!.getTime(), dayEnd)
      if (to <= from) return
      const start = Math.round((from - dayStart) / MINUTE)
      const end = Math.max(start + minDuration, Math.round((to - dayStart) / MINUTE))
      perDay[i].push({ event, day: i, start, end: Math.min(DAY_MINUTES, end), before: s.getTime() < dayStart, after: e!.getTime() > dayEnd, col: 0, cols: 1 })
    })
  }
  for (const list of perDay) layoutColumns(list)
  return perDay
}

/**
 * Overlapping events share the width: each cluster of (transitively)
 * overlapping segments gets as many columns as it needs at its busiest.
 */
export function layoutColumns(list: SchedulerSegment[]) {
  list.sort((a, b) => a.start - b.start || b.end - a.end || a.event.id.localeCompare(b.event.id))
  let cluster: SchedulerSegment[] = []
  let colEnds: number[] = []
  let clusterEnd = -1
  const flush = () => {
    for (const s of cluster) s.cols = colEnds.length
    cluster = []
    colEnds = []
  }
  for (const seg of list) {
    if (seg.start >= clusterEnd) flush()
    let col = colEnds.findIndex((end) => end <= seg.start)
    if (col === -1) {
      col = colEnds.length
      colEnds.push(seg.end)
    } else colEnds[col] = seg.end
    seg.col = col
    cluster.push(seg)
    clusterEnd = Math.max(clusterEnd, seg.end)
  }
  flush()
  return list
}

export interface AllDayBar {
  event: MlSchedulerEvent
  /** First and last visible column (inclusive). */
  from: number
  to: number
  lane: number
  before: boolean
  after: boolean
}

/** All-day events as bars across the visible days, stacked into lanes. */
export function allDayBars(events: MlSchedulerEvent[], days: Date[]): AllDayBar[] {
  if (!days.length) return []
  const first = days[0].getTime()
  const last = days[days.length - 1].getTime()
  const bars: AllDayBar[] = []
  for (const event of events) {
    if (!event.allDay) continue
    const s = toDate(event.start)
    const e = toDate(event.end) ?? s
    if (!s || !e) continue
    const sDay = startOfDay(s).getTime()
    const eDay = Math.max(sDay, startOfDay(e).getTime())
    if (eDay < first || sDay > last) continue
    const from = days.findIndex((d) => d.getTime() >= sDay)
    let to = days.length - 1
    for (let i = days.length - 1; i >= 0; i--) {
      if (days[i].getTime() <= eDay) {
        to = i
        break
      }
    }
    bars.push({ event, from, to, lane: 0, before: sDay < first, after: eDay > last })
  }
  bars.sort((a, b) => a.from - b.from || b.to - a.to)
  const laneEnds: number[] = []
  for (const bar of bars) {
    let lane = laneEnds.findIndex((end) => end < bar.from)
    if (lane === -1) lane = laneEnds.length
    laneEnds[lane] = bar.to
    bar.lane = lane
  }
  return bars
}

/** Round minutes to the step. */
export function snapMinutes(minutes: number, step: number) {
  return Math.round(minutes / step) * step
}

/** A pointer's y offset in the day column → minutes, snapped and clamped to the day. */
export function minutesAt(y: number, hourHeight: number, step: number, startHour = 0) {
  return Math.max(0, Math.min(DAY_MINUTES, snapMinutes((y / hourHeight) * 60, step) + startHour * 60))
}

export interface SchedulerRange {
  start: Date
  end: Date
  /** Set on ranges created in month view: whole days, `end` is the last day (inclusive). */
  allDay?: boolean
}

/** Move an event by whole days and minutes, keeping its length. */
export function moveEvent(event: MlSchedulerEvent, days: number, minutes: number): SchedulerRange | null {
  const s = toDate(event.start)
  const e = toDate(event.end)
  if (!s || !e) return null
  if (event.allDay) return { start: addDays(s, days), end: addDays(e, days) }
  return { start: new Date(addDays(s, days).getTime() + minutes * MINUTE), end: new Date(addDays(e, days).getTime() + minutes * MINUTE) }
}

/** Stretch or shrink an event's end, never shorter than one step. */
export function resizeEvent(event: MlSchedulerEvent, minutes: number, step: number): SchedulerRange | null {
  const s = toDate(event.start)
  const e = toDate(event.end)
  if (!s || !e) return null
  if (event.allDay) {
    const end = addDays(e, Math.round(minutes / DAY_MINUTES))
    return { start: s, end: end.getTime() < s.getTime() ? s : end }
  }
  return { start: s, end: new Date(Math.max(s.getTime() + step * MINUTE, e.getTime() + minutes * MINUTE)) }
}

/** 0 → "00:00", 570 → "09:30", 1440 → "24:00". */
export function formatMinutes(minutes: number) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function formatClock(d: Date) {
  return formatMinutes(d.getHours() * 60 + d.getMinutes())
}

/** Visible hour labels. */
export function hourLabels(startHour: number, endHour: number) {
  return Array.from({ length: Math.max(0, endHour - startHour) }, (_, i) => formatMinutes((startHour + i) * 60))
}

/** "2026年10月4日至10日" / "Oct 4 – 10, 2026", or a single long date in day view. */
export function schedulerTitle(days: Date[], locale: string) {
  if (!days.length) return ''
  try {
    if (days.length === 1) return new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }).format(days[0])
    const a = days[0]
    const b = days[days.length - 1]
    // zh formatRange falls back to "2026/10/4至2026/10/10"; write it the way calendars do.
    if (locale.toLowerCase().startsWith('zh')) {
      const head = `${a.getFullYear()}年${a.getMonth() + 1}月${a.getDate()}日`
      if (a.getFullYear() !== b.getFullYear()) return `${head} – ${b.getFullYear()}年${b.getMonth() + 1}月${b.getDate()}日`
      return a.getMonth() === b.getMonth() ? `${head} – ${b.getDate()}日` : `${head} – ${b.getMonth() + 1}月${b.getDate()}日`
    }
    return new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long', day: 'numeric' }).formatRange(a, b)
  } catch {
    return `${days[0].toDateString()} – ${days[days.length - 1].toDateString()}`
  }
}

export function weekdayLabel(d: Date, locale: string) {
  try {
    return new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(d)
  } catch {
    return String(d.getDay())
  }
}

/** "09:00–10:30", "全天" handled by the caller; a segment cut at midnight shows the visible part. */
export function segmentTime(seg: { start: number; end: number }) {
  return `${formatMinutes(seg.start)}–${formatMinutes(seg.end)}`
}

/** Minutes after midnight of a Date. */
export function minuteOfDay(d: Date) {
  return d.getHours() * 60 + d.getMinutes()
}

/* ── Month view ───────────────────────────────────────── */

/** "2026年10月" / "October 2026". */
export function monthTitle(anchor: Date, locale: string) {
  if (locale.toLowerCase().startsWith('zh')) return `${anchor.getFullYear()}年${anchor.getMonth() + 1}月`
  try {
    return new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long' }).format(anchor)
  } catch {
    return `${anchor.getFullYear()}-${String(anchor.getMonth() + 1).padStart(2, '0')}`
  }
}

/** "10月7日星期三" / "Wednesday, October 7": day cells and the overflow popover. */
export function dayLabel(d: Date, locale: string) {
  try {
    return new Intl.DateTimeFormat(locale, { month: 'long', day: 'numeric', weekday: 'long' }).format(d)
  } catch {
    return d.toDateString()
  }
}

/** First and last calendar day an event touches. Timed ends are exclusive, so 22:00–24:00 stays on one day. */
export function eventDays(event: MlSchedulerEvent): { first: Date; last: Date } | null {
  const s = toDate(event.start)
  if (!s) return null
  const e = toDate(event.end)
  const first = startOfDay(s)
  if (event.allDay) {
    const last = e ? startOfDay(e) : first
    return { first, last: last.getTime() < first.getTime() ? first : last }
  }
  if (!e || e.getTime() <= s.getTime()) return { first, last: first }
  return { first, last: startOfDay(new Date(e.getTime() - 1)) }
}

/** Spoken time: "09:00–10:30", with dates when it spans days ("10/7 22:00–10/8 06:00"); all-day → ''. */
export function eventTimeText(event: MlSchedulerEvent) {
  if (event.allDay) return ''
  const s = toDate(event.start)
  const e = toDate(event.end)
  if (!s) return ''
  if (!e || e.getTime() <= s.getTime()) return formatClock(s)
  const span = eventDays(event)!
  const date = (d: Date) => (span.last.getTime() > span.first.getTime() ? `${d.getMonth() + 1}/${d.getDate()} ` : '')
  return `${date(s)}${formatClock(s)}–${date(e)}${formatClock(e)}`
}

export interface MonthItem {
  event: MlSchedulerEvent
  /** Week row and first / last column (inclusive) of this piece. */
  week: number
  from: number
  to: number
  lane: number
  /** A whole-day bar (all-day or spanning days), or a timed chip inside one day. */
  bar: boolean
  /** The event goes on from the previous row / into the next one (or past the grid). */
  before: boolean
  after: boolean
  /** Start time shown on chips ("09:30"); '' on bars. */
  time: string
}

export interface MonthLayout {
  /** Per day: the visible pieces that start in that cell, by lane. */
  starts: MonthItem[][]
  /** Per day: every piece covering it, by lane (the overflow popover lists these). */
  perDay: MonthItem[][]
  /** Per day: how many pieces are hidden behind "還有 n 項". */
  more: number[]
}

/**
 * Events on the month grid. Each event is cut at week rows; in every row bars
 * come first, then earlier, then longer events, and each piece takes the lowest
 * lane free on all of its days. Lanes from `maxRows` on are hidden and counted.
 */
export function monthLayout(events: MlSchedulerEvent[], days: Date[], maxRows = 3): MonthLayout {
  const starts: MonthItem[][] = days.map(() => [])
  const perDay: MonthItem[][] = days.map(() => [])
  const more = days.map(() => 0)
  if (!days.length) return { starts, perDay, more }
  const gridFirst = days[0].getTime()
  const gridLast = days[days.length - 1].getTime()
  const rows: MonthItem[][] = Array.from({ length: Math.ceil(days.length / 7) }, () => [])
  const rank = new Map<MonthItem, { length: number; start: number }>()
  for (const event of events) {
    const span = eventDays(event)
    if (!span) continue
    const f = span.first.getTime()
    const l = span.last.getTime()
    if (l < gridFirst || f > gridLast) continue
    const from = days.findIndex((d) => d.getTime() >= f)
    let to = days.length - 1
    while (to > 0 && days[to].getTime() > l) to--
    const bar = !!event.allDay || l > f
    const start = toDate(event.start)!
    const length = Math.round((l - f) / 86_400_000) + 1
    for (let w = Math.floor(from / 7); w <= Math.floor(to / 7); w++) {
      const a = Math.max(from, w * 7)
      const b = Math.min(to, w * 7 + 6)
      const item: MonthItem = {
        event,
        week: w,
        from: a - w * 7,
        to: b - w * 7,
        lane: 0,
        bar,
        before: a > from || f < gridFirst,
        after: b < to || l > gridLast,
        time: bar ? '' : formatClock(start),
      }
      rank.set(item, { length, start: start.getTime() })
      rows[w].push(item)
    }
  }
  const limit = Math.max(0, Math.floor(maxRows))
  rows.forEach((row, w) => {
    row.sort((x, y) => {
      const rx = rank.get(x)!
      const ry = rank.get(y)!
      return (
        Number(y.bar) - Number(x.bar) ||
        x.from - y.from ||
        ry.length - rx.length ||
        Number(!!y.event.allDay) - Number(!!x.event.allDay) ||
        rx.start - ry.start ||
        x.event.id.localeCompare(y.event.id)
      )
    })
    const taken: boolean[][] = []
    for (const item of row) {
      let lane = 0
      while (taken[lane]?.slice(item.from, item.to + 1).some(Boolean)) lane++
      taken[lane] ??= []
      for (let c = item.from; c <= item.to; c++) taken[lane][c] = true
      item.lane = lane
    }
    for (const item of [...row].sort((x, y) => x.lane - y.lane)) {
      if (item.lane < limit) starts[w * 7 + item.from].push(item)
      for (let c = item.from; c <= item.to; c++) {
        perDay[w * 7 + c].push(item)
        if (item.lane >= limit) more[w * 7 + c]++
      }
    }
  })
  return { starts, perDay, more }
}

/** The month cell (0–41) under a pointer, given the box of the week rows; clamped to the grid. */
export function monthCellAt(x: number, y: number, box: { left: number; top: number; width: number; height: number }, weeks = 6) {
  const col = box.width > 0 ? Math.min(6, Math.max(0, Math.floor(((x - box.left) / box.width) * 7))) : 0
  const row = box.height > 0 ? Math.min(weeks - 1, Math.max(0, Math.floor(((y - box.top) / box.height) * weeks))) : 0
  return row * 7 + col
}

/** Where a key moves the focused day of the month grid; null for other keys. Shift + PageUp / PageDown steps a year. */
export function monthKeyTarget(day: Date, key: string, weekStartsOn: 0 | 1 = 0, shift = false): Date | null {
  const col = (day.getDay() - weekStartsOn + 7) % 7
  switch (key) {
    case 'ArrowLeft':
      return addDays(day, -1)
    case 'ArrowRight':
      return addDays(day, 1)
    case 'ArrowUp':
      return addDays(day, -7)
    case 'ArrowDown':
      return addDays(day, 7)
    case 'Home':
      return addDays(day, -col)
    case 'End':
      return addDays(day, 6 - col)
    case 'PageUp':
      return addMonths(day, shift ? -12 : -1)
    case 'PageDown':
      return addMonths(day, shift ? 12 : 1)
  }
  return null
}

/**
 * Keyboard moves in month view, the week view's model by days: ← → a day,
 * ↑ ↓ a week, Shift + ← → changes how many days an all-day event lasts.
 */
export function monthKeyMove(event: MlSchedulerEvent, key: string, shift = false): SchedulerRange | null {
  const horizontal = key === 'ArrowLeft' ? -1 : key === 'ArrowRight' ? 1 : 0
  const vertical = key === 'ArrowUp' ? -1 : key === 'ArrowDown' ? 1 : 0
  if (shift) return horizontal && event.allDay ? resizeEvent(event, horizontal * DAY_MINUTES, 15) : null
  if (horizontal || vertical) return moveEvent(event, horizontal + vertical * 7, 0)
  return null
}
