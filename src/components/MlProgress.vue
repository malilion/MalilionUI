<script setup lang="ts">
import { computed, useId } from 'vue'
import type { MlProgressTone, MlSize } from '../types'

const props = withDefaults(
  defineProps<{
    /** Omit (or pass null) for an indeterminate scan. */
    value?: number | null
    max?: number
    label?: string
    tone?: MlProgressTone
    size?: MlSize
    striped?: boolean
    /** Continuous bar instead of energy cells. */
    smooth?: boolean
    showValue?: boolean
  }>(),
  { value: null, max: 100, tone: 'gold', size: 'md', showValue: true },
)

const labelId = `ml-progress-${useId()}`
const indeterminate = computed(() => props.value === null || props.value === undefined)
const percent = computed(() => {
  if (indeterminate.value || props.max <= 0) return 0
  return Math.min(100, Math.max(0, ((props.value as number) / props.max) * 100))
})
</script>

<template>
  <div
    :class="[
      'ml-progress',
      `ml-progress--${tone}`,
      `ml-progress--${size}`,
      {
        'ml-progress--striped': striped,
        'ml-progress--smooth': smooth,
        'ml-progress--indeterminate': indeterminate,
      },
    ]"
  >
    <div v-if="label || showValue" class="ml-progress__head">
      <span :id="labelId">{{ label }}</span>
      <span v-if="showValue" class="ml-progress__value">
        {{ indeterminate ? 'SYNC' : `${Math.round(percent)}%` }}
      </span>
    </div>
    <div
      class="ml-progress__track"
      role="progressbar"
      aria-valuemin="0"
      aria-valuemax="100"
      :aria-valuenow="indeterminate ? undefined : Math.round(percent)"
      :aria-labelledby="label ? labelId : undefined"
    >
      <div
        :class="['ml-progress__bar', { 'ml-progress__bar--empty': !indeterminate && percent === 0 }]"
        :style="{ '--_value': `${percent}%` }"
      />
    </div>
  </div>
</template>
