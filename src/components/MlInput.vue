<script setup lang="ts">
import { computed, useId } from 'vue'
import MlField from './MlField.vue'
import { describedBy, useSplitAttrs } from '../composables'
import type { MlSize } from '../types'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    label?: string
    hint?: string
    error?: string
    index?: string
    type?: string
    placeholder?: string
    size?: MlSize
    required?: boolean
    disabled?: boolean
    readonly?: boolean
    id?: string
  }>(),
  { type: 'text', size: 'md' },
)

const model = defineModel<string | number>()
const { rootAttrs, controlAttrs } = useSplitAttrs()
const autoId = useId()
const controlId = computed(() => props.id ?? `ml-input-${autoId}`)
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
    <template v-if="$slots.label" #label><slot name="label" /></template>
    <div
      :class="[
        'ml-input',
        `ml-input--${size}`,
        { 'ml-input--error': error, 'ml-input--disabled': disabled },
      ]"
    >
      <span v-if="$slots.prefix" class="ml-input__affix"><slot name="prefix" /></span>
      <input
        :id="controlId"
        v-model="model"
        v-bind="controlAttrs()"
        class="ml-input__control"
        :type="type"
        :placeholder="placeholder"
        :required="required"
        :disabled="disabled"
        :readonly="readonly"
        :aria-invalid="error ? true : undefined"
        :aria-describedby="describedBy(controlId, hint, error)"
      />
      <span v-if="$slots.suffix" class="ml-input__affix"><slot name="suffix" /></span>
    </div>
  </MlField>
</template>
