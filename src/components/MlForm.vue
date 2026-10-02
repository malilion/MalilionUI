<script setup lang="ts">
import { nextTick, provide, ref } from 'vue'
import { FOCUSABLE } from '../composables'
import { formKey, toRuleList, type FormItemHandle, type MlFormErrors, type MlFormRules } from '../form'

const props = defineProps<{
  /** The reactive object the fields write into. Field `prop`s are paths into it. */
  model: Record<string, unknown>
  rules?: MlFormRules
}>()

const emit = defineEmits<{
  /** Every field passed. */
  submit: [model: Record<string, unknown>]
  /** At least one field failed; focus has moved to the first one. */
  invalid: [errors: MlFormErrors]
}>()

const items = new Set<FormItemHandle>()
const submitted = ref(false)

provide(formKey, {
  model: () => props.model,
  rulesFor: (prop) => toRuleList(props.rules?.[prop]),
  submitted,
  register(item) {
    items.add(item)
    return () => items.delete(item)
  },
})

/** Items in document order, so "first error" means the topmost one. */
function ordered() {
  return [...items].sort((a, b) => {
    const ea = a.el()
    const eb = b.el()
    if (!ea || !eb) return 0
    return ea.compareDocumentPosition(eb) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1
  })
}

async function collectErrors(): Promise<MlFormErrors> {
  const list = ordered()
  const results = await Promise.all(list.map((item) => item.validate()))
  const errors: MlFormErrors = {}
  list.forEach((item, i) => {
    if (results[i]) errors[item.prop] = results[i]!
  })
  return errors
}

/** Validate every field. Resolves true when all pass. */
async function validate(): Promise<boolean> {
  submitted.value = true
  return Object.keys(await collectErrors()).length === 0
}

/** Validate one field by its prop. Resolves to its error message, if any. */
async function validateField(prop: string): Promise<string | undefined> {
  const item = [...items].find((i) => i.prop === prop)
  return item?.validate()
}

/** Clear error messages (all, or just the given props) without touching values. */
function clearValidation(propsToClear?: string[]) {
  if (!propsToClear) submitted.value = false
  for (const item of items) {
    if (!propsToClear || propsToClear.includes(item.prop)) item.reset()
  }
}

async function focusFirstError(errors: MlFormErrors) {
  await nextTick()
  const first = ordered().find((item) => errors[item.prop])?.el()
  if (!first) return
  const control =
    first.querySelector<HTMLElement>('[aria-invalid="true"]') ?? first.querySelector<HTMLElement>(FOCUSABLE)
  control?.focus({ preventScroll: true })
  first.scrollIntoView?.({ block: 'center', behavior: 'smooth' })
}

async function onSubmit() {
  submitted.value = true
  const errors = await collectErrors()
  if (Object.keys(errors).length) {
    emit('invalid', errors)
    focusFirstError(errors)
  } else {
    emit('submit', props.model)
  }
}

defineExpose({ validate, validateField, clearValidation })
</script>

<template>
  <form class="ml-form" novalidate @submit.prevent="onSubmit">
    <slot :validate="validate" :clear-validation="clearValidation" />
  </form>
</template>
