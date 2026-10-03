import { getLocale, type MlLocale } from './locale'
import { computed, inject, type ComputedRef, type InjectionKey, type Ref } from 'vue'
import { validateValue as validateRules, type MlFormRule } from './form-rules'

export { isEmptyValue, toRuleList, getPath } from './form-rules'
export type { MlValidatorResult, MlFormRule, MlFormRules, MlFormErrors } from './form-rules'

/** First failing rule's message, or undefined when the value passes. */
export function validateValue(
  value: unknown,
  rules: MlFormRule[],
  model: Record<string, unknown> = {},
  /** Messages to use; defaults to the app-wide locale. */
  locale: MlLocale = getLocale(),
): Promise<string | undefined> {
  return validateRules(value, rules, model, locale)
}

/* ── Context wiring ───────────────────────────────────────── */

export interface FormItemHandle {
  prop: string
  el: () => HTMLElement | undefined
  validate: () => Promise<string | undefined>
  reset: () => void
}

export interface FormContext {
  model: () => Record<string, unknown>
  rulesFor: (prop: string) => MlFormRule[]
  /** Becomes true after the first submit; fields then re-validate as they change. */
  submitted: Ref<boolean>
  register: (item: FormItemHandle) => () => void
}

export interface FieldContext {
  error: Ref<string | undefined>
  required: ComputedRef<boolean>
  /** A control that shows the error itself calls this, so MlFormItem doesn't repeat it. */
  claim: () => void
}

export const formKey: InjectionKey<FormContext> = Symbol('ml-form')
export const fieldKey: InjectionKey<FieldContext> = Symbol('ml-form-item')

/**
 * For controls that render their own error (MlInput, MlSelect…): merges an
 * explicit `error` / `required` prop with what the surrounding MlFormItem knows.
 */
export function useFormField(props: { error?: string; required?: boolean }) {
  const field = inject(fieldKey, null)
  field?.claim()
  return {
    fieldError: computed(() => props.error || field?.error.value || undefined),
    fieldRequired: computed(() => props.required || field?.required.value || false),
  }
}
