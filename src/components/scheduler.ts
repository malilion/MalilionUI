// Scheduler maths (framework-free, shared by MlScheduler and the React <Scheduler>):
// the visible days, events cut into per-day segments, side-by-side columns for
// overlapping events, lanes for all-day events, and snapping for drag and drop.
import type { MlChartTone } from '../types'

export type MlSchedulerDate = Date | string | number
export type MlSchedulerView = 'week' | 'day'

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

/** Midnight of each visible day. */
export function viewDays(anchor: Date, view: MlSchedulerView, weekStartsOn: 0 | 1 = 0) {
  const day = startOfDay(anchor)
  if (view === 'day') return [day]
  const first = addDays(day, -((day.getDay() - weekStartsOn + 7) % 7))
  return Array.from({ length: 7 }, (_, i) => addDays(first, i))
}

/** Step the anchor by one page. */
export function shiftAnchor(anchor: Date, view: MlSchedulerView, direction: 1 | -1) {
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
