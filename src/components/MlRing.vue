<script setup lang="ts">
import { computed, useId } from 'vue'
import { chartStops } from './charts'
import type { MlChartTone } from '../types'

const props = withDefaults(
  defineProps<{
    value: number
    max?: number
    size?: number
    /** Stroke width in viewBox units (the ring is drawn on a 100×100 box). */
    thickness?: number
    label?: string
    tone?: MlChartTone
    showValue?: boolean
  }>(),
  { max: 100, size: 120, thickness: 9, tone: 'gold', showValue: true },
)

const gradientId = `ml-ring-${useId()}`
const radius = computed(() => 50 - props.thickness / 2 - 2)
const circumference = computed(() => 2 * Math.PI * radius.value)
const percent = computed(() => Math.min(100, Math.max(0, (props.value / props.max) * 100)))
</script>

<template>
  <div
    :class="['ml-ring', `ml-ring--${tone}`]"
    :style="{ '--_size': `${size}px` }"
    role="progressbar"
    aria-valuemin="0"
    aria-valuemax="100"
    :aria-valuenow="Math.round(percent)"
    :aria-label="label"
  >
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <defs>
        <linearGradient :id="gradientId" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" :stop-color="chartStops[tone][0]" />
          <stop offset="1" :stop-color="chartStops[tone][1]" />
        </linearGradient>
      </defs>
      <circle class="ml-ring__track" cx="50" cy="50" :r="radius" :stroke-width="thickness" />
      <circle
        class="ml-ring__bar"
        cx="50"
        cy="50"
        :r="radius"
        :stroke-width="thickness"
        :stroke="`url(#${gradientId})`"
        :stroke-dasharray="circumference"
        :stroke-dashoffset="circumference * (1 - percent / 100)"
        :style="{ '--_c': circumference }"
      />
    </svg>
    <div class="ml-ring__center">
      <slot>
        <span v-if="showValue" class="ml-ring__value">{{ Math.round(percent) }}%</span>
        <span v-if="label" class="ml-ring__label">{{ label }}</span>
      </slot>
    </div>
  </div>
</template>
