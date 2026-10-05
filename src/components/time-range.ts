// Time-of-day range helpers shared by MlTimeRangePicker and the React TimeRangePicker:
// duration, overnight handling, bounds and form validation.
import type { MlFormRule } from '../form-rules'
import { zhTW, type MlLocale } from '../locale-data'
import { parseTime, toSeconds, type TimeParts } from './time'

/** [start, end] as "HH:mm" (or "HH:mm:ss"); either end may still be unset. */
export type MlTimeRange = [string | null, string | null]

export interface MlTimeRangePreset {
  label: string
  /** The range itself, or a function returning it. */
  value: MlTimeRange | (() => MlTimeRange)
}

export interface TimeRangeOptions {
  /** Earliest allowed time for either end, "HH:mm" or "HH:mm:ss". */
  min?: string
  /** Latest allowed time for either end, "HH:mm" or "HH:mm:ss". */
  max?: string
  /** An end earlier than the start means the next day. */
  allowOvernight?: boolean
}

/** Why a range fails; see validateTimeRange(). */
export type TimeRangeIssue = 'incomplete' | 'order' | 'same' | 'min' | 'max'

export const SECONDS_PER_DAY = 86_400

/** Seconds of the day → { h, m, s }. */
export const fromSeconds = (sec: number): TimeParts => ({ h: Math.floor(sec / 3600), m: Math.floor((sec % 3600) / 60), s: sec % 60 })

const secondsOf = (value: string | null | undefined) => {
  const t = parseTime(value)
  return t ? toSeconds(t) : null
}

/** Inclusive [min, max] bounds in seconds of the day. */
export function timeBounds(min?: string, max?: string): [number, number] {
  return [secondsOf(min) ?? 0, secondsOf(max) ?? SECONDS_PER_DAY - 1]
}

/** True when the end lies on the next day (an overnight range is allowed and end < start). */
export function isOvernight(range: MlTimeRange, allowOvernight = false) {
  const a = secondsOf(range[0])
  const b = secondsOf(range[1])
  return allowOvernight && a !== null && b !== null && b < a
}

/**
 * Length of the range in seconds; null while an end is missing, or when the
 * end isn't after the start (and overnight ranges aren't allowed).
 */
export function timeRangeSeconds(range: MlTimeRange, allowOvernight = false): number | null {
  const a = secondsOf(range[0])
  const b = secondsOf(range[1])
  if (a === null || b === null || a === b) return null
  if (b > a) return b - a
  return allowOvernight ? b + SECONDS_PER_DAY - a : null
}

/** "共 9 小時", "共 1 小時 30 分" (or the active locale's wording). */
export function formatTimeRangeDuration(seconds: number, locale: MlLocale = zhTW) {
  const { h, m, s } = fromSeconds(Math.max(0, Math.round(seconds)))
  return locale.timeRange.duration(h, m, s)
}

/** The first problem with a range, or null when it's fine. A fully empty range passes. */
export function validateTimeRange(range: MlTimeRange | null | undefined, options: TimeRangeOptions = {}): TimeRangeIssue | null {
  const [startText, endText] = range ?? [null, null]
  if (!startText && !endText) return null
  const a = secondsOf(startText)
  const b = secondsOf(endText)
  if (a === null || b === null) return 'incomplete'
  const [lo, hi] = timeBounds(options.min, options.max)
  if (a < lo || b < lo) return 'min'
  if (a > hi || b > hi) return 'max'
  if (a === b) return 'same'
  if (b < a && !options.allowOvernight) return 'order'
  return null
}

/**
 * The lowest end the end wheels may reach: anything after the start (one step
 * later), unless overnight ranges are allowed.
 */
export function endFloor(start: string | null, options: TimeRangeOptions & { seconds?: boolean; minuteStep?: number; secondStep?: number } = {}) {
  const [lo] = timeBounds(options.min, options.max)
  const a = secondsOf(start)
  if (options.allowOvernight || a === null) return lo
  const step = options.seconds ? Math.max(1, options.secondStep ?? 1) : Math.max(1, options.minuteStep ?? 1) * 60
  return Math.max(lo, a + step)
}

/**
 * The value after one end changes. Without overnight ranges an end that's no
 * longer after the start is dropped, so the field never holds a backwards range.
 */
export function setTimeRangeEnd(range: MlTimeRange, which: 0 | 1, value: string | null, allowOvernight = false): MlTimeRange {
  const next: MlTimeRange = which === 0 ? [value, range[1]] : [range[0], value]
  if (allowOvernight) return next
  const a = secondsOf(next[0])
  const b = secondsOf(next[1])
  if (a !== null && b !== null && b <= a) return which === 0 ? [next[0], null] : [null, next[1]]
  return next
}

/**
 * Ready-made MlForm rules for a time range: `required` (both ends), complete,
 * in order and inside min / max. Messages follow the active locale.
 */
export function timeRangeRules(options: TimeRangeOptions & { required?: boolean } = {}): MlFormRule[] {
  const check = (issue: TimeRangeIssue, message: (t: MlLocale['timeRange']['errors']) => string): MlFormRule => ({
    validator: (value) => validateTimeRange(value as MlTimeRange, options) !== issue,
    message: (locale) => message(locale.timeRange.errors),
  })
  const rules: MlFormRule[] = [
    check('incomplete', (t) => t.incomplete),
    check('min', (t) => t.min(options.min ?? '')),
    check('max', (t) => t.max(options.max ?? '')),
    check('same', (t) => t.same),
    check('order', (t) => t.order),
  ]
  if (options.required) {
    rules.unshift({
      validator: (value) => {
        const [a, b] = (value as MlTimeRange | null) ?? [null, null]
        return !!(a || b)
      },
      message: (locale) => locale.form.required,
    })
  }
  return rules
}
