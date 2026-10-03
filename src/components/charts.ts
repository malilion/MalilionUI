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
