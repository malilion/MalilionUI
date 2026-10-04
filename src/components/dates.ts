// Small date helpers for MlCalendar / MlDatePicker. Dates are compared by
// calendar day in local time; the time of day is ignored everywhere.

import type { MlLocale } from '../locale-data'

export function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export function sameDay(a: Date | null | undefined, b: Date | null | undefined) {
  return !!a && !!b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

export function addDays(date: Date, days: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)
}

/** Same day-of-month in another month, clamped (Jan 31 + 1 month → Feb 28/29). */
export function addMonths(date: Date, months: number) {
  const target = new Date(date.getFullYear(), date.getMonth() + months, 1)
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate()
  return new Date(target.getFullYear(), target.getMonth(), Math.min(date.getDate(), lastDay))
}

export function dayKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

/** 42 days (6 weeks) covering the month, starting on `weekStartsOn`. */
export function monthGrid(year: number, month: number, weekStartsOn: number) {
  const first = new Date(year, month, 1)
  const offset = (first.getDay() - weekStartsOn + 7) % 7
  const start = addDays(first, -offset)
  return Array.from({ length: 42 }, (_, i) => addDays(start, i))
}

/* ── Periods: month / quarter / year picking ─────────────
 * A period is identified by its first day (2026-10-01 for October 2026,
 * 2026-10-01 for 2026 Q4, 2026-01-01 for 2026). */

export type PeriodType = 'month' | 'quarter' | 'year'

/** Months per period. */
const SPAN: Record<PeriodType, number> = { month: 1, quarter: 3, year: 12 }

/** A running number for the period: consecutive periods differ by exactly 1. */
export function periodIndex(date: Date, type: PeriodType) {
  return Math.floor((date.getFullYear() * 12 + date.getMonth()) / SPAN[type])
}

/** First day of the period containing `date`. */
export function periodStart(date: Date, type: PeriodType) {
  const months = periodIndex(date, type) * SPAN[type]
  return new Date(Math.floor(months / 12), months % 12, 1)
}

/** Last day of the period containing `date`. */
export function periodEnd(date: Date, type: PeriodType) {
  const start = periodStart(date, type)
  return new Date(start.getFullYear(), start.getMonth() + SPAN[type], 0)
}

/** First day of the period `n` periods away. */
export function addPeriods(date: Date, type: PeriodType, n: number) {
  const months = (periodIndex(date, type) + n) * SPAN[type]
  return new Date(Math.floor(months / 12), months % 12, 1)
}

/** Negative / 0 / positive like a sort comparator, by period. */
export function comparePeriods(a: Date, b: Date, type: PeriodType) {
  return periodIndex(a, type) - periodIndex(b, type)
}

export function samePeriod(a: Date | null | undefined, b: Date | null | undefined, type: PeriodType) {
  return !!a && !!b && periodIndex(a, type) === periodIndex(b, type)
}

/** Stable key: "2026-10", "2026-Q4", "2026". */
export function periodKey(date: Date, type: PeriodType) {
  const y = date.getFullYear()
  if (type === 'year') return String(y)
  if (type === 'quarter') return `${y}-Q${Math.floor(date.getMonth() / 3) + 1}`
  return `${y}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

/** 1–4. */
export const quarterOf = (date: Date) => Math.floor(date.getMonth() / 3) + 1

/** First year of the decade containing `year` (2026 → 2020). */
export const decadeStart = (year: number, calendar?: MlCalendarSystem) =>
  calendar === 'roc' ? Math.floor(toRocYear(year) / 10) * 10 + ROC_OFFSET : Math.floor(year / 10) * 10

/**
 * The page a panel shows for `date`: the year for month / quarter panels,
 * the decade's first year for the year panel.
 */
export const periodPage = (date: Date, type: PeriodType, calendar?: MlCalendarSystem) =>
  type === 'year' ? decadeStart(date.getFullYear(), calendar) : date.getFullYear()

/** Cells of a page: 12 months, 4 quarters, or the decade plus one year either side (12). */
export function periodGrid(type: PeriodType, page: number) {
  if (type === 'month') return Array.from({ length: 12 }, (_, i) => new Date(page, i, 1))
  if (type === 'quarter') return Array.from({ length: 4 }, (_, i) => new Date(page, i * 3, 1))
  return Array.from({ length: 12 }, (_, i) => new Date(page - 1 + i, 0, 1))
}

/** Columns of the grid (rows wrap after this many cells). */
export const periodColumns = (type: PeriodType) => (type === 'quarter' ? 2 : 3)

/**
 * A period is disabled when it lies wholly outside [min, max] (compared by day),
 * or when `disabledDate` rejects its first day.
 */
export function periodDisabled(date: Date, type: PeriodType, min?: Date, max?: Date, disabledDate?: (date: Date) => boolean) {
  if (min && periodEnd(date, type) < startOfDay(min)) return true
  if (max && periodStart(date, type) > startOfDay(max)) return true
  return disabledDate?.(periodStart(date, type)) ?? false
}

/**
 * Display text of a period from the locale strings ("2026 年 10 月", "2026 Q4"…).
 * Pass `roc` (the locale's `date.roc`) for 民國: "民國 115 年 10 月".
 */
export function formatPeriod(date: Date, type: PeriodType, t: MlLocale['date']['period'], roc?: MlLocale['date']['roc']) {
  const [era, y] = roc ? rocParts(date.getFullYear(), roc) : ['', date.getFullYear()]
  const text = type === 'year' ? t.year(y) : type === 'quarter' ? t.quarter(y, quarterOf(date)) : t.month(y, date.getMonth() + 1)
  return era ? `${era} ${text}` : text
}

/** Title of a year panel's page ("2020 – 2029 年", "民國 110 – 119 年"). */
export function formatDecade(page: number, t: MlLocale['date']['period'], roc?: MlLocale['date']['roc']) {
  if (!roc) return t.decade(page, page + 9)
  const [era, from] = rocParts(page, roc)
  const [, to] = rocParts(page + 9, roc)
  // A page straddling 民國元年 has no tidy single-era label; fall back to Gregorian.
  return toRocYear(page) > 0 ? `${era} ${t.decade(from, to)}` : t.decade(page, page + 9)
}

/* ── 民國紀年 (Republic of China calendar) ───────────────── */

/** Which year numbering the pickers show: Gregorian (2026) or 民國 (115). */
export type MlCalendarSystem = 'gregory' | 'roc'

/** 民國元年 is 1912, so ROC year = Gregorian − 1911 (≤ 0 means 民國前). */
export const ROC_OFFSET = 1911
export const toRocYear = (year: number) => year - ROC_OFFSET
export const fromRocYear = (rocYear: number) => rocYear + ROC_OFFSET

/** Intl options with the ROC calendar mixed in when asked for. */
export function withCalendar(options: Intl.DateTimeFormatOptions, calendar?: MlCalendarSystem): Intl.DateTimeFormatOptions {
  return calendar === 'roc' ? { ...options, calendar: 'roc' } : options
}

/** Era prefix and the positive year number to show: 2026 → ['民國', 115], 1911 → ['民國前', 1]. */
export function rocParts(year: number, t: MlLocale['date']['roc']): [string, number] {
  const n = toRocYear(year)
  return n > 0 ? [t.era, n] : [t.before, 1 - n]
}

/** Year shown in a year-panel cell: "2026", or "115" / "前1" for 民國. */
export function yearCellText(year: number, calendar?: MlCalendarSystem) {
  if (calendar !== 'roc') return String(year)
  const n = toRocYear(year)
  return n > 0 ? String(n) : `前${1 - n}`
}
