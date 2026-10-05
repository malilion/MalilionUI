import {
  createContext,
  forwardRef,
  useContext,
  useEffect,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react'
import { getPath, toRuleList, validateValue, type MlFormErrors, type MlFormRule, type MlFormRules } from '../form-rules'
import { Icon } from './basic'
import { useLocale } from './locale'
import { cx } from './utils'

export type { MlFormErrors, MlFormRule, MlFormRules, MlValidatorResult } from '../form-rules'

const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), ' +
  'textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/* ── Context wiring (mirrors src/form.ts) ──────────────── */

interface FormItemHandle {
  prop: string
  el: () => HTMLElement | null
  validate: () => Promise<string | undefined>
  reset: () => void
}

interface FormContext {
  model: () => Record<string, unknown>
  rulesFor: (prop: string) => MlFormRule[]
  /** Becomes true after the first submit; fields then re-validate as they change. */
  submitted: { current: boolean }
  register: (item: FormItemHandle) => () => void
}

interface FieldContext {
  error?: string
  required: boolean
  /** A control that shows the error itself calls this, so FormItem doesn't repeat it. */
  claim: () => () => void
}

const FormCtx = createContext<FormContext | null>(null)
const FieldCtx = createContext<FieldContext | null>(null)

/**
 * For controls that render their own error (Input, Select…): merges an explicit
 * `error` / `required` prop with what the surrounding FormItem knows.
 */
export function useFormField(props: { error?: string; required?: boolean }) {
  const field = useContext(FieldCtx)
  const claim = field?.claim
  useIsoLayoutEffect(() => claim?.(), [claim])
  return {
    error: props.error || field?.error || undefined,
    required: props.required || field?.required || false,
  }
}

/**
 * For controls made of other controls (e.g. TaiwanAddress): the parts inside don't
 * pick up the surrounding FormItem's error, which the whole control shows once.
 */
export function FormFieldBoundary({ children }: { children?: ReactNode }) {
  return <FieldCtx.Provider value={null}>{children}</FieldCtx.Provider>
}

/** Deep-ish change detection for the watched value (Vue watches it deeply). */
function snapshot(value: unknown) {
  if (value === null || typeof value !== 'object') return value
  try {
    return JSON.stringify(value)
  } catch {
    return value
  }
}

/* ── Form ──────────────────────────────────────────────── */

export interface FormHandle {
  /** Validate every field. Resolves true when all pass. */
  validate(): Promise<boolean>
  /** Validate one field by its prop. Resolves to its error message, if any. */
  validateField(prop: string): Promise<string | undefined>
  /** Clear error messages (all, or just the given props) without touching values. */
  clearValidation(props?: string[]): void
  /** Alias of clearValidation. */
  clearValidate(props?: string[]): void
  /** Clear errors and hand `onReset` the model with those props (default: all) back at their first-render values. */
  resetFields(props?: string[]): void
}

export interface FormProps {
  /** The object the fields read from. Field `prop`s are paths into it. */
  model: Record<string, unknown>
  rules?: MlFormRules
  /** Every field passed. */
  onSubmit?: (model: Record<string, unknown>) => void
  /** At least one field failed; focus has moved to the first one. */
  onInvalid?: (errors: MlFormErrors) => void
  /** Called by `resetFields()` with the model to restore. */
  onReset?: (model: Record<string, unknown>) => void
  children?: ReactNode | ((api: { validate: () => Promise<boolean>; clearValidation: (props?: string[]) => void }) => ReactNode)
  className?: string
  id?: string
}

const clone = <T,>(v: T): T => {
  try {
    return structuredClone(v)
  } catch {
    return v
  }
}

function setPath(model: Record<string, unknown>, path: string, value: unknown): Record<string, unknown> {
  const [head, ...rest] = path.split('.')
  const base = Array.isArray(model) ? [...model] : { ...model }
  ;(base as Record<string, unknown>)[head] = rest.length ? setPath(((model as Record<string, unknown>)[head] ?? {}) as Record<string, unknown>, rest.join('.'), value) : value
  return base as Record<string, unknown>
}

export const Form = forwardRef<FormHandle, FormProps>(function Form({ model, rules, onSubmit, onInvalid, onReset, children, className, id }, ref) {
  const items = useRef(new Set<FormItemHandle>())
  const submitted = useRef(false)
  const latest = useRef({ model, rules })
  latest.current = { model, rules }
  const initial = useRef<Record<string, unknown>>(undefined)
  if (!initial.current) initial.current = clone(model)

  const [ctx] = useState<FormContext>(() => ({
    model: () => latest.current.model,
    rulesFor: (prop) => toRuleList(latest.current.rules?.[prop]),
    submitted,
    register(item) {
      items.current.add(item)
      return () => void items.current.delete(item)
    },
  }))

  /** Items in document order, so "first error" means the topmost one. */
  const ordered = () =>
    [...items.current].sort((a, b) => {
      const ea = a.el()
      const eb = b.el()
      if (!ea || !eb) return 0
      return ea.compareDocumentPosition(eb) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1
    })

  async function collectErrors(): Promise<MlFormErrors> {
    const list = ordered()
    const results = await Promise.all(list.map((item) => item.validate()))
    const errors: MlFormErrors = {}
    list.forEach((item, i) => {
      if (results[i]) errors[item.prop] = results[i]!
    })
    return errors
  }

  async function validate() {
    submitted.current = true
    return Object.keys(await collectErrors()).length === 0
  }

  function clearValidation(propsToClear?: string[]) {
    if (!propsToClear) submitted.current = false
    for (const item of items.current) if (!propsToClear || propsToClear.includes(item.prop)) item.reset()
  }

  const api: FormHandle = {
    validate,
    validateField: async (prop) => [...items.current].find((i) => i.prop === prop)?.validate(),
    clearValidation,
    clearValidate: clearValidation,
    resetFields(propsToReset) {
      clearValidation(propsToReset)
      const first = initial.current!
      const next = propsToReset
        ? propsToReset.reduce((m, p) => setPath(m, p, clone(getPath(first, p))), latest.current.model)
        : clone(first)
      onReset?.(next)
    },
  }
  useImperativeHandle(ref, () => api)

  async function focusFirstError(errors: MlFormErrors) {
    await new Promise((r) => setTimeout(r))
    const first = ordered().find((item) => errors[item.prop])?.el()
    if (!first) return
    const control = first.querySelector<HTMLElement>('[aria-invalid="true"]') ?? first.querySelector<HTMLElement>(FOCUSABLE)
    control?.focus({ preventScroll: true })
    first.scrollIntoView?.({ block: 'center', behavior: 'smooth' })
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    submitted.current = true
    const errors = await collectErrors()
    if (Object.keys(errors).length) {
      onInvalid?.(errors)
      focusFirstError(errors)
    } else onSubmit?.(latest.current.model)
  }

  return (
    <form id={id} className={cx('ml-form', className)} noValidate onSubmit={handleSubmit}>
      <FormCtx.Provider value={ctx}>{typeof children === 'function' ? children({ validate, clearValidation }) : children}</FormCtx.Provider>
    </form>
  )
})

/* ── FormItem ──────────────────────────────────────────── */

export interface FormItemProps {
  /** Path of this field's value in the form model, e.g. "email" or "address.city". */
  prop: string
  /** Extra rules, checked after the ones the form gives for this prop. */
  rules?: MlFormRule | MlFormRule[]
  children?: ReactNode | ((api: { error: string | undefined; validate: () => Promise<string | undefined> }) => ReactNode)
  className?: string
}

export function FormItem({ prop, rules, children, className }: FormItemProps) {
  const form = useContext(FormCtx)
  const locale = useLocale()
  const root = useRef<HTMLDivElement>(null)
  const [error, setErrorState] = useState<string>()
  const errorRef = useRef<string>(undefined)
  const [claims, setClaims] = useState(0)
  /** Blurred at least once; from then on the field re-checks as it changes. */
  const touched = useRef(false)
  const run = useRef(0)
  const errorId = `ml-form-item-${useId().replace(/[^\w-]/g, '')}-error`

  const allRules = [...(form?.rulesFor(prop) ?? []), ...toRuleList(rules)]
  const value = form ? getPath(form.model(), prop) : undefined
  const latest = useRef({ allRules, locale, prop })
  latest.current = { allRules, locale, prop }

  const setError = (message: string | undefined) => {
    errorRef.current = message
    setErrorState(message)
  }

  const validate = useRef(async () => {
    const id = ++run.current
    const model = form?.model() ?? {}
    const message = await validateValue(getPath(model, latest.current.prop), latest.current.allRules, model, latest.current.locale)
    // A slower async check must not overwrite a newer result.
    if (id === run.current) setError(message)
    return message
  }).current

  useEffect(() => {
    if (!form) return
    return form.register({
      prop,
      el: () => root.current,
      validate,
      reset() {
        run.current++
        setError(undefined)
        touched.current = false
      },
    })
  }, [form, prop])

  const watched = snapshot(value)
  const first = useRef(true)
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    if (touched.current || form?.submitted.current || errorRef.current) validate()
  }, [watched])

  const [field] = useState(() => ({
    claim: () => {
      setClaims((n) => n + 1)
      return () => setClaims((n) => n - 1)
    },
  }))
  const required = allRules.some((rule) => rule.required)

  return (
    <div
      ref={root}
      className={cx('ml-form-item', className, { 'ml-form-item--error': error })}
      data-prop={prop}
      onBlur={(event) => {
        // Moving between parts of the same control (e.g. into its option list) isn't a blur.
        if (root.current?.contains(event.relatedTarget as Node | null)) return
        touched.current = true
        validate()
      }}
    >
      <FieldCtx.Provider value={{ error, required, claim: field.claim }}>{typeof children === 'function' ? children({ error, validate }) : children}</FieldCtx.Provider>
      {error && !claims && (
        <p id={errorId} className="ml-field__error">
          <Icon name="warning" />
          {error}
        </p>
      )}
    </div>
  )
}
