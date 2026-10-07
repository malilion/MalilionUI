// Framework-free form validation rules, shared by the Vue (form.ts) and React form components.
import { zhTW, type MlLocale } from './locale-data'

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
  /**
   * Overrides the built-in message for this rule. A function receives the active
   * locale, so ready-made rules (e.g. `twRules`) can follow MlConfigProvider.
   */
  message?: string | ((locale: MlLocale) => string)
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

const MAX_EMAIL_LEN = 254
const URL_RE = /^https?:\/\/[^\s/$.?#].[^\s]*$/i

/** `local@domain` with a `.` in the domain — no nested `+` quantifiers (CodeQL js/polynomial-redos). */
function isEmail(value: string): boolean {
  if (value.length > MAX_EMAIL_LEN) return false
  const at = value.indexOf('@')
  if (at < 1 || at !== value.lastIndexOf('@') || at === value.length - 1) return false
  for (let i = 0; i < value.length; i++) {
    const c = value.charCodeAt(i)
    if (c <= 32 || c === 127) return false // whitespace / control
  }
  const domain = value.slice(at + 1)
  const dot = domain.indexOf('.')
  return dot > 0 && dot < domain.length - 1
}

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
  /** Messages to use. */
  locale: MlLocale = zhTW,
): Promise<string | undefined> {
  const t = locale.form
  const msg = (rule: MlFormRule, fallback: string) =>
    rule.message === undefined ? fallback : typeof rule.message === 'function' ? rule.message(locale) : rule.message
  const minMessages = { chars: t.minChars, items: t.minItems, value: t.minValue }
  const maxMessages = { chars: t.maxChars, items: t.maxItems, value: t.maxValue }
  for (const rule of rules) {
    const empty = isEmptyValue(value)
    if (rule.required && empty) return msg(rule, t.required)
    // Optional fields that are empty skip every other check.
    if (empty && !rule.validator) continue

    if (rule.type && !empty) {
      const ok =
        rule.type === 'email' ? isEmail(String(value)) :
        rule.type === 'url' ? URL_RE.test(String(value)) :
        rule.type === 'number' ? typeof value === 'number' ? !Number.isNaN(value) : value !== '' && !Number.isNaN(Number(value)) :
        Number.isInteger(typeof value === 'number' ? value : Number(value))
      if (!ok) {
        return msg(rule, t[rule.type])
      }
    }

    const size = empty ? null : sizeOf(value)
    if (size && rule.min !== undefined && size.size < rule.min) return msg(rule, minMessages[size.unit](rule.min))
    if (size && rule.max !== undefined && size.size > rule.max) return msg(rule, maxMessages[size.unit](rule.max))

    if (rule.pattern && !empty && !rule.pattern.test(String(value))) return msg(rule, t.pattern)

    if (rule.validator) {
      const result = await rule.validator(value, model)
      if (result === false) return msg(rule, t.pattern)
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
