<script setup lang="ts">
import { computed, useId } from 'vue'
import { useSplitAttrs } from '../composables'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    min?: number
    max?: number
    step?: number
    label?: string
    /** Shown after the value, e.g. "%". */
    unit?: string
    showValue?: boolean
    tone?: 'gold' | 'tech'
    disabled?: boolean
    id?: string
  }>(),
  { min: 0, max: 100, step: 1, showValue: true, tone: 'gold' },
)

const model = defineModel<number>({ default: 0 })
const { rootAttrs, controlAttrs } = useSplitAttrs()
const autoId = useId()
const controlId = computed(() => props.id ?? `ml-slider-${autoId}`)

const percent = computed(() => {
  const span = props.max - props.min
  return span > 0 ? ((model.value - props.min) / span) * 100 : 0
})
</script>

<template>
  <div
    v-bind="rootAttrs()"
    :class="['ml-slider', `ml-slider--${tone}`, { 'ml-slider--disabled': disabled }]"
    :style="{ '--_pct': `${percent}%` }"
  >
    <div v-if="label || showValue" class="ml-slider__head">
      <label v-if="label" :for="controlId">{{ label }}</label>
      <output v-if="showValue" :for="controlId" class="ml-slider__value">{{ model }}{{ unit }}</output>
    </div>
    <input
      :id="controlId"
      v-model.number="model"
      v-bind="controlAttrs()"
      type="range"
      class="ml-slider__input"
      :min="min"
      :max="max"
      :step="step"
      :disabled="disabled"
    />
  </div>
</template>
