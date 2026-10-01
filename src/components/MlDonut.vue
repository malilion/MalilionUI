<script setup lang="ts">
import { computed } from 'vue'
import { seriesColors } from './charts'
import type { MlChartDatum } from '../types'

const props = withDefaults(
  defineProps<{
    data: MlChartDatum[]
    size?: number
    thickness?: number
    /** Big text in the middle, e.g. the total. */
    title?: string
    caption?: string
    legend?: boolean
    label?: string
  }>(),
  { size: 160, thickness: 12, legend: true },
)

const total = computed(() => props.data.reduce((sum, d) => sum + Math.max(0, d.value), 0))
const radius = computed(() => 50 - props.thickness / 2 - 1)
const circumference = computed(() => 2 * Math.PI * radius.value)
const GAP = 1.2 // small gap between segments, in viewBox units

const segments = computed(() => {
  let offset = 0
  return props.data.map((d, i) => {
    const share = total.value ? Math.max(0, d.value) / total.value : 0
    const length = share * circumference.value
    const segment = {
      label: d.label,
      percent: share * 100,
      color: d.color ?? seriesColors[i % seriesColors.length],
      dash: `${Math.max(0, length - GAP)} ${circumference.value}`,
      offset: -offset,
    }
    offset += length
    return segment
  })
})

const percentText = (p: number) => `${p < 10 && p % 1 ? p.toFixed(1) : Math.round(p)}%`
</script>

<template>
  <figure class="ml-donut" :style="{ '--_size': `${size}px` }">
    <div
      class="ml-donut__chart"
      role="img"
      :aria-label="label ?? segments.map((s) => `${s.label} ${percentText(s.percent)}`).join('，')"
    >
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <circle class="ml-donut__track" cx="50" cy="50" :r="radius" :stroke-width="thickness" />
        <circle
          v-for="s in segments"
          :key="s.label"
          class="ml-donut__seg"
          cx="50"
          cy="50"
          :r="radius"
          :stroke="s.color"
          :stroke-width="thickness"
          :stroke-dasharray="s.dash"
          :stroke-dashoffset="s.offset"
        />
      </svg>
      <div v-if="title || caption" class="ml-donut__center" aria-hidden="true">
        <span v-if="title" class="ml-donut__title">{{ title }}</span>
        <span v-if="caption" class="ml-donut__caption">{{ caption }}</span>
      </div>
    </div>
    <ul v-if="legend" class="ml-donut__legend">
      <li v-for="s in segments" :key="s.label">
        <i :style="{ background: s.color }" />
        <span class="ml-donut__name">{{ s.label }}</span>
        <span class="ml-donut__pct">{{ percentText(s.percent) }}</span>
      </li>
    </ul>
  </figure>
</template>
