// SchemaForm / Wizard logic (framework-free, shared by MlSchemaForm / MlWizard and
// their React twins): field types, default values, visibility, the rules a field
// validates with, immutable model updates and the step bookkeeping of a wizard.
import { getPath, toRuleList, type MlFormRule, type MlFormRules } from '../form-rules'
import type { MlSelectOption } from '../types'

/* ── Fields ──────────────────────────────────────────── */

export type MlSchemaFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'amount'
  | 'mask'
  | 'select'
  | 'combobox'
  | 'radio'
  | 'checkbox'
  | 'checkbox-group'
  | 'switch'
  | 'date'
  | 'region'
  | 'address'
  | 'custom'

export type MlSchemaModel = Record<string, unknown>

/** A fixed flag, or one worked out from the current model. */
export type MlSchemaCondition = boolean | ((model: MlSchemaModel) => boolean)

export interface MlSchemaOption extends MlSelectOption {
  /** Second line under radio / checkbox options. */
  hint?: string
}

export interface MlSchemaField<C = unknown> {
  /** Path of the value in the model, e.g. "name" or "contact.phone". */
  field: string
  label?: string
  /** Which built-in control to render. Default 'text', or 'custom' when `component` is set. */
  type?: MlSchemaFieldType
  /** Your own control: gets the value (v-model / value + onChange) plus label, hint, placeholder, disabled, options. */
  component?: C
  /** Extra props for the control, e.g. `{ type: 'email' }`, `{ preset: 'mobile' }`, `{ multiple: true }`. */
  props?: Record<string, unknown>
  rules?: MlFormRule | MlFormRule[]
  /** Shortcut for a `{ required: true }` rule. */
  required?: boolean
  /** Message of that required rule. */
  requiredMessage?: string
  placeholder?: string
  /** Hint under the control. */
  help?: string
  /** Grid columns this field takes; 'full' spans the whole row. */
  span?: number | 'full'
  /** Not rendered (nor validated) when true. */
  hidden?: MlSchemaCondition
  /** Rendered only when true. */
  visible?: MlSchemaCondition
  /** Disabled fields are not validated. */
  disabled?: MlSchemaCondition
  /** For select / combobox / radio / checkbox-group. */
  options?: MlSchemaOption[]
  /** Initial value when the model has none. A function is called for a fresh value each time. */
  default?: unknown
}

interface TypeSpec {
  /**
   * How the label reaches the screen:
   * `control` — the control draws label + hint itself (MlInput, MlSelect…);
   * `field` — wrapped in an MlField (switch, radio group);
   * `inline` — label beside the box (checkbox).
   */
  frame: 'control' | 'field' | 'inline'
  placeholder?: boolean
  options?: boolean
  size?: boolean
  /** Value of an untouched field. */
  empty: (field: MlSchemaField<unknown>) => unknown
}

const blank = () => ''
const nothing = () => null

export const SCHEMA_FIELD_TYPES: Record<MlSchemaFieldType, TypeSpec> = {
  text: { frame: 'control', placeholder: true, size: true, empty: blank },
  textarea: { frame: 'control', placeholder: true, empty: blank },
  number: { frame: 'control', empty: () => 0 },
  amount: { frame: 'control', placeholder: true, size: true, empty: nothing },
  mask: { frame: 'control', placeholder: true, size: true, empty: blank },
  select: { frame: 'control', placeholder: true, options: true, size: true, empty: blank },
  combobox: { frame: 'control', placeholder: true, options: true, size: true, empty: (f) => (f.props?.multiple ? [] : null) },
  radio: { frame: 'field', options: true, empty: nothing },
  checkbox: { frame: 'inline', empty: () => false },
  'checkbox-group': { frame: 'control', options: true, empty: () => [] },
  switch: { frame: 'field', empty: () => false },
  date: { frame: 'control', placeholder: true, empty: nothing },
  region: { frame: 'control', size: true, empty: nothing },
  address: { frame: 'control', size: true, empty: () => ({ county: '', district: '', zip: '', road: '', number: '' }) },
  custom: { frame: 'control', placeholder: true, empty: () => undefined },
}

export function schemaFieldType(field: MlSchemaField<unknown>): MlSchemaFieldType {
  return field.type ?? (field.component ? 'custom' : 'text')
}

/** Deep copy of plain objects, arrays and dates; anything else is shared. */
export function cloneSchemaValue<T>(value: T): T {
  if (value instanceof Date) return new Date(value.getTime()) as T
  if (Array.isArray(value)) return value.map(cloneSchemaValue) as T
  if (value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, cloneSchemaValue(v)])) as T
  }
  return value
}

/** The value a field starts with: its `default`, or the empty value of its type. */
export function schemaInitialValue(field: MlSchemaField<unknown>): unknown {
  if (field.default !== undefined) return typeof field.default === 'function' ? (field.default as () => unknown)() : cloneSchemaValue(field.default)
  return SCHEMA_FIELD_TYPES[schemaFieldType(field)].empty(field)
}

/** A copy of the model with `path` set; objects along the way are copied, never mutated. */
export function setSchemaValue(model: MlSchemaModel, path: string, value: unknown): MlSchemaModel {
  const [head, ...rest] = path.split('.')
  const inner = model[head]
  return {
    ...model,
    [head]: rest.length ? setSchemaValue(inner && typeof inner === 'object' ? (inner as MlSchemaModel) : {}, rest.join('.'), value) : value,
  }
}

/** A fresh model holding every field's initial value. */
export function schemaDefaults(fields: MlSchemaField<unknown>[]): MlSchemaModel {
  return applySchemaDefaults(fields, {})
}

/**
 * Fill in the initial value of every field the model doesn't have yet.
 * Returns the same object when nothing was missing, so it is safe to call on every render.
 */
export function applySchemaDefaults(fields: MlSchemaField<unknown>[], model: MlSchemaModel): MlSchemaModel {
  let next = model
  for (const field of fields) {
    if (getPath(next, field.field) !== undefined) continue
    const value = schemaInitialValue(field)
    if (value !== undefined) next = setSchemaValue(next, field.field, value)
  }
  return next
}

const check = (condition: MlSchemaCondition | undefined, model: MlSchemaModel) =>
  typeof condition === 'function' ? condition(model) : !!condition

export function isSchemaFieldVisible(field: MlSchemaField<unknown>, model: MlSchemaModel): boolean {
  if (check(field.hidden, model)) return false
  return field.visible === undefined || check(field.visible, model)
}

export function isSchemaFieldDisabled(field: MlSchemaField<unknown>, model: MlSchemaModel, formDisabled = false): boolean {
  return formDisabled || check(field.disabled, model)
}

/** The fields that are currently shown. */
export function visibleSchemaFields<C>(fields: MlSchemaField<C>[], model: MlSchemaModel): MlSchemaField<C>[] {
  return fields.filter((f) => isSchemaFieldVisible(f, model))
}

/** A copy of the model without `path`. */
function deleteSchemaValue(model: MlSchemaModel, path: string): MlSchemaModel {
  const [head, ...rest] = path.split('.')
  if (!(head in model)) return model
  const copy = { ...model }
  const inner = model[head]
  if (!rest.length) delete copy[head]
  else if (inner && typeof inner === 'object') copy[head] = deleteSchemaValue(inner as MlSchemaModel, rest.join('.'))
  return copy
}

/** The model without the values of hidden fields — handy before sending it off. */
export function stripHiddenFields(fields: MlSchemaField<unknown>[], model: MlSchemaModel): MlSchemaModel {
  return fields.reduce((next, field) => (isSchemaFieldVisible(field, model) ? next : deleteSchemaValue(next, field.field)), model)
}

// A 地址 is an object, so "required" means its key parts are filled in.
const addressDone = (v: unknown) => {
  const a = (v ?? {}) as Record<string, unknown>
  return ['county', 'district', 'road', 'number'].every((k) => typeof a[k] === 'string' && (a[k] as string).trim() !== '')
}

/** The rules a field validates with: `required` first, then its own `rules`. */
export function schemaFieldRules(field: MlSchemaField<unknown>): MlFormRule[] {
  const own = toRuleList(field.rules)
  if (!field.required) return own
  const message = field.requiredMessage
  const required: MlFormRule =
    schemaFieldType(field) === 'address'
      ? { required: true, validator: addressDone, message: message ?? ((locale) => locale.form.required) }
      : { required: true, ...(message ? { message } : {}) }
  return [required, ...own]
}

/** Every field's rules keyed by path, for a hand-written MlForm / <Form>. */
export function schemaRules(fields: MlSchemaField<unknown>[]): MlFormRules {
  return Object.fromEntries(fields.map((f) => [f.field, schemaFieldRules(f)]).filter(([, rules]) => rules.length))
}

/** Grid columns a field takes, clamped to the form's column count. */
export function schemaSpan(field: MlSchemaField<unknown>, columns: number): number {
  const cols = Math.max(1, Math.floor(columns) || 1)
  if (field.span === 'full') return cols
  return Math.min(cols, Math.max(1, Math.floor(field.span ?? 1) || 1))
}

export interface SchemaControlOptions {
  size?: string
  disabled?: boolean
}

/**
 * The props a field's control gets (besides its value). The label and help go to
 * the control itself unless it sits in an MlField (switch, radio group).
 */
export function schemaControlProps(field: MlSchemaField<unknown>, options: SchemaControlOptions = {}): Record<string, unknown> {
  const spec = SCHEMA_FIELD_TYPES[schemaFieldType(field)]
  const bits: Record<string, unknown> = {}
  if (spec.frame !== 'field') {
    if (field.label !== undefined) bits.label = field.label
    if (field.help !== undefined) bits.hint = field.help
  }
  if (spec.placeholder && field.placeholder !== undefined) bits.placeholder = field.placeholder
  if (spec.options || (schemaFieldType(field) === 'custom' && field.options)) bits.options = field.options ?? []
  if (spec.size && options.size) bits.size = options.size
  if (options.disabled) bits.disabled = true
  return { ...bits, ...field.props }
}

/* ── Wizard ──────────────────────────────────────────── */

/** `true` / nothing passes; `false` or a message stops the step. */
export type MlWizardCheck = boolean | string | void | undefined | null

export interface MlWizardStep<C = unknown> {
  /** Names the step's slot (`#step-<key>`). Default: its index. */
  key?: string
  title: string
  description?: string
  /**
   * Validate only these paths before moving on — needed when other steps' fields
   * stay mounted. By default every field on the current step is checked.
   */
  fields?: string[]
  /** Extra check after the fields pass; a string is shown as the step's error. May be async. */
  validate?: (model: MlSchemaModel) => MlWizardCheck | Promise<MlWizardCheck>
  /** Fields rendered by the wizard itself (an MlSchemaForm schema). */
  schema?: MlSchemaField<C>[]
}

export const wizardStepKey = (step: MlWizardStep<unknown>, index: number) => step.key ?? String(index)

export type WizardStepState = 'done' | 'current' | 'todo'

export function wizardStepState(index: number, current: number): WizardStepState {
  return index < current ? 'done' : index === current ? 'current' : 'todo'
}

/**
 * Whether the header lets you jump to a step: back to any earlier one, forward only
 * to steps you already reached (the current one is validated first). `linear: false`
 * opens every step.
 */
export function canJumpToStep(index: number, current: number, reached: number, linear = true): boolean {
  if (index === current) return false
  if (!linear || index < current) return true
  return index <= reached
}

/** Every schema field of every step. */
export function wizardSchemaFields<C>(steps: MlWizardStep<C>[]): MlSchemaField<C>[] {
  return steps.flatMap((s) => s.schema ?? [])
}

/** What a step's `validate` result means: pass, or the message to show (empty string = fail silently). */
export function wizardCheckResult(result: MlWizardCheck): { ok: boolean; message?: string } {
  if (result === false) return { ok: false }
  if (typeof result === 'string' && result) return { ok: false, message: result }
  return { ok: true }
}
