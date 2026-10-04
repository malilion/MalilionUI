import type { MlChartTone } from '../types'

/** Gradient stops per tone, shared by the SVG charts. */
export const chartStops: Record<MlChartTone, [string, string]> = {
  gold: ['#ffd56a', '#d48f17'],
  tech: ['#7af6e2', '#0a9f89'],
  bean: ['#ffc2cf', '#f06d8c'],
  success: ['#8af0ae', '#22c264'],
  danger: ['#ff8f80', '#e5402d'],
  steel: ['#e3e7ed', '#77818f'],
}

/** Tones in the order charts hand them out to items without their own. */
export const tonePalette: MlChartTone[] = ['gold', 'tech', 'bean', 'steel', 'success', 'danger']

/** Default colours for multi-series charts, in order. */
export const seriesColors = ['#f0ad2f', '#3eeed0', '#ff8fa8', '#9ea7b5', '#52e38a', '#cd7631', '#ff5c48']

/**
 * A readable gridline step (…, 15, 20, 25, 30, 40, 50, 60, 80, 100, …) so that
 * `ticks` of them cover `span`.
 */
export function niceStep(span: number, ticks: number) {
  if (span <= 0) return 1
  const rawStep = span / ticks
  const magnitude = 10 ** Math.floor(Math.log10(rawStep))
  return ([1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find((m) => m * magnitude >= rawStep) ?? 10) * magnitude
}

/** Monotone cubic path through the points (no overshoot between samples). */
export function smoothPath(pts: { x: number; y: number }[]) {
  const n = pts.length
  if (n < 3) return pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
  const dx = pts.slice(1).map((p, i) => p.x - pts[i].x)
  const slope = pts.slice(1).map((p, i) => (p.y - pts[i].y) / (dx[i] || 1))
  const tangent = pts.map((_, i) => {
    if (i === 0) return slope[0]
    if (i === n - 1) return slope[n - 2]
    const a = slope[i - 1]
    const b = slope[i]
    return a * b <= 0 ? 0 : (3 * (dx[i - 1] + dx[i])) / ((2 * dx[i] + dx[i - 1]) / a + (dx[i] + 2 * dx[i - 1]) / b)
  })
  let d = `M${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i] / 3
    const c1 = { x: pts[i].x + h, y: pts[i].y + tangent[i] * h }
    const c2 = { x: pts[i + 1].x - h, y: pts[i + 1].y - tangent[i + 1] * h }
    d += ` C${c1.x.toFixed(1)} ${c1.y.toFixed(1)} ${c2.x.toFixed(1)} ${c2.y.toFixed(1)} ${pts[i + 1].x.toFixed(1)} ${pts[i + 1].y.toFixed(1)}`
  }
  return d
}

/* ── Scatter & funnel math (framework-free, shared by Vue and React) ── */

/**
 * Round axis bounds that cover [min, max] with readable gridlines. Unlike the
 * bar/line charts this does not force zero in, so clustered data fills the plot.
 */
export function niceScale(min: number, max: number, ticks = 5) {
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    min = 0
    max = 1
  }
  if (min > max) [min, max] = [max, min]
  if (min === max) {
    const pad = Math.abs(min) * 0.1 || 1
    min -= pad
    max += pad
  }
  // Free-range axes read best on 1 / 2 / 2.5 / 5 steps, so round niceStep's in-between ones up.
  const raw = niceStep(max - min, Math.max(1, ticks))
  const magnitude = 10 ** Math.floor(Math.log10(raw) + 1e-9)
  const mantissa = +(raw / magnitude).toFixed(6)
  const step = ({ 1.5: 2, 3: 5, 4: 5, 6: 10, 8: 10 } as Record<number, number>)[mantissa] * magnitude || raw
  const lo = +(Math.floor(min / step + 1e-9) * step).toFixed(10)
  const hi = +(Math.ceil(max / step - 1e-9) * step).toFixed(10)
  const values: number[] = []
  for (let v = lo; v <= hi + step / 2; v += step) values.push(+v.toFixed(10))
  return { lo, hi, step, values }
}

/** Least-squares line y = slope·x + intercept (null with fewer than two distinct x). */
export function linearFit(points: { x: number; y: number }[]) {
  const n = points.length
  if (n < 2) return null
  const mx = points.reduce((s, p) => s + p.x, 0) / n
  const my = points.reduce((s, p) => s + p.y, 0) / n
  let sxx = 0
  let sxy = 0
  let syy = 0
  for (const p of points) {
    sxx += (p.x - mx) ** 2
    sxy += (p.x - mx) * (p.y - my)
    syy += (p.y - my) ** 2
  }
  if (sxx === 0) return null
  const slope = sxy / sxx
  return { slope, intercept: my - slope * mx, r2: syy === 0 ? 1 : (sxy * sxy) / (sxx * syy) }
}

/** Bubble radius with the *area* proportional to the value (not the radius). */
export function bubbleRadius(value: number, min: number, max: number, range: [number, number]) {
  const [r0, r1] = range
  if (!(max > min)) return (r0 + r1) / 2
  const t = Math.min(1, Math.max(0, (value - min) / (max - min)))
  return Math.sqrt(r0 * r0 + t * (r1 * r1 - r0 * r0))
}

/** Index of the point closest to (px, py), or -1 when none lies within `maxDistance`. */
export function nearestIndex(points: { x: number; y: number }[], px: number, py: number, maxDistance = Infinity) {
  let best = -1
  let bestD = maxDistance * maxDistance
  points.forEach((p, i) => {
    const d = (p.x - px) ** 2 + (p.y - py) ** 2
    if (d <= bestD) {
      best = i
      bestD = d
    }
  })
  return best
}

/** A diamond (rotated square) marker centred on (cx, cy). */
export function diamondPath(cx: number, cy: number, r: number) {
  const f = (n: number) => n.toFixed(1)
  return `M${f(cx)} ${f(cy - r)}L${f(cx + r)} ${f(cy)}L${f(cx)} ${f(cy + r)}L${f(cx - r)} ${f(cy)}Z`
}

/** 0.625 → "62.5%", 1 → "100%". */
export function percentText(ratio: number) {
  return `${+(ratio * 100).toFixed(1)}%`
}

export interface FunnelStage {
  label: string
  value: number
  tone?: MlChartTone
  /** value ÷ previous stage (1 for the first stage). */
  fromPrev: number
  /** value ÷ first stage. */
  fromFirst: number
  /** How many were lost since the previous stage. */
  drop: number
  /** Shape width as a share of the widest stage, 0–1 (never thinner than `minWidth`). */
  width: number
}

/** Conversion figures and shape widths for a funnel. */
export function funnelStages(data: { label: string; value: number; tone?: MlChartTone }[], minWidth = 0.06): FunnelStage[] {
  const ratio = (a: number, b: number) => (b > 0 ? Math.max(0, a) / b : 0)
  const first = data[0]?.value ?? 0
  const max = Math.max(0, ...data.map((d) => d.value))
  return data.map((d, i) => ({
    label: d.label,
    value: d.value,
    tone: d.tone,
    fromPrev: i ? ratio(d.value, data[i - 1].value) : 1,
    fromFirst: ratio(d.value, first),
    drop: i ? data[i - 1].value - d.value : 0,
    width: max > 0 ? Math.max(minWidth, Math.max(0, d.value) / max) : minWidth,
  }))
}

/* ── Multi-series bar math (framework-free, shared by Vue and React) ── */

export type BarMode = 'grouped' | 'stacked' | 'percent'

export interface BarSegment {
  /** Index into the series array. */
  series: number
  value: number
  /** value ÷ the category's positive total (0 for negatives). */
  share: number
  /** Where the bar starts and ends on the value axis (a 0–1 ratio in percent mode). */
  from: number
  to: number
}

export interface BarCategory {
  segments: BarSegment[]
  /** Sum of the visible values. */
  total: number
  /** Axis value of the bar's top edge — where a total label sits. */
  top: number
}

/**
 * A zero-anchored axis with round steps: at least `ticks` steps, and zero is
 * always a gridline so positive and negative bars share one baseline.
 */
export function zeroScale(min: number, max: number, ticks = 4) {
  const lo0 = Math.min(0, Number.isFinite(min) ? min : 0)
  const hi0 = Math.max(0, Number.isFinite(max) ? max : 0)
  const step = niceStep(hi0 - lo0 || 1, Math.max(1, ticks))
  const lo = +(Math.floor(lo0 / step + 1e-9) * step).toFixed(10)
  const hi = +Math.max(lo + step * ticks, Math.ceil(hi0 / step - 1e-9) * step).toFixed(10)
  const values: number[] = []
  for (let v = lo; v <= hi + step / 2; v += step) values.push(+v.toFixed(10))
  return { lo, hi, step, values }
}

/**
 * Bar extents per category for grouped, stacked (positives up, negatives down
 * from zero) and 100%-stacked bars, plus the axis that fits them. Hidden series
 * are left out; with every series hidden the axis still covers all of them.
 */
export function barLayout(series: number[][], count: number, mode: BarMode, visible: boolean[] = [], ticks = 4) {
  const on = series.map((_, i) => visible[i] !== false)
  const build = (use: boolean[]) =>
    Array.from({ length: count }, (_, c): BarCategory => {
      const idx = series.map((_, i) => i).filter((i) => use[i])
      const values = idx.map((i) => (Number.isFinite(series[i][c]) ? series[i][c] : 0))
      const positive = values.reduce((s, v) => s + Math.max(0, v), 0)
      const total = values.reduce((s, v) => s + v, 0)
      let up = 0
      let down = 0
      const segments = idx.map((i, k): BarSegment => {
        const value = values[k]
        const share = positive > 0 ? Math.max(0, value) / positive : 0
        if (mode === 'grouped') return { series: i, value, share, from: 0, to: value }
        if (mode === 'percent') {
          const from = up
          up += share
          return { series: i, value, share, from, to: up }
        }
        if (value >= 0) {
          const from = up
          up += value
          return { series: i, value, share, from, to: up }
        }
        const from = down
        down += value
        return { series: i, value, share, from, to: down }
      })
      const top = mode === 'percent' ? (positive > 0 ? 1 : 0) : mode === 'stacked' ? up : Math.max(0, ...values)
      return { segments, total, top }
    })
  const categories = build(on)
  if (mode === 'percent') {
    const step = 1 / Math.max(1, ticks)
    const values = Array.from({ length: Math.max(1, ticks) + 1 }, (_, i) => +(i * step).toFixed(10))
    return { categories, lo: 0, hi: 1, step, values }
  }
  const extent = (on.some(Boolean) ? categories : build(series.map(() => true))).flatMap((c) => c.segments.flatMap((s) => [s.from, s.to]))
  return { categories, ...zeroScale(Math.min(0, ...extent), Math.max(0, ...extent), ticks) }
}
