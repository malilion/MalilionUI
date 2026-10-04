// Gantt date maths (framework-free, shared by MlGantt and the React <Gantt>).
// Every date is reduced to a whole "day number" (days since 1970-01-01) taken
// from its *local* calendar date, so daylight-saving shifts and time zones can
// never move a bar by a day. 'YYYY-MM-DD' strings are read as local dates
// (`new Date('2026-03-02')` would be UTC midnight — the day before in the Americas).
import type { MlChartTone } from '../types'

export type MlGanttDate = Date | string | number
export type MlGanttScale = 'day' | 'week' | 'month'

export interface MlGanttTask {
  id: string
  label: string
  start: MlGanttDate
  /** Last day of the task (inclusive). Ignored for milestones. */
  end: MlGanttDate
  /** 0–1. */
  progress?: number
  /** Tasks with the same group are listed together under a collapsible header. */
  group?: string
  tone?: MlChartTone
  /** Ids of tasks that must finish before this one starts (drawn as arrows). */
  deps?: string[]
  /** A single-day marker drawn as a diamond on `start`. */
  milestone?: boolean
}

const DAY = 86_400_000

/** A date (Date, 'YYYY-MM-DD', ISO string or timestamp) → its local calendar day number. NaN when invalid. */
export function ganttDay(input: MlGanttDate): number {
  if (typeof input === 'string') {
    const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(input.trim())
    if (m) return Math.round(Date.UTC(+m[1], +m[2] - 1, +m[3]) / DAY)
  }
  const d = input instanceof Date ? input : new Date(input)
  if (Number.isNaN(d.getTime())) return NaN
  return Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAY)
}

/** Day number → a local Date at midnight. */
export function ganttDate(day: number): Date {
  const u = new Date(day * DAY)
  return new Date(u.getUTCFullYear(), u.getUTCMonth(), u.getUTCDate())
}

export interface GanttParts {
  year: number
  /** 0–11. */
  month: number
  date: number
  /** 0 = Sunday … 6 = Saturday. */
  weekday: number
}

export function ganttParts(day: number): GanttParts {
  const u = new Date(day * DAY)
  return { year: u.getUTCFullYear(), month: u.getUTCMonth(), date: u.getUTCDate(), weekday: u.getUTCDay() }
}

/** Day number → 'YYYY-MM-DD'. */
export function ganttISO(day: number) {
  const p = ganttParts(day)
  return `${p.year}-${String(p.month + 1).padStart(2, '0')}-${String(p.date).padStart(2, '0')}`
}

/** Day number → '2026/3/2'. */
export function ganttFormat(day: number) {
  const p = ganttParts(day)
  return `${p.year}/${p.month + 1}/${p.date}`
}

const monthStart = (day: number) => {
  const p = ganttParts(day)
  return Math.round(Date.UTC(p.year, p.month, 1) / DAY)
}
const addMonths = (day: number, n: number) => {
  const p = ganttParts(day)
  return Math.round(Date.UTC(p.year, p.month + n, 1) / DAY)
}
/** Monday on or before `day`. */
const weekStart = (day: number) => day - ((ganttParts(day).weekday + 6) % 7)

export interface GanttSpan {
  task: MlGanttTask
  index: number
  start: number
  /** Inclusive. */
  end: number
}

/** Tasks with their day numbers (end ≥ start; milestones end where they start). Invalid dates are skipped. */
export function ganttSpans(tasks: MlGanttTask[]): GanttSpan[] {
  const out: GanttSpan[] = []
  tasks.forEach((task, index) => {
    const start = ganttDay(task.start)
    if (!Number.isFinite(start)) return
    let end = task.milestone ? start : ganttDay(task.end)
    if (!Number.isFinite(end)) end = start
    out.push({ task, index, start: Math.min(start, end), end: Math.max(start, end) })
  })
  return out
}

/** The visible range [from, to) around the tasks, padded and aligned to the scale. */
export function ganttRange(spans: { start: number; end: number }[], scale: MlGanttScale, fallback = ganttDay(new Date(2026, 0, 1))) {
  const lo = spans.length ? Math.min(...spans.map((s) => s.start)) : fallback
  const hi = spans.length ? Math.max(...spans.map((s) => s.end)) : fallback + 13
  if (scale === 'month') return { from: monthStart(lo), to: addMonths(hi, 1) }
  if (scale === 'week') return { from: weekStart(lo) - 7, to: weekStart(hi) + 14 }
  return { from: lo - 2, to: hi + 4 }
}

/** Default pixels per day for each scale. */
export const GANTT_DAY_WIDTH: Record<MlGanttScale, number> = { day: 32, week: 14, month: 4 }

export interface GanttTick extends GanttParts {
  day: number
  /** How many days the cell covers (clipped to the range). */
  days: number
}

function segments(from: number, to: number, unit: 'day' | 'week' | 'month' | 'year'): GanttTick[] {
  const out: GanttTick[] = []
  let d = from
  while (d < to) {
    let next: number
    if (unit === 'day') next = d + 1
    else if (unit === 'week') next = weekStart(d) + 7
    else if (unit === 'month') next = addMonths(d, 1)
    else {
      const p = ganttParts(d)
      next = Math.round(Date.UTC(p.year + 1, 0, 1) / DAY)
    }
    next = Math.min(next, to)
    out.push({ day: d, days: next - d, ...ganttParts(d) })
    d = next
  }
  return out
}

/** Header cells: a coarse top row (months, or years for the month scale) and a fine bottom row. */
export function ganttTicks(from: number, to: number, scale: MlGanttScale) {
  if (scale === 'month') return { top: segments(from, to, 'year'), bottom: segments(from, to, 'month') }
  return { top: segments(from, to, 'month'), bottom: segments(from, to, scale === 'week' ? 'week' : 'day') }
}

/** Saturdays and Sundays in [from, to). */
export function ganttWeekends(from: number, to: number) {
  const out: number[] = []
  for (let d = from; d < to; d++) {
    const w = ganttParts(d).weekday
    if (w === 0 || w === 6) out.push(d)
  }
  return out
}

/** Move a task by `delta` days. */
export function ganttMove(span: { start: number; end: number }, delta: number) {
  return { start: span.start + delta, end: span.end + delta }
}

/** Change a task's last day by `delta` days (never before its first day). */
export function ganttResize(span: { start: number; end: number }, delta: number) {
  return { start: span.start, end: Math.max(span.start, span.end + delta) }
}

export type GanttRow =
  | { kind: 'group'; key: string; label: string; count: number; start: number; end: number; collapsed: boolean }
  | { kind: 'task'; key: string; span: GanttSpan; group?: string }

/**
 * Display rows: tasks without a group first (in order), then each group (in
 * order of first appearance) with a header row and — unless collapsed — its tasks.
 */
export function ganttRows(spans: GanttSpan[], collapsed: string[] = []): GanttRow[] {
  const rows: GanttRow[] = spans.filter((s) => s.task.group === undefined || s.task.group === '').map((span) => ({ kind: 'task', key: span.task.id, span }))
  const groups = [...new Set(spans.map((s) => s.task.group).filter((g): g is string => !!g))]
  for (const g of groups) {
    const members = spans.filter((s) => s.task.group === g)
    const closed = collapsed.includes(g)
    rows.push({
      kind: 'group',
      key: `group:${g}`,
      label: g,
      count: members.length,
      start: Math.min(...members.map((s) => s.start)),
      end: Math.max(...members.map((s) => s.end)),
      collapsed: closed,
    })
    if (!closed) for (const span of members) rows.push({ kind: 'task', key: span.task.id, span, group: g })
  }
  return rows
}

/**
 * Finish → start connector: right out of the predecessor's end, then down and
 * into the successor's start. When the successor starts too early to fit the
 * elbow, the line loops back between the two rows.
 */
export function ganttLink(x1: number, y1: number, x2: number, y2: number, rowHeight: number, gap = 8) {
  const r = (n: number) => +n.toFixed(1)
  if (x2 - x1 >= gap * 2) return `M${r(x1)} ${r(y1)}H${r(x1 + gap)}V${r(y2)}H${r(x2)}`
  const ym = y1 + (y2 >= y1 ? 1 : -1) * (rowHeight / 2)
  return `M${r(x1)} ${r(y1)}H${r(x1 + gap)}V${r(ym)}H${r(x2 - gap)}V${r(y2)}H${r(x2)}`
}

/** A small arrowhead pointing right with its tip on (x, y). */
export function ganttArrow(x: number, y: number) {
  const r = (n: number) => +n.toFixed(1)
  return `M${r(x)} ${r(y)}l-6 -4v8Z`
}

/**
 * Keep a tooltip centred at `left` (timeline px) inside the visible part of the
 * scrolling timeline, so it never hides behind the frame's edge.
 */
export function ganttTipLeft(left: number, view: { scroll: number; width: number } | null, half = 92): number {
  if (!view || view.width <= half * 2) return left
  return Math.min(Math.max(left, view.scroll + half), view.scroll + view.width - half)
}
