<script setup lang="ts">
import { computed, useId } from 'vue'
import MlField from './MlField.vue'
import { describedBy, useSplitAttrs } from '../composables'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    label?: string
    hint?: string
    error?: string
    index?: string
    placeholder?: string
    rows?: number
    required?: boolean
    disabled?: boolean
    readonly?: boolean
    id?: string
  }>(),
  { rows: 4 },
)

const model = defineModel<string>()
const { rootAttrs, controlAttrs } = useSplitAttrs()
const autoId = useId()
const controlId = computed(() => props.id ?? `ml-textarea-${autoId}`)
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
        'ml-input--textarea',
        { 'ml-input--error': error, 'ml-input--disabled': disabled },
      ]"
    >
      <textarea
        :id="controlId"
        v-model="model"
        v-bind="controlAttrs()"
        class="ml-input__control"
        :rows="rows"
        :placeholder="placeholder"
        :required="required"
        :disabled="disabled"
        :readonly="readonly"
        :aria-invalid="error ? true : undefined"
        :aria-describedby="describedBy(controlId, hint, error)"
      />
    </div>
  </MlField>
</template>
