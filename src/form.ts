import { getLocale, type MlLocale } from './locale'
import { computed, inject, type ComputedRef, type InjectionKey, type Ref } from 'vue'

export type MlValidatorResult = boolean | string | void | undefined | null

export interface MlFormRule {
  /** Empty values ('', null, undefined, [], false) fail. */
  required?: boolean
  /** Minimum length (strings, arrays) or minimum value (numbers). */
  min?: number
  /** Maximum length (strings, arrays) or maximum value (numbers). */
  max?: number
  pattern?: RegExp
  type?: 'email' | 'url' | 'number' | 'integer'
  /** Return `true`/nothing to pass, `false` or a message to fail. May be async. */
  validator?: (value: unknown, model: Record<string, unknown>) => MlValidatorResult | Promise<MlValidatorResult>
  /** Overrides the built-in message for this rule. */
  message?: string
}

export type MlFormRules = Record<string, MlFormRule | MlFormRule[]>

/** prop → error message, for every field that currently fails. */
export type MlFormErrors = Record<string, string>

export function isEmptyValue(value: unknown) {
  return (
    value === undefined ||
    value === null ||
    value === false ||
    (typeof value === 'string' && value.trim() === '') ||
    (Array.isArray(value) && value.length === 0)
  )
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const URL_RE = /^https?:\/\/[^\s/$.?#].[^\s]*$/i

function sizeOf(value: unknown): { size: number; unit: 'chars' | 'items' | 'value' } | null {
  if (typeof value === 'string') return { size: [...value].length, unit: 'chars' }
  if (Array.isArray(value)) return { size: value.length, unit: 'items' }
  if (typeof value === 'number' && !Number.isNaN(value)) return { size: value, unit: 'value' }
  return null
}

/** First failing rule's message, or undefined when the value passes. */
export async function validateValue(
  value: unknown,
  rules: MlFormRule[],
  model: Record<string, unknown> = {},
  /** Messages to use; defaults to the app-wide locale. */
  locale: MlLocale = getLocale(),
): Promise<string | undefined> {
  const t = locale.form
  const minMessages = { chars: t.minChars, items: t.minItems, value: t.minValue }
  const maxMessages = { chars: t.maxChars, items: t.maxItems, value: t.maxValue }
  for (const rule of rules) {
    const empty = isEmptyValue(value)
    if (rule.required && empty) return rule.message ?? t.required
    // Optional fields that are empty skip every other check.
    if (empty && !rule.validator) continue

    if (rule.type && !empty) {
      const ok =
        rule.type === 'email' ? EMAIL.test(String(value)) :
        rule.type === 'url' ? URL_RE.test(String(value)) :
        rule.type === 'number' ? typeof value === 'number' ? !Number.isNaN(value) : value !== '' && !Number.isNaN(Number(value)) :
        Number.isInteger(typeof value === 'number' ? value : Number(value))
      if (!ok) {
        return rule.message ?? t[rule.type]
      }
    }

    const size = empty ? null : sizeOf(value)
    if (size && rule.min !== undefined && size.size < rule.min) return rule.message ?? minMessages[size.unit](rule.min)
    if (size && rule.max !== undefined && size.size > rule.max) return rule.message ?? maxMessages[size.unit](rule.max)

    if (rule.pattern && !empty && !rule.pattern.test(String(value))) return rule.message ?? t.pattern

    if (rule.validator) {
      const result = await rule.validator(value, model)
      if (result === false) return rule.message ?? t.pattern
      if (typeof result === 'string' && result) return result
    }
  }
  return undefined
}

export function toRuleList(rules: MlFormRule | MlFormRule[] | undefined): MlFormRule[] {
  if (!rules) return []
  return Array.isArray(rules) ? rules : [rules]
}

/** Read `a.b.0.c` out of an object. */
export function getPath(model: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((value, key) => (value == null ? undefined : (value as Record<string, unknown>)[key]), model)
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
