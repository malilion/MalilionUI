<script setup lang="ts">
import { computed, useId } from 'vue'
import MlField from './MlField.vue'
import { describedBy, useSplitAttrs } from '../composables'
import { useFormField } from '../form'

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
const { fieldError, fieldRequired } = useFormField(props)

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
    :error="fieldError"
    :index="index"
    :required="fieldRequired"
  >
    <div
      :class="[
        'ml-input',
        'ml-input--textarea',
        { 'ml-input--error': fieldError, 'ml-input--disabled': disabled },
      ]"
    >
      <textarea
        :id="controlId"
        v-model="model"
        v-bind="controlAttrs()"
        class="ml-input__control"
        :rows="rows"
        :placeholder="placeholder"
        :required="fieldRequired"
        :disabled="disabled"
        :readonly="readonly"
        :aria-invalid="fieldError ? true : undefined"
        :aria-describedby="describedBy(controlId, hint, fieldError)"
      />
    </div>
  </MlField>
</template>
