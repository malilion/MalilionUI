<script setup lang="ts">
import { computed } from 'vue'
import { chartStops, seriesColors } from './charts'
import type { MlChartTone } from '../types'

const props = withDefaults(
  defineProps<{
    /** One axis per indicator; `max` sets its scale (default: the largest value on that axis). */
    indicators: { label: string; max?: number }[]
    series: { name: string; values: number[]; tone?: MlChartTone; color?: string }[]
    /** Rendered width/height in px. */
    size?: number
    /** Number of grid rings. */
    rings?: number
    /** Polygon grid (true) or circles. */
    polygon?: boolean
    /** Show the legend (on by default with more than one series). */
    legend?: boolean
    format?: (value: number) => string
    /** Accessible summary of the chart. */
    label?: string
  }>(),
  { size: 280, rings: 4, polygon: true, legend: undefined },
)

const fmt = (v: number) => (props.format ? props.format(v) : v.toLocaleString())
// Leave room around the plot for the axis labels.
const C = 150
const R = 104
const n = computed(() => props.indicators.length)

const maxes = computed(() =>
  props.indicators.map((ind, i) => ind.max ?? Math.max(1, ...props.series.map((s) => s.values[i] ?? 0))),
)

const angle = (i: number) => -Math.PI / 2 + (2 * Math.PI * i) / n.value
const point = (i: number, r: number) => ({ x: C + Math.cos(angle(i)) * r, y: C + Math.sin(angle(i)) * r })

const grid = computed(() =>
  Array.from({ length: props.rings }, (_, k) => {
    const r = (R * (k + 1)) / props.rings
    return props.polygon
      ? { kind: 'poly' as const, points: props.indicators.map((_, i) => point(i, r)).map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' '), r }
      : { kind: 'circle' as const, points: '', r }
  }),
)

const axes = computed(() =>
  props.indicators.map((ind, i) => {
    const end = point(i, R)
    const lab = point(i, R + 18)
    const cos = Math.cos(angle(i))
    return {
      end,
      lab,
      anchor: Math.abs(cos) < 0.2 ? 'middle' : cos > 0 ? 'start' : 'end',
      text: ind.label,
    }
  }),
)

const shapes = computed(() =>
  props.series.map((s, k) => {
    const color = s.color ?? (s.tone ? chartStops[s.tone][0] : seriesColors[k % seriesColors.length])
    const pts = props.indicators.map((_, i) => point(i, (Math.min(s.values[i] ?? 0, maxes.value[i]) / maxes.value[i]) * R))
    return { name: s.name, color, pts, values: s.values, points: pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') }
  }),
)

const showLegend = computed(() => props.legend ?? props.series.length > 1)
const summary = computed(
  () =>
    props.label ??
    props.series
      .map((s) => `${s.name}：${props.indicators.map((ind, i) => `${ind.label} ${fmt(s.values[i] ?? 0)}`).join('、')}`)
      .join('；'),
)
</script>

<template>
  <figure class="ml-radar">
    <svg viewBox="0 0 300 300" :width="size" :height="size" role="img" :aria-label="summary">
      <g class="ml-radar__grid">
        <template v-for="g in grid" :key="g.r">
          <polygon v-if="g.kind === 'poly'" :points="g.points" />
          <circle v-else :cx="C" :cy="C" :r="g.r" />
        </template>
        <line v-for="(a, i) in axes" :key="i" :x1="C" :y1="C" :x2="a.end.x" :y2="a.end.y" />
      </g>
      <text
        v-for="(a, i) in axes"
        :key="`l${i}`"
        :x="a.lab.x"
        :y="a.lab.y"
        :text-anchor="a.anchor"
        dominant-baseline="middle"
        class="ml-radar__label"
      >{{ a.text }}</text>
      <g v-for="(s, k) in shapes" :key="s.name" class="ml-radar__series" :style="{ '--_i': k, color: s.color }">
        <polygon :points="s.points" class="ml-radar__area" />
        <circle v-for="(p, i) in s.pts" :key="i" :cx="p.x" :cy="p.y" r="3" class="ml-radar__dot">
          <title>{{ s.name }} · {{ indicators[i].label }}：{{ fmt(s.values[i] ?? 0) }}</title>
        </circle>
      </g>
    </svg>
    <figcaption v-if="showLegend" class="ml-radar__legend" aria-hidden="true">
      <span v-for="s in shapes" :key="s.name"><i :style="{ background: s.color, color: s.color }" />{{ s.name }}</span>
    </figcaption>
  </figure>
</template>
