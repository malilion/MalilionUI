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
