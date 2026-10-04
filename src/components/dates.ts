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
export const decadeStart = (year: number) => Math.floor(year / 10) * 10

/**
 * The page a panel shows for `date`: the year for month / quarter panels,
 * the decade's first year for the year panel.
 */
export const periodPage = (date: Date, type: PeriodType) => (type === 'year' ? decadeStart(date.getFullYear()) : date.getFullYear())

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

/** Display text of a period from the locale strings ("2026 年 10 月", "2026 Q4"…). */
export function formatPeriod(date: Date, type: PeriodType, t: MlLocale['date']['period']) {
  const y = date.getFullYear()
  if (type === 'year') return t.year(y)
  if (type === 'quarter') return t.quarter(y, quarterOf(date))
  return t.month(y, date.getMonth() + 1)
}
