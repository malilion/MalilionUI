// Waterfall, box plot and bullet chart maths (framework-free, shared by
// MlWaterfallChart / MlBoxPlot / MlBulletChart and their React twins).
import { niceScale, niceStep, zeroScale } from './charts'
import type { MlChartTone } from '../types'

/* ── Waterfall ───────────────────────────────────────── */

export interface MlWaterfallDatum {
  label: string
  /** A change (+ / −). For a total bar: an absolute amount that also resets the running total; leave it out to show the running total. */
  value?: number
  /** Draw the running total from zero (opening balance, subtotal, closing balance). */
  total?: boolean
}

export interface WaterfallBar {
  label: string
  kind: 'up' | 'down' | 'total'
  /** The change, or the amount for a total. */
  value: number
  /** Bottom and top of the bar in data units. */
  from: number
  to: number
  /** Running total after this bar. */
  running: number
}

export function waterfallLayout(data: MlWaterfallDatum[], ticks = 4) {
  let running = 0
  const bars: WaterfallBar[] = data.map((d) => {
    const v = Number.isFinite(d.value) ? (d.value as number) : 0
    if (d.total) {
      if (d.value !== undefined && Number.isFinite(d.value)) running = v
      return { label: d.label, kind: 'total', value: running, from: 0, to: running, running }
    }
    const from = running
    running += v
    return { label: d.label, kind: v < 0 ? 'down' : 'up', value: v, from, to: running, running }
  })
  const extent = bars.flatMap((b) => [b.from, b.to])
  return { bars, ...zeroScale(Math.min(0, ...extent), Math.max(0, ...extent), ticks) }
}

/* ── Box plot ────────────────────────────────────────── */

export interface MlBoxStats {
  min: number
  q1: number
  median: number
  q3: number
  max: number
  mean?: number
  outliers?: number[]
  count?: number
}

export interface MlBoxDatum {
  label: string
  /** Raw samples; the five-number summary is worked out from them. */
  values?: number[]
  /** Or a ready summary (min / max are the whisker ends). */
  stats?: MlBoxStats
  tone?: MlChartTone
}

/** Quantile of sorted numbers with linear interpolation (Excel QUARTILE.INC, R type 7). */
export function quantile(sorted: number[], p: number) {
  if (!sorted.length) return NaN
  const at = (sorted.length - 1) * p
  const lo = Math.floor(at)
  const hi = Math.ceil(at)
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (at - lo)
}

/**
 * Tukey's box: quartiles, whiskers to the furthest samples within `whisker` ×
 * IQR of the box, everything beyond as outliers. null without finite samples.
 */
export function boxStats(values: number[], whisker = 1.5): MlBoxStats | null {
  const sorted = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b)
  if (!sorted.length) return null
  const q1 = quantile(sorted, 0.25)
  const median = quantile(sorted, 0.5)
  const q3 = quantile(sorted, 0.75)
  const reach = (q3 - q1) * whisker
  const inside = sorted.filter((v) => v >= q1 - reach && v <= q3 + reach)
  return {
    min: inside[0],
    q1,
    median,
    q3,
    max: inside[inside.length - 1],
    mean: sorted.reduce((s, v) => s + v, 0) / sorted.length,
    outliers: sorted.filter((v) => v < q1 - reach || v > q3 + reach),
    count: sorted.length,
  }
}

export interface BoxItem {
  label: string
  stats: MlBoxStats | null
  tone?: MlChartTone
}

export function boxLayout(data: MlBoxDatum[], ticks = 5, whisker = 1.5) {
  const boxes: BoxItem[] = data.map((d) => ({ label: d.label, tone: d.tone, stats: d.stats ?? boxStats(d.values ?? [], whisker) }))
  const extent = boxes.flatMap((b) => (b.stats ? [b.stats.min, b.stats.max, ...(b.stats.outliers ?? [])] : []))
  return { boxes, ...niceScale(extent.length ? Math.min(...extent) : 0, extent.length ? Math.max(...extent) : 1, ticks) }
}

/* ── Bullet ──────────────────────────────────────────── */

export interface MlBulletDatum {
  label: string
  /** Second line under the label, e.g. the unit. */
  sublabel?: string
  value: number
  target?: number
  /** Upper bounds of the qualitative bands, low to high (e.g. [60, 80, 100] = poor / fair / good). */
  ranges?: number[]
  /** End of the scale. Defaults to a round number above everything else. */
  max?: number
  tone?: MlChartTone
}

export interface BulletRow {
  label: string
  sublabel?: string
  value: number
  target?: number
  max: number
  /** Percent positions on the scale. */
  valuePct: number
  targetPct?: number
  bands: { from: number; to: number }[]
  /** Index of the band the value falls in, or -1 without bands. */
  band: number
  ticks: number[]
  tone?: MlChartTone
}

/** A round step that lands exactly on `max` (5 → 0, 2.5, 5 rather than stopping at 4.5). */
function scaleStep(max: number, ticks: number) {
  const step = niceStep(max, ticks)
  const fits = (s: number) => Math.abs(max / s - Math.round(max / s)) < 1e-9
  if (fits(step)) return step
  const nice = (s: number) => [1, 2, 2.5, 5].some((m) => Math.abs(s / 10 ** Math.floor(Math.log10(s) + 1e-9) - m) < 1e-9)
  for (const n of [ticks, ticks - 1, ticks + 1, ticks - 2, ticks + 2, 2]) if (n >= 2 && nice(max / n)) return max / n
  return max
}

const pct = (v: number, max: number) => Math.max(0, Math.min(100, (v / (max || 1)) * 100))

export function bulletRows(data: MlBulletDatum[], ticks = 4): BulletRow[] {
  return data.map((d) => {
    const ranges = [...(d.ranges ?? [])].filter((r) => Number.isFinite(r)).sort((a, b) => a - b)
    const peak = Math.max(0, d.value, d.target ?? 0, ...ranges)
    const max = d.max ?? (peak > 0 ? niceStep(peak, ticks) * Math.ceil(peak / niceStep(peak, ticks) - 1e-9) : 1)
    const bounds = ranges.length && ranges[ranges.length - 1] < max ? [...ranges, max] : ranges
    const bands = bounds.map((to, i) => ({ from: pct(i ? bounds[i - 1] : 0, max), to: pct(to, max) }))
    const band = bounds.length ? bounds.findIndex((to) => d.value <= to) : -1
    const step = scaleStep(max, ticks)
    const marks: number[] = []
    for (let v = 0; v <= max + 1e-9; v += step) marks.push(+v.toFixed(10))
    return {
      label: d.label,
      sublabel: d.sublabel,
      value: d.value,
      target: d.target,
      max,
      valuePct: pct(d.value, max),
      targetPct: d.target === undefined ? undefined : pct(d.target, max),
      bands,
      band: band === -1 && bounds.length ? bounds.length - 1 : band,
      ticks: marks,
      tone: d.tone,
    }
  })
}
