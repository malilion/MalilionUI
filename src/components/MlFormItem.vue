<script setup lang="ts">
import { computed, inject, onBeforeUnmount, provide, ref, useId, watch } from 'vue'
import MlIcon from './MlIcon.vue'
import { fieldKey, formKey, getPath, toRuleList, validateValue, type MlFormRule } from '../form'

const props = defineProps<{
  /** Path of this field's value in the form model, e.g. "email" or "address.city". */
  prop: string
  /** Extra rules, checked after the ones the form gives for this prop. */
  rules?: MlFormRule | MlFormRule[]
}>()

const form = inject(formKey, null)

const root = ref<HTMLElement>()
const error = ref<string>()
const claimed = ref(false)
/** Blurred at least once; from then on the field re-checks as it changes. */
const touched = ref(false)
const errorId = `ml-form-item-${useId()}-error`

const allRules = computed(() => [...(form?.rulesFor(props.prop) ?? []), ...toRuleList(props.rules)])
const value = computed(() => (form ? getPath(form.model(), props.prop) : undefined))

let run = 0
async function validate() {
  const id = ++run
  const message = await validateValue(value.value, allRules.value, form?.model() ?? {})
  // A slower async check must not overwrite a newer result.
  if (id === run) error.value = message
  return message
}

function reset() {
  run++
  error.value = undefined
  touched.value = false
}

provide(fieldKey, {
  error,
  required: computed(() => allRules.value.some((rule) => rule.required)),
  claim: () => (claimed.value = true),
})

const unregister = form?.register({ prop: props.prop, el: () => root.value, validate, reset })
onBeforeUnmount(() => unregister?.())

watch(value, () => {
  if (touched.value || form?.submitted.value || error.value) validate()
}, { deep: true })

function onFocusOut(event: FocusEvent) {
  // Moving between parts of the same control (e.g. into its option list) isn't a blur.
  if (root.value?.contains(event.relatedTarget as Node | null)) return
  touched.value = true
  validate()
}
</script>

<template>
  <div
    ref="root"
    :class="['ml-form-item', { 'ml-form-item--error': error }]"
    :data-prop="prop"
    @focusout="onFocusOut"
  >
    <slot :error="error" :validate="validate" />
    <!-- Controls without a built-in error line (checkbox, switch, radio, upload…) -->
    <p v-if="error && !claimed" :id="errorId" class="ml-field__error">
      <MlIcon name="warning" />{{ error }}
    </p>
  </div>
</template>
