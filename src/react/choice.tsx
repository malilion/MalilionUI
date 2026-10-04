// CheckboxGroup + PasswordInput — React twins of MlCheckboxGroup / MlPasswordInput.
import { useCallback, useId, useMemo, useState, type InputHTMLAttributes, type KeyboardEvent, type ReactNode } from 'react'
import { checkPasswordRules, resolvePasswordRules, scorePassword, type MlPasswordRules } from '../components/password'
import type { MlCheckboxOption, MlSize } from '../types'
import { Icon } from './basic'
import { CheckboxGroupCtx, type CheckboxGroupContext, type CheckboxValue } from './checkbox-context'
import { Checkbox, Field } from './form'
import { useLocale } from './locale'
import { cx, describedBy, useControllable } from './utils'
import { useFormField } from './validation'

export type { MlPasswordRules, MlPasswordScore, MlPasswordRuleKey, MlPasswordRuleResult } from '../components/password'
export { scorePassword, checkPasswordRules } from '../components/password'

const cleanId = (id: string) => id.replace(/[^\w-]/g, '')

/* ── CheckboxGroup ─────────────────────────────────────── */

export interface CheckboxGroupProps {
  value?: CheckboxValue[]
  defaultValue?: CheckboxValue[]
  onChange?: (value: CheckboxValue[]) => void
  /** Shortcut for rendering one <Checkbox> per option. Or pass <Checkbox value> children. */
  options?: MlCheckboxOption[]
  label?: ReactNode
  hint?: string
  error?: string
  /** HUD prefix before the label, e.g. "01". */
  index?: string
  required?: boolean
  disabled?: boolean
  /** Native name given to every box, for plain form posts. */
  name?: string
  /** "card" turns each option into a selectable plate. */
  variant?: 'default' | 'card'
  direction?: 'row' | 'column'
  /** At least this many must stay checked (checked boxes lock at the limit). */
  min?: number
  /** At most this many; the unchecked rest disable once reached. */
  max?: number
  /** Add a "select all" box with an indeterminate state. A string replaces its label. */
  checkAll?: boolean | string
  /** Stamp paw prints instead of check marks. */
  paw?: boolean
  id?: string
  className?: string
  children?: ReactNode
}

const EMPTY: CheckboxValue[] = []

export function CheckboxGroup({
  value,
  defaultValue = EMPTY,
  onChange,
  options,
  label,
  hint,
  error: errorProp,
  index,
  required: requiredProp,
  disabled,
  name,
  variant = 'default',
  direction = 'row',
  min,
  max,
  checkAll,
  paw,
  id,
  className,
  children,
}: CheckboxGroupProps) {
  const { error, required } = useFormField({ error: errorProp, required: requiredProp })
  const loc = useLocale()
  const autoId = useId()
  const controlId = id ?? `ml-checkbox-group-${cleanId(autoId)}`
  const [current, set] = useControllable(value, defaultValue, onChange)

  /** Values announced by mounted children (children mode) and whether each is disabled. */
  const [registered, setRegistered] = useState<Map<CheckboxValue, boolean>>(() => new Map())
  const register = useCallback((v: CheckboxValue, isDisabled: boolean) => {
    setRegistered((m) => (m.get(v) === isDisabled && m.has(v) ? m : new Map(m).set(v, isDisabled)))
    return () =>
      setRegistered((m) => {
        if (!m.has(v)) return m
        const next = new Map(m)
        next.delete(v)
        return next
      })
  }, [])

  const enabledValues = useMemo<CheckboxValue[]>(
    () => (options ? options.filter((o) => !o.disabled).map((o) => o.value) : [...registered].filter(([, d]) => !d).map(([v]) => v)),
    [options, registered],
  )

  const count = current.length
  const atMax = max !== undefined && count >= max
  const atMin = min !== undefined && count <= min

  const ctx: CheckboxGroupContext = {
    name,
    isChecked: (v) => current.includes(v),
    isLocked: (v) => (disabled ? true : current.includes(v) ? atMin : atMax),
    toggle: (v, on) => {
      const has = current.includes(v)
      if (on && !has) {
        if (!atMax) set([...current, v])
      } else if (!on && has) {
        if (!atMin) set(current.filter((x) => x !== v))
      }
    },
    register,
  }

  const allChecked = enabledValues.length > 0 && enabledValues.every((v) => current.includes(v))
  const someChecked = !allChecked && enabledValues.some((v) => current.includes(v))

  function toggleAll(on: boolean) {
    const enabled = new Set(enabledValues)
    if (on) {
      const next = [...current]
      for (const v of enabledValues) {
        if (max !== undefined && next.length >= max) break
        if (!next.includes(v)) next.push(v)
      }
      set(next)
    } else {
      const keep = current.filter((v) => !enabled.has(v))
      const refill = current.filter((v) => enabled.has(v)).slice(0, Math.max(0, (min ?? 0) - keep.length))
      set([...keep, ...refill])
    }
  }

  const checkAllLocked = disabled || enabledValues.length === 0 || (allChecked ? atMin : atMax)

  return (
    <Field controlId={controlId} label={label} hint={hint} error={error} index={index} required={required} className={className}>
      <div
        id={controlId}
        role="group"
        className={cx('ml-check-group', `ml-check-group--${variant}`, `ml-check-group--${direction}`, {
          'ml-check-group--error': error,
          'ml-check-group--disabled': disabled,
        })}
        aria-labelledby={label ? `${controlId}-label` : undefined}
        aria-describedby={describedBy(controlId, hint, error)}
      >
        {checkAll && (
          <Checkbox
            className="ml-check-group__all"
            checked={allChecked}
            indeterminate={someChecked}
            label={typeof checkAll === 'string' ? checkAll : loc.checkboxGroup.all}
            paw={paw}
            disabled={checkAllLocked}
            onChange={toggleAll}
          />
        )}
        <div className="ml-check-group__items">
          <CheckboxGroupCtx.Provider value={ctx}>
            {children ?? options?.map((o) => <Checkbox key={o.value} value={o.value} label={o.label} hint={o.hint} disabled={o.disabled} paw={paw} />)}
          </CheckboxGroupCtx.Provider>
        </div>
      </div>
    </Field>
  )
}

/* ── PasswordInput ─────────────────────────────────────── */

export interface PasswordInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'prefix' | 'value' | 'defaultValue' | 'onChange' | 'type'> {
  label?: ReactNode
  hint?: string
  error?: string
  index?: string
  size?: MlSize
  value?: string
  defaultValue?: string
  onChange?: (value: string) => void
  prefix?: ReactNode
  /** "new-password" for sign-up / reset forms, "current-password" for sign-in. */
  autoComplete?: 'new-password' | 'current-password' | (string & {})
  /** Show the show/hide button. Default true. */
  toggle?: boolean
  /** Plain-text mode (controlled). */
  visible?: boolean
  defaultVisible?: boolean
  onVisibleChange?: (visible: boolean) => void
  /** Show the 4-bar strength meter. */
  strength?: boolean
  /** Checklist under the field; `true` = 8+ chars, upper, lower, digit, symbol. */
  rules?: boolean | MlPasswordRules
  /** Warn while Caps Lock is on. Default true. */
  capsLock?: boolean
}

export function PasswordInput({
  label,
  hint,
  error: errorProp,
  index,
  size = 'md',
  value,
  defaultValue = '',
  onChange,
  prefix,
  autoComplete = 'current-password',
  toggle = true,
  visible: visibleProp,
  defaultVisible = false,
  onVisibleChange,
  strength,
  rules,
  capsLock = true,
  id,
  required: requiredProp,
  disabled,
  readOnly,
  placeholder,
  className,
  style,
  onKeyDown,
  onKeyUp,
  onBlur,
  ...rest
}: PasswordInputProps) {
  const { error, required } = useFormField({ error: errorProp, required: requiredProp })
  const loc = useLocale()
  const autoId = useId()
  const controlId = id ?? `ml-password-${cleanId(autoId)}`
  const [current, set] = useControllable(value, defaultValue, onChange)
  const [visible, setVisible] = useControllable(visibleProp, defaultVisible, onVisibleChange)
  const [capsOn, setCapsOn] = useState(false)

  const password = current ?? ''
  const score = scorePassword(password)
  const ruleSet = resolvePasswordRules(rules)
  const ruleResults = ruleSet ? checkPasswordRules(password, ruleSet) : []
  const ruleLabel = (key: string, min?: number) =>
    key === 'length' ? loc.password.minLength(min ?? 0) : loc.password[key as 'upper' | 'lower' | 'digit' | 'symbol']

  function onKey(event: KeyboardEvent<HTMLInputElement>) {
    if (capsLock && typeof event.getModifierState === 'function') setCapsOn(event.getModifierState('CapsLock'))
  }

  const ids = [
    describedBy(controlId, hint, error),
    capsOn ? `${controlId}-caps` : undefined,
    strength ? `${controlId}-strength` : undefined,
    ruleSet ? `${controlId}-rules` : undefined,
  ].filter(Boolean)

  return (
    <Field controlId={controlId} label={label} hint={hint} error={error} index={index} required={required} className={className}>
      <div className={cx('ml-input', 'ml-password', `ml-input--${size}`, { 'ml-input--error': error, 'ml-input--disabled': disabled })} style={style}>
        {prefix && <span className="ml-input__affix">{prefix}</span>}
        <input
          id={controlId}
          className="ml-input__control"
          type={visible ? 'text' : 'password'}
          value={password}
          onChange={(e) => set(e.target.value)}
          autoComplete={autoComplete}
          autoCapitalize="off"
          spellCheck={false}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          readOnly={readOnly}
          aria-invalid={error ? true : undefined}
          aria-describedby={ids.length ? ids.join(' ') : undefined}
          onKeyDown={(e) => {
            onKey(e)
            onKeyDown?.(e)
          }}
          onKeyUp={(e) => {
            onKey(e)
            onKeyUp?.(e)
          }}
          onBlur={(e) => {
            setCapsOn(false)
            onBlur?.(e)
          }}
          {...rest}
        />
        {toggle && (
          <button
            type="button"
            className="ml-password__toggle"
            aria-pressed={visible}
            aria-label={visible ? loc.password.hide : loc.password.show}
            aria-controls={controlId}
            disabled={disabled}
            onClick={() => setVisible(!visible)}
          >
            <Icon name={visible ? 'eyeOff' : 'eye'} />
          </button>
        )}
      </div>
      {capsOn && (
        <p id={`${controlId}-caps`} className="ml-password__caps" role="status">
          <Icon name="warning" />
          {loc.password.capsLock}
        </p>
      )}
      {strength && (
        <div id={`${controlId}-strength`} className={cx('ml-password__meter', `ml-password__meter--${score}`)}>
          <span className="ml-password__bars" aria-hidden="true">
            {[1, 2, 3, 4].map((n) => (
              <span key={n} className={cx('ml-password__bar', { 'ml-password__bar--on': password && n <= score })} />
            ))}
          </span>
          <span className="ml-password__level">
            {loc.password.strength}
            <span className="ml-password__score">{password ? loc.password.levels[score] : '—'}</span>
          </span>
        </div>
      )}
      {ruleSet && (
        <ul id={`${controlId}-rules`} className="ml-password__rules" aria-label={loc.password.rules}>
          {ruleResults.map((rule) => (
            <li key={rule.key} className={cx('ml-password__rule', { 'ml-password__rule--ok': rule.ok })}>
              <Icon name={rule.ok ? 'check' : 'minus'} />
              {ruleLabel(rule.key, rule.min)}
              <span className="ml-visually-hidden">（{rule.ok ? loc.password.met : loc.password.unmet}）</span>
            </li>
          ))}
        </ul>
      )}
    </Field>
  )
}
