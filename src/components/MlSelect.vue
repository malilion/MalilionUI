<script setup lang="ts">
import { computed, useId } from 'vue'
import MlField from './MlField.vue'
import MlIcon from './MlIcon.vue'
import { describedBy, useSplitAttrs } from '../composables'
import type { MlSelectOption, MlSize } from '../types'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    options: MlSelectOption[]
    label?: string
    hint?: string
    error?: string
    index?: string
    /** Shown as an unselectable first option while nothing is chosen. */
    placeholder?: string
    size?: MlSize
    required?: boolean
    disabled?: boolean
    id?: string
  }>(),
  { size: 'md' },
)

const model = defineModel<string | number>()
// Map "nothing chosen" onto the placeholder option instead of a blank select.
const selected = computed({
  get: () => model.value ?? '',
  set: (value) => {
    model.value = value
  },
})
const { rootAttrs, controlAttrs } = useSplitAttrs()
const autoId = useId()
const controlId = computed(() => props.id ?? `ml-select-${autoId}`)
</script>

<template>
  <MlField
    v-bind="rootAttrs()"
    :control-id="controlId"
    :label="label"
    :hint="hint"
    :error="error"
    :index="index"
    :required="required"
  >
    <div
      :class="[
        'ml-input',
        `ml-input--${size}`,
        { 'ml-input--error': error, 'ml-input--disabled': disabled },
      ]"
    >
      <span v-if="$slots.prefix" class="ml-input__affix"><slot name="prefix" /></span>
      <select
        :id="controlId"
        v-model="selected"
        v-bind="controlAttrs()"
        class="ml-input__control"
        :required="required"
        :disabled="disabled"
        :aria-invalid="error ? true : undefined"
        :aria-describedby="describedBy(controlId, hint, error)"
      >
        <option v-if="placeholder" value="" disabled>{{ placeholder }}</option>
        <option
          v-for="option in options"
          :key="option.value"
          :value="option.value"
          :disabled="option.disabled"
        >
          {{ option.label }}
        </option>
      </select>
      <MlIcon name="chevronDown" class="ml-input__chevron" />
    </div>
  </MlField>
</template>
