// Relative times ("3 分鐘前" / "3 minutes ago") shared by MlComments and MlInbox
// and their React twins. Framework-free; Intl does the wording.

/** A moment: a Date, epoch milliseconds, or an ISO string. */
export type MlTimeInput = Date | number | string

/** Epoch ms of a time input (NaN when it cannot be read). */
export function toEpoch(time: MlTimeInput): number {
  if (time instanceof Date) return time.getTime()
  if (typeof time === 'number') return time
  return Date.parse(time)
}

/** ISO string for a `<time datetime>`, or undefined for unreadable input. */
export function toIso(time: MlTimeInput): string | undefined {
  const t = toEpoch(time)
  return Number.isFinite(t) ? new Date(t).toISOString() : undefined
}

const SECOND = 1000
const MINUTE = 60 * SECOND
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

const UNITS: [Intl.RelativeTimeFormatUnit, number, number][] = [
  // unit, size, switch to the next unit at this many
  ['minute', MINUTE, 60],
  ['hour', HOUR, 24],
  ['day', DAY, 7],
  ['week', 7 * DAY, 5],
  ['month', 30 * DAY, 12],
  ['year', 365 * DAY, Infinity],
]

const formatters = new Map<string, Intl.RelativeTimeFormat>()
function formatter(lang: string) {
  let f = formatters.get(lang)
  if (!f) {
    f = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' })
    formatters.set(lang, f)
  }
  return f
}

/** The unit and whole count a gap of `diff` ms is shown in (negative = past). */
export function relativeUnit(diff: number): { value: number; unit: Intl.RelativeTimeFormatUnit } | null {
  const abs = Math.abs(diff)
  if (abs < 45 * SECOND) return null
  for (const [unit, size, next] of UNITS) {
    const value = Math.round(abs / size)
    if (value < next) return { value: Math.sign(diff) * Math.max(1, value), unit }
  }
  return null
}

/**
 * "3 分鐘前" / "3 minutes ago" for `time` as seen at `now`. Under 45 seconds
 * either way reads `justNow` ("剛剛"). `lang` is a BCP 47 tag (the locale's name).
 */
export function relativeTime(time: MlTimeInput, now: MlTimeInput, lang: string, justNow: string): string {
  const t = toEpoch(time)
  const n = toEpoch(now)
  if (!Number.isFinite(t) || !Number.isFinite(n)) return ''
  const r = relativeUnit(t - n)
  if (!r) return justNow
  return formatter(lang).format(r.value, r.unit)
}

/** Whole calendar days between two moments in local time (0 = same day, 1 = `time` was yesterday). */
export function daysAgo(time: MlTimeInput, now: MlTimeInput): number {
  const a = new Date(toEpoch(time))
  const b = new Date(toEpoch(now))
  const day = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())
  return Math.round((day(b) - day(a)) / DAY)
}
