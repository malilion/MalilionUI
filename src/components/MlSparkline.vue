<script setup lang="ts">
import { computed, useId } from 'vue'
import { chartStops } from './charts'
import type { MlChartTone } from '../types'

const props = withDefaults(
  defineProps<{
    data: number[]
    width?: number
    height?: number
    tone?: MlChartTone
    /** Fill the area under the line. */
    area?: boolean
    /** Accessible description; without it the sparkline is decoration. */
    title?: string
  }>(),
  { width: 120, height: 36, tone: 'gold', area: true },
)

const gradientId = `ml-spark-${useId()}`
const PAD = 3

const points = computed(() => {
  const values = props.data.length ? props.data : [0]
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const stepX = values.length > 1 ? (props.width - PAD * 2) / (values.length - 1) : 0
  return values.map((v, i) => ({
    x: PAD + i * stepX,
    y: PAD + (1 - (v - min) / span) * (props.height - PAD * 2),
  }))
})

const line = computed(() => points.value.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' '))
const fill = computed(() => {
  const pts = points.value
  return `${line.value} L${pts[pts.length - 1].x.toFixed(1)} ${props.height} L${pts[0].x.toFixed(1)} ${props.height} Z`
})
const last = computed(() => points.value[points.value.length - 1])
</script>

<template>
  <svg
    :class="['ml-sparkline', `ml-sparkline--${tone}`]"
    :viewBox="`0 0 ${width} ${height}`"
    :width="width"
    :height="height"
    :role="title ? 'img' : undefined"
    :aria-label="title"
    :aria-hidden="title ? undefined : 'true'"
  >
    <defs>
      <linearGradient :id="gradientId" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" :stop-color="chartStops[tone][0]" stop-opacity="0.45" />
        <stop offset="1" :stop-color="chartStops[tone][1]" stop-opacity="0" />
      </linearGradient>
    </defs>
    <path v-if="area" :d="fill" :fill="`url(#${gradientId})`" class="ml-sparkline__area" />
    <path :d="line" pathLength="1" class="ml-sparkline__line" fill="none" :stroke="chartStops[tone][0]" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round" />
    <circle :cx="last.x" :cy="last.y" r="2.6" :fill="chartStops[tone][0]" class="ml-sparkline__dot" />
  </svg>
</template>
