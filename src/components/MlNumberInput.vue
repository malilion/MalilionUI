<script setup lang="ts">
import { computed, useId } from 'vue'
import MlField from './MlField.vue'
import MlIcon from './MlIcon.vue'
import { describedBy, useSplitAttrs } from '../composables'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    min?: number
    max?: number
    step?: number
    label?: string
    hint?: string
    error?: string
    index?: string
    disabled?: boolean
    id?: string
  }>(),
  { min: -Infinity, max: Infinity, step: 1 },
)

const model = defineModel<number>({ default: 0 })
const { rootAttrs, controlAttrs } = useSplitAttrs()
const autoId = useId()
const controlId = computed(() => props.id ?? `ml-number-${autoId}`)

function clamp(value: number) {
  if (Number.isNaN(value)) return Math.max(props.min, Math.min(props.max, 0))
  return Math.min(props.max, Math.max(props.min, value))
}

function nudge(direction: 1 | -1) {
  // Round to the step's precision so 0.1 + 0.2 doesn't show 0.30000000000000004.
  const decimals = (String(props.step).split('.')[1] ?? '').length
  model.value = clamp(Number((model.value + direction * props.step).toFixed(decimals)))
}

function onChange(event: Event) {
  model.value = clamp((event.target as HTMLInputElement).valueAsNumber)
}
</script>

<template>
  <MlField
    v-bind="rootAttrs()"
    :control-id="controlId"
    :label="label"
    :hint="hint"
    :error="error"
    :index="index"
  >
    <div :class="['ml-input', 'ml-number', { 'ml-input--error': error, 'ml-input--disabled': disabled }]">
      <button
        type="button"
        class="ml-number__btn"
        aria-label="減少"
        tabindex="-1"
        :disabled="disabled || model <= min"
        @click="nudge(-1)"
      >
        <MlIcon name="minus" />
      </button>
      <input
        :id="controlId"
        v-bind="controlAttrs()"
        type="number"
        inputmode="decimal"
        class="ml-input__control ml-number__control"
        :value="model"
        :min="Number.isFinite(min) ? min : undefined"
        :max="Number.isFinite(max) ? max : undefined"
        :step="step"
        :disabled="disabled"
        :aria-invalid="error ? true : undefined"
        :aria-describedby="describedBy(controlId, hint, error)"
        @change="onChange"
      />
      <button
        type="button"
        class="ml-number__btn"
        aria-label="增加"
        tabindex="-1"
        :disabled="disabled || model >= max"
        @click="nudge(1)"
      >
        <MlIcon name="plus" />
      </button>
    </div>
  </MlField>
</template>
