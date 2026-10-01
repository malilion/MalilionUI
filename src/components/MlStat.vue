<script setup lang="ts">
import { computed } from 'vue'
import MlIcon from './MlIcon.vue'

const props = withDefaults(
  defineProps<{
    label: string
    value: string | number
    unit?: string
    /** Change vs. the previous period; sign picks the colour and arrow. */
    delta?: number
    deltaSuffix?: string
    caption?: string
  }>(),
  { deltaSuffix: '%' },
)

const trend = computed(() => {
  if (props.delta === undefined) return undefined
  if (props.delta > 0) return 'up'
  if (props.delta < 0) return 'down'
  return 'flat'
})

const deltaText = computed(() => {
  if (props.delta === undefined) return ''
  const sign = props.delta > 0 ? '+' : props.delta < 0 ? '−' : '±'
  return `${sign}${Math.abs(props.delta)}${props.deltaSuffix}`
})
</script>

<template>
  <div class="ml-stat">
    <div class="ml-stat__label">
      <slot name="icon" />
      {{ label }}
    </div>
    <div class="ml-stat__value">
      <span class="ml-metal-text">{{ value }}</span>
      <span v-if="unit" class="ml-stat__unit">{{ unit }}</span>
    </div>
    <div v-if="trend || caption" class="ml-stat__foot">
      <span v-if="trend" :class="['ml-stat__delta', `ml-stat__delta--${trend}`]">
        <MlIcon v-if="trend !== 'flat'" :name="trend" />
        {{ deltaText }}
      </span>
      <span v-if="caption">{{ caption }}</span>
    </div>
  </div>
</template>
