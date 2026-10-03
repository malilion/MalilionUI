<script setup lang="ts">
import { computed, useId } from 'vue'
import { chartStops } from './charts'
import type { MlChartTone } from '../types'

const props = withDefaults(
  defineProps<{
    value: number
    min?: number
    max?: number
    /** Shown after the number, e.g. "%" or "ms". */
    unit?: string
    /** Caption under the number. */
    label?: string
    /** Rendered width in px. */
    size?: number
    tone?: MlChartTone
    /** Colour bands: from each threshold upward, e.g. [{ from: 70, tone: 'gold' }, { from: 90, tone: 'danger' }]. */
    bands?: { from: number; tone: MlChartTone }[]
    /** Major tick count around the dial. */
    ticks?: number
    format?: (value: number) => string
  }>(),
  { min: 0, max: 100, size: 220, tone: 'gold', ticks: 5 },
)

// A 240° dial opening at the bottom.
const START = -210
const SWEEP = 240
const C = 100
const R = 78

const clamp = (v: number) => Math.min(props.max, Math.max(props.min, v))
const ratio = computed(() => (clamp(props.value) - props.min) / (props.max - props.min || 1))
const fmt = (v: number) => (props.format ? props.format(v) : Math.round(v).toLocaleString())

const polar = (deg: number, r: number) => {
  const a = (deg * Math.PI) / 180
  return { x: C + Math.cos(a) * r, y: C + Math.sin(a) * r }
}

function arc(from: number, to: number, r: number) {
  const a = polar(START + SWEEP * from, r)
  const b = polar(START + SWEEP * to, r)
  const large = SWEEP * (to - from) > 180 ? 1 : 0
  return `M${a.x.toFixed(2)} ${a.y.toFixed(2)}A${r} ${r} 0 ${large} 1 ${b.x.toFixed(2)} ${b.y.toFixed(2)}`
}

const toneNow = computed<MlChartTone>(() => {
  const v = clamp(props.value)
  let tone = props.tone
  for (const band of [...(props.bands ?? [])].sort((a, b) => a.from - b.from)) if (v >= band.from) tone = band.tone
  return tone
})

const track = arc(0, 1, R)
const valuePath = computed(() => arc(0, Math.max(0.0001, ratio.value), R))
const needle = computed(() => polar(START + SWEEP * ratio.value, R - 30))
const tickMarks = computed(() =>
  Array.from({ length: props.ticks + 1 }, (_, i) => {
    const t = i / props.ticks
    const deg = START + SWEEP * t
    return { a: polar(deg, R + 9), b: polar(deg, R + 14), lab: polar(deg, R - 16), text: fmt(props.min + (props.max - props.min) * t) }
  }),
)
const bandArcs = computed(() =>
  (props.bands ?? []).map((band, i, all) => {
    const from = (clamp(band.from) - props.min) / (props.max - props.min || 1)
    const nextFrom = all.filter((b) => b.from > band.from).sort((a, b) => a.from - b.from)[0]?.from ?? props.max
    const to = (clamp(nextFrom) - props.min) / (props.max - props.min || 1)
    return { d: arc(from, to, R + 11), color: chartStops[band.tone][1], key: i }
  }),
)
const uid = `ml-gauge-${useId()}`
</script>

<template>
  <figure :class="['ml-gauge', `ml-gauge--${toneNow}`]" :style="{ '--_size': `${size}px` }">
    <svg
      viewBox="0 0 200 172"
      :width="size"
      :height="size * 0.86"
      role="meter"
      :aria-valuenow="value"
      :aria-valuemin="min"
      :aria-valuemax="max"
      :aria-valuetext="`${fmt(value)}${unit ?? ''}`"
      :aria-label="label"
    >
      <defs>
        <linearGradient :id="uid" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" :stop-color="chartStops[toneNow][1]" />
          <stop offset="1" :stop-color="chartStops[toneNow][0]" />
        </linearGradient>
      </defs>
      <path v-for="b in bandArcs" :key="b.key" :d="b.d" class="ml-gauge__band" :stroke="b.color" />
      <g class="ml-gauge__ticks">
        <line v-for="(t, i) in tickMarks" :key="i" :x1="t.a.x" :y1="t.a.y" :x2="t.b.x" :y2="t.b.y" />
      </g>
      <path :d="track" class="ml-gauge__track" />
      <path :d="valuePath" class="ml-gauge__bar" :stroke="`url(#${uid})`" pathLength="1" />
      <line :x1="C" :y1="C" :x2="needle.x" :y2="needle.y" class="ml-gauge__needle" />
      <circle :cx="C" :cy="C" r="6" class="ml-gauge__hub" />
      <text v-for="(t, i) in tickMarks" :key="`t${i}`" :x="t.lab.x" :y="t.lab.y" text-anchor="middle" dominant-baseline="middle" class="ml-gauge__tick-label">{{ t.text }}</text>
    </svg>
    <figcaption class="ml-gauge__readout" aria-hidden="true">
      <span class="ml-gauge__value">{{ fmt(value) }}<small v-if="unit">{{ unit }}</small></span>
      <span v-if="label" class="ml-gauge__label">{{ label }}</span>
    </figcaption>
  </figure>
</template>
