// Candlestick (K-line) maths (framework-free, shared by MlCandlestick and the React <Candlestick>).
import { niceScale } from './charts'

export interface MlCandle {
  /** Date, timestamp (ms) or date string; 'YYYY-MM-DD' is read as a local date. */
  time: Date | string | number
  open: number
  high: number
  low: number
  close: number
  volume?: number
}

/** Which colour rising candles get. Taiwan / China / Japan: red; US / Europe: green. */
export type MlCandleUpColor = 'red' | 'green'

/** A visible window: `count` candles from index `start`. */
export interface CandleRange {
  start: number
  count: number
}

/** Candle time → timestamp (ms). */
export function candleTime(t: MlCandle['time']): number {
  if (typeof t === 'number') return t
  if (typeof t === 'string') {
    const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(t.trim())
    if (m) return new Date(+m[1], +m[2] - 1, +m[3]).getTime()
    return new Date(t).getTime()
  }
  return t.getTime()
}

const formatters = new Map<number, Intl.NumberFormat>()
/** Thousands separators and a fixed number of decimals (formatters are cached: charts format hundreds of numbers per frame). */
export function formatPrice(value: number, decimals: number) {
  let f = formatters.get(decimals)
  if (!f) formatters.set(decimals, (f = new Intl.NumberFormat(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })))
  return f.format(value)
}

/** Decimals used by the data's prices (at most 4), from the first `sample` candles. */
export function priceDecimals(candles: MlCandle[], sample = 60) {
  let d = 0
  for (const c of candles.slice(0, sample)) for (const v of [c.open, c.close]) d = Math.max(d, (String(v).split('.')[1] ?? '').length)
  return Math.min(4, d)
}

/** Decimals of an axis step (0.25 → 2). */
export function stepDecimals(step: number) {
  return Math.min(4, (String(step).split('.')[1] ?? '').length)
}

/** Width (px) of the right-hand price axis that fits its labels. */
export function axisWidth(labels: string[]) {
  const longest = Math.max(0, ...labels.map((l) => l.length))
  return Math.min(140, Math.max(48, Math.round(longest * 6.6 + 16)))
}

/** Simple moving average of the closes; null until `period` values are in. */
export function movingAverage(values: number[], period: number): (number | null)[] {
  const n = Math.max(1, Math.floor(period))
  const out: (number | null)[] = []
  let sum = 0
  values.forEach((v, i) => {
    sum += v
    if (i >= n) sum -= values[i - n]
    out.push(i >= n - 1 ? +(sum / n).toFixed(10) : null)
  })
  return out
}

/** Keep a window inside the data: at least `min` candles (or all of them), never past either end. */
export function clampRange(range: CandleRange, total: number, min = 8): CandleRange {
  if (total <= 0) return { start: 0, count: 0 }
  const count = Math.min(total, Math.max(Math.min(min, total), Math.round(range.count) || 0))
  const start = Math.min(total - count, Math.max(0, Math.round(range.start) || 0))
  return { start, count }
}

/** The last `count` candles. */
export function initialRange(total: number, count: number, min = 8): CandleRange {
  return clampRange({ start: total - count, count }, total, min)
}

/**
 * Zoom by `factor` (< 1 zooms in) keeping the candle under `anchor` (0 = left
 * edge, 1 = right edge of the window) in place.
 */
export function zoomRange(range: CandleRange, factor: number, total: number, anchor = 1, min = 8): CandleRange {
  const a = Math.min(1, Math.max(0, anchor))
  const count = Math.round(range.count * factor)
  // Always move at least one candle so small windows can still zoom.
  const next = count === range.count ? range.count + (factor < 1 ? -1 : 1) : count
  const pivot = range.start + a * range.count
  return clampRange({ start: pivot - a * next, count: next }, total, min)
}

/** Shift the window by `delta` candles (positive = later). */
export function panRange(range: CandleRange, delta: number, total: number, min = 8): CandleRange {
  return clampRange({ start: range.start + delta, count: range.count }, total, min)
}

/** Price axis for the visible candles (and any moving-average values), with round gridlines. */
export function priceScale(candles: MlCandle[], extra: (number | null)[] = [], ticks = 5) {
  const values = [...candles.flatMap((c) => [c.high, c.low]), ...extra.filter((v): v is number => v !== null && Number.isFinite(v))]
  if (!values.length) return niceScale(0, 1, ticks)
  return niceScale(Math.min(...values), Math.max(...values), ticks)
}

/** Volume axis: 0 → a round number above the biggest bar. */
export function volumeScale(candles: MlCandle[]) {
  const max = Math.max(0, ...candles.map((c) => c.volume ?? 0))
  return max > 0 ? niceScale(0, max, 2).hi : 1
}

/** Change against the previous close (the open for the first candle). */
export function candleChange(candles: MlCandle[], i: number) {
  const c = candles[i]
  if (!c) return { change: 0, percent: 0 }
  const prev = i > 0 ? candles[i - 1].close : c.open
  const change = +(c.close - prev).toFixed(10)
  return { change, percent: prev ? (change / prev) * 100 : 0 }
}

/** Indexes in the window to label on the time axis, about `every` px apart. */
export function timeTicks(range: CandleRange, step: number, every = 72) {
  const k = Math.max(1, Math.ceil(every / Math.max(1e-6, step)))
  const out: number[] = []
  for (let i = range.start; i < range.start + range.count; i++) if (i % k === 0) out.push(i)
  return out
}

/** Whether candles are closer than a day apart (then times show hours). */
export function isIntraday(times: number[]) {
  for (let i = 1; i < times.length; i++) if (Math.abs(times[i] - times[i - 1]) < 86_400_000 - 3_600_000) return true
  return false
}

/** Short axis label: '3/2' for daily candles, '09:30' intraday (with the date when the day changes). */
export function candleTimeLabel(ms: number, intraday: boolean, prev?: number) {
  const d = new Date(ms)
  const date = `${d.getMonth() + 1}/${d.getDate()}`
  if (!intraday) return date
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  if (prev === undefined) return time
  const p = new Date(prev)
  return p.getDate() !== d.getDate() || p.getMonth() !== d.getMonth() ? date : time
}

/** Full label for the legend and data table: '2026/3/2' or '2026/3/2 09:30'. */
export function candleTimeText(ms: number, intraday: boolean) {
  const d = new Date(ms)
  const date = `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`
  return intraday ? `${date} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` : date
}
