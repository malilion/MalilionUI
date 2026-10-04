import { useEffect, useId, useRef, useState, version, type FormEvent, type InputHTMLAttributes, type ReactNode } from 'react'
import { icons } from '../components/icons'
import {
  amountInChinese,
  amountSignificant,
  applyMask,
  formatAmount,
  formatAmountInput,
  maskInputMode,
  maskPlaceholder,
  maskSignificant,
  reformat,
  resolveMask,
  type MlMaskPreset,
  type MlMaskToken,
} from '../components/mask'
import {
  BACKSPACE_PATH,
  KEYBOARD_HOLD,
  KEYBOARD_REPEAT,
  keyboardAppend,
  keyboardDelete,
  keyboardLayout,
  shuffledDigits,
  type MlNumberKeyboardTheme,
  type NumberKeyboardKey,
} from '../components/number-keyboard'
import type { MlSize } from '../types'
import { Field } from './form'
import { useLocale } from './locale'
import { cx, describedBy, useControllable } from './utils'
import { useFormField } from './validation'

// React 19 takes `inert` as a boolean; React 18 only passes it through as a string.
const inert = (on: boolean) => (on ? ({ inert: parseInt(version, 10) >= 19 ? true : '' } as object) : {})

function useControlId(prefix: string, id?: string) {
  const auto = useId()
  return id ?? `${prefix}-${auto.replace(/[^\w-]/g, '')}`
}

type ControlAttrs = Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'prefix' | 'value' | 'defaultValue' | 'onChange' | 'type' | 'min' | 'max'>

/** Write the reformatted text and put the caret back — only while the field has focus. */
function place(el: HTMLInputElement, text: string, caret: number) {
  el.value = text
  if (el.ownerDocument.activeElement === el) el.setSelectionRange(caret, caret)
}

/* ── InputMask ─────────────────────────────────────────── */

export interface InputMaskProps extends ControlAttrs {
  /** `9` digit · `a` letter · `A` letter → uppercase · `*` letter/digit · `X` letter/digit → uppercase; `\` escapes. */
  mask?: string
  /** A ready-made Taiwan format. `mask` wins when both are set. */
  preset?: MlMaskPreset
  /** Extra or replacement slot characters. */
  tokens?: Record<string, MlMaskToken>
  /** The value is just the typed characters (0912345678). false: the formatted text (0912-345-678). */
  unmask?: boolean
  value?: string
  defaultValue?: string
  onChange?: (value: string) => void
  onComplete?: (raw: string, formatted: string) => void
  label?: ReactNode
  hint?: string
  error?: string
  index?: string
  size?: MlSize
  prefix?: ReactNode
  suffix?: ReactNode
}

export function InputMask({
  mask,
  preset,
  tokens,
  unmask = true,
  value,
  defaultValue = '',
  onChange,
  onComplete,
  label,
  hint,
  error: errorProp,
  index,
  size = 'md',
  prefix,
  suffix,
  placeholder,
  required: requiredProp,
  disabled,
  id,
  className,
  style,
  ...rest
}: InputMaskProps) {
  const { error, required } = useFormField({ error: errorProp, required: requiredProp })
  const controlId = useControlId('ml-mask', id)
  const [model, set] = useControllable(value, defaultValue, onChange)
  const parts = resolveMask(mask, preset, tokens)
  const display = applyMask(model ?? '', parts).formatted
  const input = useRef<HTMLInputElement>(null)

  // The input is uncontrolled (so an IME can compose freely); outside changes are pushed in.
  useEffect(() => {
    if (input.current && input.current.value !== display) input.current.value = display
  }, [display])

  function update(el: HTMLInputElement, inputType?: string) {
    const { text, caret } = reformat(
      { value: el.value, caret: el.selectionStart ?? el.value.length, inputType, previous: display },
      (t) => applyMask(t, parts).formatted,
      maskSignificant(parts),
    )
    place(el, text, caret)
    const result = applyMask(text, parts)
    set(unmask ? result.raw : result.formatted)
    if (result.complete && text !== display) onComplete?.(result.raw, result.formatted)
  }

  function onInput(e: FormEvent<HTMLInputElement>) {
    const native = e.nativeEvent as InputEvent
    // An IME (注音, 倉頡…) is still composing: format once compositionend fires.
    if (native.isComposing) return
    update(e.currentTarget, native.inputType)
  }

  return (
    <Field controlId={controlId} label={label} hint={hint} error={error} index={index} required={required} className={className}>
      <div className={cx('ml-input', `ml-input--${size}`, 'ml-mask', { 'ml-input--error': error, 'ml-input--disabled': disabled })} style={style}>
        {prefix && <span className="ml-input__affix">{prefix}</span>}
        <input
          id={controlId}
          ref={input}
          {...rest}
          className="ml-input__control ml-mask__control"
          type="text"
          inputMode={maskInputMode(parts)}
          defaultValue={display}
          placeholder={placeholder ?? maskPlaceholder(parts)}
          required={required}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(controlId, hint, error)}
          onInput={onInput}
          onCompositionEnd={(e) => update(e.currentTarget, 'insertText')}
        />
        {suffix && <span className="ml-input__affix">{suffix}</span>}
      </div>
    </Field>
  )
}

/* ── AmountInput ───────────────────────────────────────── */

export interface AmountInputProps extends ControlAttrs {
  /** null while the field is empty. */
  value?: number | null
  defaultValue?: number | null
  onChange?: (value: number | null) => void
  /** Digits after the decimal point. 0 = whole numbers. */
  decimals?: number
  /** Thousands separator. '' turns grouping off. */
  separator?: string
  allowNegative?: boolean
  /** Applied when the field loses focus, so typing "1" toward "100" isn't fought. */
  min?: number
  max?: number
  /** Shown before the number, e.g. "NT$". `prefix` replaces it. */
  currency?: string
  /** Spell the amount out below the field in 中文大寫 (壹萬貳仟元整). */
  capital?: boolean
  label?: ReactNode
  hint?: string
  error?: string
  index?: string
  size?: MlSize
  prefix?: ReactNode
  suffix?: ReactNode
}

export function AmountInput({
  value,
  defaultValue = null,
  onChange,
  decimals = 0,
  separator = ',',
  allowNegative = false,
  min = -Infinity,
  max = Infinity,
  currency,
  capital,
  label,
  hint,
  error: errorProp,
  index,
  size = 'md',
  prefix,
  suffix,
  required: requiredProp,
  disabled,
  id,
  className,
  style,
  onBlur,
  ...rest
}: AmountInputProps) {
  const loc = useLocale()
  const { error, required } = useFormField({ error: errorProp, required: requiredProp })
  const controlId = useControlId('ml-amount', id)
  const [model, set] = useControllable<number | null>(value, defaultValue, onChange)
  const options = { decimals, separator, allowNegative }
  const [text, setText] = useState(() => formatAmount(model, options))
  const input = useRef<HTMLInputElement>(null)

  // Outside changes (a reset, another field) replace the text; our own echoes don't.
  const shown = formatAmountInput(text, options).value === model ? text : formatAmount(model, options)
  useEffect(() => {
    if (shown !== text) setText(shown)
    if (input.current && input.current.value !== shown) input.current.value = shown
  })

  function onInput(e: FormEvent<HTMLInputElement>) {
    const el = e.currentTarget
    const { text: next, caret } = reformat(
      { value: el.value, caret: el.selectionStart ?? el.value.length, inputType: (e.nativeEvent as InputEvent).inputType, previous: shown },
      (t) => formatAmountInput(t, options).display,
      amountSignificant,
    )
    place(el, next, caret)
    setText(next)
    set(formatAmountInput(next, options).value)
  }

  const words = capital ? amountInChinese(model) : ''

  return (
    <Field controlId={controlId} label={label} hint={hint} error={error} index={index} required={required} className={className}>
      <div className={cx('ml-input', `ml-input--${size}`, 'ml-amount', { 'ml-input--error': error, 'ml-input--disabled': disabled })} style={style}>
        {(prefix || currency) && <span className="ml-input__affix ml-amount__currency">{prefix ?? currency}</span>}
        <input
          id={controlId}
          ref={input}
          {...rest}
          className="ml-input__control ml-amount__control"
          type="text"
          inputMode={allowNegative ? 'text' : decimals > 0 ? 'decimal' : 'numeric'}
          autoComplete="off"
          defaultValue={shown}
          required={required}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(controlId, hint, error)}
          onInput={onInput}
          onBlur={(e) => {
            const next = model === null ? null : Math.min(max, Math.max(min, model))
            set(next)
            const formatted = formatAmount(next, options)
            setText(formatted)
            e.currentTarget.value = formatted
            onBlur?.(e)
          }}
        />
        {suffix && <span className="ml-input__affix">{suffix}</span>}
      </div>
      {capital && (
        <p className="ml-amount__capital" aria-live="polite">
          <span className="ml-amount__capital-label">{loc.amount.capital}</span>
          <span className="ml-amount__words">{words || '—'}</span>
        </p>
      )}
    </Field>
  )
}

/* ── NumberKeyboard ────────────────────────────────────── */

export interface NumberKeyboardProps {
  value?: string
  defaultValue?: string
  onChange?: (value: string) => void
  /** default: 3 × 4 with ⌫ bottom-right. custom: a side column with ⌫ and a big Done key. */
  theme?: MlNumberKeyboardTheme
  /** "." for amounts, "X" for 身分證, "00"… The custom theme takes up to two. */
  extraKey?: string | string[]
  /** Most characters the value may hold. */
  maxlength?: number
  /** Shuffle the digits each time the keyboard opens (PIN pads). */
  random?: boolean
  title?: string
  /** Text of the Done key. Default "完成". */
  closeText?: string
  /** Pinned to the bottom of the screen and opened with `show`. */
  fixed?: boolean
  show?: boolean
  defaultShow?: boolean
  onShowChange?: (show: boolean) => void
  /** A fixed keyboard closes when you tap elsewhere or press Esc. */
  hideOnClickOutside?: boolean
  onInput?: (key: string) => void
  onDelete?: () => void
  onClose?: () => void
  /** Accessible name. Default "數字鍵盤". */
  label?: string
  className?: string
}

function BackspaceIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinejoin="round">
      <path d={BACKSPACE_PATH} />
    </svg>
  )
}

/** Keys don't steal focus from the field they're typing into. */
const keepFocus = (e: { preventDefault(): void }) => e.preventDefault()

export function NumberKeyboard({
  value,
  defaultValue = '',
  onChange,
  theme = 'default',
  extraKey,
  maxlength = Infinity,
  random,
  title,
  closeText,
  fixed,
  show: showProp,
  defaultShow = false,
  onShowChange,
  hideOnClickOutside = true,
  onInput,
  onDelete,
  onClose,
  label,
  className,
}: NumberKeyboardProps) {
  const loc = useLocale()
  const [model, set] = useControllable(value, defaultValue, onChange)
  const [show, setShow] = useControllable(showProp, defaultShow, onShowChange)
  const [order, setOrder] = useState<number[]>()
  const root = useRef<HTMLDivElement>(null)
  const open = !fixed || show
  const keys = keyboardLayout(theme, extraKey, !!fixed, order)

  // Latest values for the long-press timer and the document listeners.
  const latest = useRef({ model, fixed, onDelete, onClose, set, setShow })
  latest.current = { model, fixed, onDelete, onClose, set, setShow }

  // Shuffled only on the client, so server and first client render agree.
  useEffect(() => {
    if (show || !fixed) setOrder(random ? shuffledDigits() : undefined)
  }, [random, show, fixed])

  const remove = () => {
    const l = latest.current
    l.onDelete?.()
    // Long presses fire faster than re-renders: keep the running value here.
    l.model = keyboardDelete(l.model)
    l.set(l.model)
  }
  const close = () => {
    const l = latest.current
    l.onClose?.()
    if (l.fixed) l.setShow(false)
  }
  const press = (key: NumberKeyboardKey) => {
    if (key.type === 'digit' || key.type === 'extra') {
      onInput?.(key.text)
      set(keyboardAppend(model, key.text, maxlength))
    } else if (key.type === 'delete') remove()
    else if (key.type === 'collapse') close()
  }

  /* Long-press ⌫ keeps deleting. The click that ends a long press is swallowed. */
  const hold = useRef<{ timer?: ReturnType<typeof setTimeout>; repeat?: ReturnType<typeof setInterval>; repeated: boolean }>({ repeated: false })
  const stopRepeat = () => {
    clearTimeout(hold.current.timer)
    clearInterval(hold.current.repeat)
  }
  const startRepeat = () => {
    stopRepeat()
    hold.current.repeated = false
    hold.current.timer = setTimeout(() => {
      hold.current.repeat = setInterval(() => {
        hold.current.repeated = true
        remove()
      }, KEYBOARD_REPEAT)
    }, KEYBOARD_HOLD)
  }
  useEffect(() => stopRepeat, [])
  const deleteProps = {
    type: 'button' as const,
    className: 'ml-numkey__key ml-numkey__key--delete',
    'aria-label': loc.numberKeyboard.delete,
    onMouseDown: keepFocus,
    onPointerDown: startRepeat,
    onPointerUp: stopRepeat,
    onPointerLeave: stopRepeat,
    onPointerCancel: stopRepeat,
    onClick: () => {
      if (hold.current.repeated) hold.current.repeated = false
      else remove()
    },
  }

  const listening = !!fixed && hideOnClickOutside && show
  useEffect(() => {
    if (!listening) return
    const onPointer = (e: PointerEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) close()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [listening])

  const done = closeText ?? loc.numberKeyboard.close

  return (
    <div
      ref={root}
      role="group"
      aria-label={label ?? loc.numberKeyboard.label}
      aria-hidden={open ? undefined : 'true'}
      {...inert(!open)}
      className={cx('ml-numkey', `ml-numkey--${theme}`, className, { 'ml-numkey--fixed': fixed, 'ml-numkey--open': fixed && open })}
    >
      {(title || (fixed && theme === 'default')) && (
        <div className="ml-numkey__head">
          <span className="ml-numkey__title">{title}</span>
          {fixed && theme === 'default' && (
            <button type="button" className="ml-numkey__done" onClick={close}>
              {done}
            </button>
          )}
        </div>
      )}
      <div className="ml-numkey__body">
        <div className="ml-numkey__keys">
          {keys.map((key, i) =>
            key.type === 'blank' ? (
              <span key={i} className="ml-numkey__key ml-numkey__key--blank" aria-hidden="true" />
            ) : key.type === 'delete' ? (
              <button key={i} {...deleteProps}>
                <BackspaceIcon />
              </button>
            ) : key.type === 'collapse' ? (
              <button key={i} type="button" className="ml-numkey__key ml-numkey__key--collapse" aria-label={loc.numberKeyboard.collapse} onMouseDown={keepFocus} onClick={close}>
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="square">
                  <path d={icons.chevronDown} />
                </svg>
              </button>
            ) : (
              <button
                key={i}
                type="button"
                className={cx('ml-numkey__key', `ml-numkey__key--${key.type}`, key.span && `ml-numkey__key--span${key.span}`)}
                onMouseDown={keepFocus}
                onClick={() => press(key)}
              >
                {key.text}
              </button>
            ),
          )}
        </div>
        {theme === 'custom' && (
          <div className="ml-numkey__side">
            <button {...deleteProps}>
              <BackspaceIcon />
            </button>
            <button type="button" className="ml-numkey__key ml-numkey__key--close" onMouseDown={keepFocus} onClick={close}>
              {done}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
