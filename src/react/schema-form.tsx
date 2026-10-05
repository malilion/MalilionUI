import { forwardRef, useEffect, useId, useImperativeHandle, useMemo, useRef, useState, type ComponentType, type CSSProperties, type ReactNode } from 'react'
import { getPath, type MlFormErrors, type MlFormRules } from '../form-rules'
import {
  applySchemaDefaults,
  canJumpToStep,
  cloneSchemaValue,
  isSchemaFieldDisabled,
  schemaControlProps,
  schemaFieldRules,
  schemaFieldType,
  schemaSpan,
  setSchemaValue,
  visibleSchemaFields,
  wizardCheckResult,
  wizardSchemaFields,
  wizardStepKey,
  wizardStepState,
  type MlSchemaField,
  type MlSchemaFieldType,
  type MlSchemaModel,
  type MlWizardStep,
} from '../components/schema-form'
import type { MlSize } from '../types'
import { TaiwanAddress } from './address'
import { Button, Icon, Paw } from './basic'
import { CheckboxGroup } from './choice'
import { Checkbox, Field, Input, RadioGroup, Switch, Textarea } from './form'
import { NumberInput } from './inputs'
import { AmountInput, InputMask } from './keypad'
import { useLocale } from './locale'
import { DatePicker } from './pickers'
import { TaiwanRegion } from './region'
import { Combobox, Select } from './select'
import { cx, useControllable } from './utils'
import { Form, FormItem, type FormHandle } from './validation'

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), ' +
  'textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyComponent = ComponentType<any>

/** A schema field; `component` is your own control (gets value + onChange, label, hint, placeholder, disabled, options). */
export type SchemaField = MlSchemaField<AnyComponent>
export type WizardStep = MlWizardStep<AnyComponent>

export interface SchemaFieldApi {
  value: unknown
  update: (value: unknown) => void
  model: MlSchemaModel
  disabled: boolean
}

/** A custom control for some fields; return undefined to keep the built-in one. */
export type SchemaFieldRenderer = (field: MlSchemaField, api: SchemaFieldApi) => ReactNode

/** Built-in controls, and whether they take `checked` instead of `value`. */
const CONTROLS: Partial<Record<MlSchemaFieldType, { C: AnyComponent; checked?: boolean }>> = {
  text: { C: Input },
  textarea: { C: Textarea },
  number: { C: NumberInput },
  amount: { C: AmountInput },
  mask: { C: InputMask },
  select: { C: Select },
  combobox: { C: Combobox },
  checkbox: { C: Checkbox, checked: true },
  'checkbox-group': { C: CheckboxGroup },
  date: { C: DatePicker },
  region: { C: TaiwanRegion },
  address: { C: TaiwanAddress },
}

const EMPTY_MODEL: MlSchemaModel = {}

/* ── SchemaFields (the grid, shared by SchemaForm and Wizard) ── */

interface SchemaFieldsProps {
  fields: MlSchemaField[]
  model: MlSchemaModel
  onUpdate: (path: string, value: unknown) => void
  columns?: number
  labelPosition?: 'top' | 'left'
  labelWidth?: string
  size?: MlSize
  disabled?: boolean
  renderField?: SchemaFieldRenderer
}

function SchemaFields({ fields, model, onUpdate, columns = 1, labelPosition = 'top', labelWidth, size = 'md', disabled = false, renderField }: SchemaFieldsProps) {
  const autoId = useId().replace(/[^\w-]/g, '')
  const cols = Math.max(1, Math.floor(columns) || 1)
  return (
    <div
      className={cx('ml-schema-form__grid', `ml-schema-form__grid--label-${labelPosition}`)}
      style={{ '--ml-schema-columns': cols, '--ml-schema-label-width': labelWidth } as CSSProperties}
    >
      {visibleSchemaFields(fields, model).map((f) => {
        const type = schemaFieldType(f)
        const id = `ml-schema-${autoId}-${f.field.replace(/\W/g, '-')}`
        const value = getPath(model, f.field)
        const off = isSchemaFieldDisabled(f, model, disabled)
        // Disabled fields can't be fixed by the user, so they aren't validated.
        const rules = off ? [] : schemaFieldRules(f)
        const required = rules.some((r) => r.required)
        const update = (v: unknown) => onUpdate(f.field, v)
        const props = schemaControlProps(f, { size, disabled: off })
        const custom = renderField?.(f, { value, update, model, disabled: off })
        let control: ReactNode
        if (custom !== undefined) control = custom
        else if (type === 'switch')
          control = (
            <Field controlId={id} label={f.label} hint={f.help} required={required}>
              <Switch {...props} id={id} checked={value as boolean} onChange={update} />
            </Field>
          )
        else if (type === 'radio')
          control = (
            <Field controlId={id} label={f.label} hint={f.help} required={required}>
              <RadioGroup {...props} aria-labelledby={f.label ? `${id}-label` : undefined} value={value as string | number} onChange={update} />
            </Field>
          )
        else {
          const spec = type === 'custom' ? (f.component ? { C: f.component as AnyComponent, checked: false } : undefined) : CONTROLS[type]
          if (spec) control = spec.checked ? <spec.C {...props} checked={value} onChange={update} /> : <spec.C {...props} value={value} onChange={update} />
        }
        return (
          <div key={f.field} className={cx('ml-schema-form__item', `ml-schema-form__item--${type}`)} style={{ '--ml-schema-span': schemaSpan(f, cols) } as CSSProperties}>
            <FormItem prop={f.field} rules={rules}>
              {control}
            </FormItem>
          </div>
        )
      })}
    </div>
  )
}

/* ── SchemaForm ──────────────────────────────────────── */

export interface SchemaFormHandle extends FormHandle {
  /** Put fields (all, or just the given paths) back to their first values and clear their errors. */
  resetFields(paths?: string[]): void
}

export interface SchemaFormProps {
  /** The fields, in order (`SchemaField` types `component` as a React component). */
  schema: MlSchemaField[]
  value?: MlSchemaModel
  defaultValue?: MlSchemaModel
  onChange?: (model: MlSchemaModel) => void
  /** Extra rules by path, on top of each field's own. */
  rules?: MlFormRules
  /** Grid columns; fields take `span` of them. Collapses to one column on narrow screens. */
  columns?: number
  labelPosition?: 'top' | 'left'
  /** Width of the label column when labels sit on the left, e.g. "8em". */
  labelWidth?: string
  size?: MlSize
  /** Disable every field (they then skip validation). */
  disabled?: boolean
  /** Show the submit / reset buttons. Default true. */
  actions?: boolean
  /** Spinner on the submit button, e.g. while saving. */
  loading?: boolean
  submitText?: string
  resetText?: string
  /** Every visible field passed. */
  onSubmit?: (model: MlSchemaModel) => void
  /** At least one field failed; focus has moved to the first one. */
  onInvalid?: (errors: MlFormErrors) => void
  /** resetFields() ran (also the reset button). */
  onReset?: (model: MlSchemaModel) => void
  renderField?: SchemaFieldRenderer
  /** Replaces the buttons. */
  renderActions?: (api: { reset: () => void; loading: boolean }) => ReactNode
  /** Extra content after the fields. */
  children?: ReactNode
  className?: string
}

export const SchemaForm = forwardRef<SchemaFormHandle, SchemaFormProps>(function SchemaForm(
  {
    schema,
    value,
    defaultValue = EMPTY_MODEL,
    onChange,
    rules,
    columns = 1,
    labelPosition = 'top',
    labelWidth,
    size = 'md',
    disabled = false,
    actions = true,
    loading = false,
    submitText,
    resetText,
    onSubmit,
    onInvalid,
    onReset,
    renderField,
    renderActions,
    children,
    className,
  },
  ref,
) {
  const loc = useLocale()
  const [raw, set] = useControllable(value, defaultValue, onChange)
  /** The model with every field's default filled in — what is shown and validated. */
  const model = useMemo(() => applySchemaDefaults(schema, raw), [schema, raw])
  const latest = useRef(model)
  latest.current = model
  const initial = useRef<MlSchemaModel>(undefined)
  if (!initial.current) initial.current = cloneSchemaValue(model)
  const form = useRef<FormHandle>(null)

  // Hand the defaults back once, so the parent's object matches the screen.
  useEffect(() => {
    if (latest.current !== raw) set(latest.current)
  }, [])

  const update = (path: string, v: unknown) => {
    const next = setSchemaValue(latest.current, path, v)
    latest.current = next
    set(next)
  }

  const clearValidation = (paths?: string[]) => form.current?.clearValidation(paths)
  function resetFields(paths?: string[]) {
    // Clear first, so the value change below doesn't re-validate.
    clearValidation(paths)
    const first = initial.current!
    const next = paths ? paths.reduce((m, p) => setSchemaValue(m, p, cloneSchemaValue(getPath(first, p))), latest.current) : cloneSchemaValue(first)
    latest.current = next
    set(next)
    onReset?.(next)
  }

  useImperativeHandle(ref, () => ({
    validate: () => form.current?.validate() ?? Promise.resolve(true),
    validateField: (path) => form.current?.validateField(path) ?? Promise.resolve(undefined),
    clearValidation,
    clearValidate: clearValidation,
    resetFields,
  }))

  return (
    <Form ref={form} model={model} rules={rules} className={cx('ml-schema-form', className)} onSubmit={() => onSubmit?.(latest.current)} onInvalid={onInvalid}>
      <SchemaFields
        fields={schema}
        model={model}
        onUpdate={update}
        columns={columns}
        labelPosition={labelPosition}
        labelWidth={labelWidth}
        size={size}
        disabled={disabled}
        renderField={renderField}
      />
      {children}
      {actions && (
        <div className="ml-schema-form__actions">
          {renderActions ? (
            renderActions({ reset: () => resetFields(), loading })
          ) : (
            <>
              <Button variant="ghost" size={size} disabled={disabled || loading} onClick={() => resetFields()}>
                {resetText ?? loc.schemaForm.reset}
              </Button>
              <Button type="submit" size={size} disabled={disabled} loading={loading}>
                {submitText ?? loc.schemaForm.submit}
              </Button>
            </>
          )}
        </div>
      )}
    </Form>
  )
})

/* ── Wizard ──────────────────────────────────────────── */

export interface WizardStepApi {
  step: MlWizardStep
  index: number
  model: MlSchemaModel
  update: (path: string, value: unknown) => void
  next: () => Promise<void>
  prev: () => void
}

export interface WizardHandle {
  /** Validate the current step and move on (or submit on the last one). */
  next(): Promise<void>
  /** Back one step. Never validates. */
  prev(): void
  /** Jump to a step: back freely, forward only after the current step passes. */
  goTo(index: number): Promise<void>
  /** Validate the current step: its fields, then its `validate`, then `beforeNext`. */
  validateStep(): Promise<boolean>
  /** Back to the first step with the first values. */
  reset(): void
}

export interface WizardProps {
  steps: MlWizardStep[]
  value?: MlSchemaModel
  defaultValue?: MlSchemaModel
  onChange?: (model: MlSchemaModel) => void
  /** Index of the step shown. */
  current?: number
  defaultCurrent?: number
  /** The current step changed. */
  onCurrentChange?: (current: number, previous: number) => void
  /** Rules by path, for fields written by hand in the step content. */
  rules?: MlFormRules
  /** Only let the header jump forward to steps already reached. false: every step is open. */
  linear?: boolean
  /** Runs after a step's fields pass, before moving on (also before submit). Return false to stay. */
  beforeNext?: (step: number, model: MlSchemaModel) => boolean | void | Promise<boolean | void>
  /** Runs on submit, e.g. saving to the server: the button spins until it settles; false or a throw stays on the step. */
  action?: (model: MlSchemaModel) => unknown
  /** The last step passed. */
  onSubmit?: (model: MlSchemaModel) => void
  /** Submitted and `action` (if any) succeeded. */
  onFinish?: (model: MlSchemaModel) => void
  /** Spinner on the main button, and both buttons locked. */
  loading?: boolean
  /** Layout of schema steps (see SchemaForm). */
  columns?: number
  labelPosition?: 'top' | 'left'
  labelWidth?: string
  size?: MlSize
  /** Accessible name of the step list. */
  label?: string
  prevText?: string
  nextText?: string
  submitText?: string
  /** Content of each step, by its `key` (or index). Schema steps fall back to their fields. */
  renderStep?: (api: WizardStepApi) => ReactNode
  renderField?: SchemaFieldRenderer
  /** Shown under every step's own content. */
  children?: ReactNode | ((api: WizardStepApi) => ReactNode)
  /** Replaces the form once finished. */
  renderFinish?: (api: { model: MlSchemaModel; reset: () => void }) => ReactNode
  className?: string
}

export const Wizard = forwardRef<WizardHandle, WizardProps>(function Wizard(
  {
    steps,
    value,
    defaultValue = EMPTY_MODEL,
    onChange,
    current: currentProp,
    defaultCurrent = 0,
    onCurrentChange,
    rules,
    linear = true,
    beforeNext,
    action,
    onSubmit,
    onFinish,
    loading = false,
    columns = 1,
    labelPosition = 'top',
    labelWidth,
    size = 'md',
    label,
    prevText,
    nextText,
    submitText,
    renderStep,
    renderField,
    children,
    renderFinish,
    className,
  },
  ref,
) {
  const loc = useLocale()
  const [raw, set] = useControllable(value, defaultValue, onChange)
  const model = useMemo(() => applySchemaDefaults(wizardSchemaFields(steps), raw), [steps, raw])
  const latest = useRef(model)
  latest.current = model
  const initial = useRef<MlSchemaModel>(undefined)
  if (!initial.current) initial.current = cloneSchemaValue(model)
  useEffect(() => {
    if (latest.current !== raw) set(latest.current)
  }, [])

  const [current, setCurrent] = useControllable(currentProp, defaultCurrent)
  const currentRef = useRef(current)
  currentRef.current = current
  /** Furthest step reached by passing the ones before it. */
  const [reached, setReached] = useState(current)
  if (current > reached) setReached(current)
  /** A step check is running: buttons ignore clicks, without a spinner flashing by. */
  const [checking, setChecking] = useState(false)
  /** `action` is running. */
  const [saving, setSaving] = useState(false)
  const [stepError, setStepError] = useState<string>()
  const [finished, setFinished] = useState(false)
  const busy = useRef(false)
  const form = useRef<FormHandle>(null)
  const panel = useRef<HTMLElement>(null)
  const moved = useRef(false)

  const step = steps[current]
  const last = current >= steps.length - 1
  const locked = checking || saving || loading
  const spinning = saving || loading
  const stateOf = (i: number) => (finished ? 'done' : wizardStepState(i, current))
  const canJump = (i: number) => !finished && canJumpToStep(i, current, reached, linear)

  const update = (path: string, v: unknown) => {
    const next = setSchemaValue(latest.current, path, v)
    latest.current = next
    set(next)
  }

  // After a move: the new step's fields start clean, and focus lands on its panel.
  useEffect(() => {
    if (!moved.current) return
    moved.current = false
    form.current?.clearValidation()
    panel.current?.focus({ preventScroll: true })
  }, [current])

  function focusFirstError() {
    setTimeout(() => {
      const item = panel.current?.querySelector<HTMLElement>('.ml-form-item--error')
      const control = item?.querySelector<HTMLElement>('[aria-invalid="true"]') ?? item?.querySelector<HTMLElement>(FOCUSABLE)
      control?.focus({ preventScroll: true })
      item?.scrollIntoView?.({ block: 'center', behavior: 'smooth' })
    })
  }

  async function validateStep(): Promise<boolean> {
    const s = steps[currentRef.current]
    if (!s || !form.current) return false
    setStepError(undefined)
    busy.current = true
    setChecking(true)
    try {
      const f = form.current
      const ok = s.fields ? (await Promise.all(s.fields.map((p) => f.validateField(p)))).every((m) => !m) : await f.validate()
      if (!ok) {
        focusFirstError()
        return false
      }
      if (s.validate) {
        const result = wizardCheckResult(await s.validate(latest.current))
        if (!result.ok) {
          setStepError(result.message)
          return false
        }
      }
      return !beforeNext || (await beforeNext(currentRef.current, latest.current)) !== false
    } finally {
      busy.current = false
      setChecking(false)
    }
  }

  function move(to: number) {
    const from = currentRef.current
    setStepError(undefined)
    moved.current = true
    currentRef.current = to
    setCurrent(to)
    setReached((r) => Math.max(r, to))
    onCurrentChange?.(to, from)
  }

  async function submit() {
    onSubmit?.(latest.current)
    if (action) {
      busy.current = true
      setSaving(true)
      try {
        if ((await action(latest.current)) === false) return
      } finally {
        busy.current = false
        setSaving(false)
      }
    }
    setFinished(true)
    onFinish?.(latest.current)
  }

  const isLocked = () => busy.current || loading
  async function next() {
    if (isLocked() || finished) return
    if (!(await validateStep())) return
    if (currentRef.current >= steps.length - 1) await submit()
    else move(currentRef.current + 1)
  }
  function prev() {
    if (isLocked() || currentRef.current === 0) return
    move(currentRef.current - 1)
  }
  async function goTo(index: number) {
    if (isLocked() || !canJump(index)) return
    if (index > currentRef.current && linear && !(await validateStep())) return
    move(index)
  }
  function reset() {
    setFinished(false)
    setStepError(undefined)
    const first = cloneSchemaValue(initial.current!)
    latest.current = first
    set(first)
    setReached(0)
    if (currentRef.current !== 0) move(0)
    else setTimeout(() => form.current?.clearValidation())
  }

  useImperativeHandle(ref, () => ({ next, prev, goTo, validateStep, reset }))

  const api: WizardStepApi = { step, index: current, model, update, next, prev }
  const own = step ? renderStep?.(api) : undefined

  return (
    <div
      className={cx('ml-wizard', className, { 'ml-wizard--finished': finished })}
      onSubmitCapture={(event) => {
        // Enter in a field or the main button: run the step logic instead of a plain form submit.
        event.preventDefault()
        event.stopPropagation()
        next()
      }}
    >
      <ol className="ml-steps ml-wizard__steps" aria-label={label ?? loc.wizard.label}>
        {steps.map((s, i) => {
          const state = stateOf(i)
          return (
            <li
              key={wizardStepKey(s, i)}
              className={cx('ml-steps__item', `ml-steps__item--${state}`, { 'ml-wizard__item--open': canJump(i) })}
              aria-current={i === current && !finished ? 'step' : undefined}
            >
              <button type="button" className="ml-wizard__step" disabled={locked || !canJump(i)} onClick={() => goTo(i)}>
                <span className="ml-steps__marker">{state === 'done' ? <Paw tone="current" /> : i + 1}</span>
                <span className="ml-steps__text">
                  <span className="ml-steps__title">{s.title}</span>
                  {s.description && <span className="ml-steps__desc">{s.description}</span>}
                  <span className="ml-visually-hidden">{state === 'done' ? loc.nav.stepDone : state === 'current' ? loc.nav.stepCurrent : ''}</span>
                </span>
              </button>
            </li>
          )
        })}
      </ol>
      {finished && renderFinish ? (
        <div className="ml-wizard__finish">{renderFinish({ model, reset })}</div>
      ) : (
        <Form ref={form} model={model} rules={rules} className="ml-wizard__form">
          {step && (
            <section key={current} ref={panel} className="ml-wizard__panel" role="group" aria-label={loc.wizard.stepOf(current + 1, steps.length, step.title)} tabIndex={-1}>
              {own !== undefined ? (
                own
              ) : step.schema ? (
                <SchemaFields
                  fields={step.schema}
                  model={model}
                  onUpdate={update}
                  columns={columns}
                  labelPosition={labelPosition}
                  labelWidth={labelWidth}
                  size={size}
                  renderField={renderField}
                />
              ) : null}
              {typeof children === 'function' ? children(api) : children}
            </section>
          )}
          {stepError && (
            <p className="ml-wizard__error" role="alert">
              <Icon name="warning" />
              {stepError}
            </p>
          )}
          <div className="ml-wizard__actions">
            {current > 0 && (
              <Button variant="ghost" size={size} disabled={locked} onClick={prev}>
                <Icon name="chevronLeft" />
                {prevText ?? loc.wizard.prev}
              </Button>
            )}
            <Button type="submit" size={size} loading={spinning}>
              {last ? (submitText ?? loc.wizard.submit) : (nextText ?? loc.wizard.next)}
              {!last && <Icon name="chevronRight" />}
            </Button>
          </div>
        </Form>
      )}
    </div>
  )
})
