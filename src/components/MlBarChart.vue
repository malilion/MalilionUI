<script setup lang="ts">
import { computed } from 'vue'
import type { MlChartDatum, MlChartTone } from '../types'

const props = withDefaults(
  defineProps<{
    data: MlChartDatum[]
    /** Plot height in px. */
    height?: number
    tone?: MlChartTone
    /** Which bar to light up and label: the largest, an index, or none. */
    highlight?: 'max' | number | null
    /** Number of horizontal grid lines. */
    ticks?: number
    format?: (value: number) => string
    /** Accessible summary of the chart. */
    label?: string
  }>(),
  { height: 200, tone: 'gold', highlight: 'max', ticks: 4 },
)

const fmt = (v: number) => (props.format ? props.format(v) : v.toLocaleString())

// Pick a round step per gridline (…, 15, 20, 25, 30, 40, 50, 60, 80, 100, …)
// so every tick is a readable number, then stack `ticks` of them.
const top = computed(() => {
  const max = Math.max(0, ...props.data.map((d) => d.value))
  if (max === 0) return props.ticks
  const rawStep = max / props.ticks
  const magnitude = 10 ** Math.floor(Math.log10(rawStep))
  const step = ([1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find((m) => m * magnitude >= rawStep) ?? 10) * magnitude
  return step * props.ticks
})

const tickValues = computed(() =>
  Array.from({ length: props.ticks + 1 }, (_, i) => (top.value / props.ticks) * (props.ticks - i)),
)

const highlighted = computed(() => {
  if (props.highlight === null) return -1
  if (typeof props.highlight === 'number') return props.highlight
  let best = -1
  props.data.forEach((d, i) => {
    if (best === -1 || d.value > props.data[best].value) best = i
  })
  return best
})
</script>

<template>
  <figure
    :class="['ml-bars', `ml-bars--${tone}`]"
    :style="{ '--_h': `${height}px` }"
    role="img"
    :aria-label="label ?? data.map((d) => `${d.label} ${fmt(d.value)}`).join('，')"
  >
    <div class="ml-bars__axis" aria-hidden="true">
      <span v-for="t in tickValues" :key="t">{{ fmt(t) }}</span>
    </div>
    <div class="ml-bars__plot" aria-hidden="true">
      <div class="ml-bars__grid">
        <i v-for="t in tickValues" :key="t" />
      </div>
      <div v-for="(d, i) in data" :key="`${i}-${d.label}`" class="ml-bars__col">
        <div class="ml-bars__track">
          <div
            :class="['ml-bars__bar', { 'ml-bars__bar--hi': i === highlighted }]"
            :style="{ height: `${(d.value / top) * 100}%`, '--_i': i }"
          >
            <span v-if="i === highlighted" class="ml-bars__tip">{{ fmt(d.value) }}</span>
          </div>
        </div>
        <span class="ml-bars__x">{{ d.label }}</span>
      </div>
    </div>
  </figure>
</template>
