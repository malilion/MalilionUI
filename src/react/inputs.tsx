import {
  forwardRef,
  useEffect,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type CSSProperties,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react'
import type { MlMentionOption, MlSize } from '../types'
import { Avatar, Icon, Paw } from './basic'
import { Field } from './form'
import { useLocale } from './locale'
import { useTransition } from './overlay'
import { cx, describedBy, useControllable } from './utils'
import { useFormField } from './validation'

const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect
const DROPDOWN = { enter: 480, leave: 120 }

function useControlId(prefix: string, id?: string) {
  const auto = useId()
  return id ?? `${prefix}-${auto.replace(/[^\w-]/g, '')}`
}

type ControlAttrs = Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'prefix' | 'value' | 'defaultValue' | 'onChange' | 'min' | 'max' | 'step' | 'type'>

/* ── NumberInput ───────────────────────────────────────── */

export interface NumberInputProps extends ControlAttrs {
  value?: number
  defaultValue?: number
  onChange?: (value: number) => void
  min?: number
  max?: number
  step?: number
  label?: ReactNode
  hint?: string
  error?: string
  index?: string
}

export function NumberInput({ value, defaultValue = 0, onChange, min = -Infinity, max = Infinity, step = 1, label, hint, error, index, required, disabled, id, className, style, ...rest }: NumberInputProps) {
  const loc = useLocale()
  const field = useFormField({ error, required })
  const controlId = useControlId('ml-number', id)
  const [model, set] = useControllable(value, defaultValue, onChange)
  const input = useRef<HTMLInputElement>(null)
  const clamp = (v: number) => (Number.isNaN(v) ? Math.max(min, Math.min(max, 0)) : Math.min(max, Math.max(min, v)))
  function nudge(direction: 1 | -1) {
    // Round to the step's precision so 0.1 + 0.2 doesn't show 0.30000000000000004.
    const decimals = (String(step).split('.')[1] ?? '').length
    set(clamp(Number((model + direction * step).toFixed(decimals))))
  }
  const commit = useRef<(v: number) => void>(undefined)
  commit.current = (v) => {
    const next = clamp(v)
    set(next)
    if (input.current) input.current.value = String(next)
  }
  // Vue binds :value one-way and commits on the native change event (blur / Enter).
  useEffect(() => {
    const el = input.current
    if (!el) return
    const onNativeChange = () => commit.current?.(el.valueAsNumber)
    el.addEventListener('change', onNativeChange)
    return () => el.removeEventListener('change', onNativeChange)
  }, [])
  useEffect(() => {
    if (input.current && input.current.value !== String(model)) input.current.value = String(model)
  }, [model])

  return (
    <Field controlId={controlId} label={label} hint={hint} error={field.error} index={index} required={field.required} className={className}>
      <div className={cx('ml-input', 'ml-number', { 'ml-input--error': field.error, 'ml-input--disabled': disabled })} style={style}>
        <button type="button" className="ml-number__btn" aria-label={loc.common.decrease} tabIndex={-1} disabled={disabled || model <= min} onClick={() => nudge(-1)}>
          <Icon name="minus" />
        </button>
        <input
          id={controlId}
          ref={input}
          required={required}
          {...rest}
          type="number"
          inputMode="decimal"
          className="ml-input__control ml-number__control"
          defaultValue={model}
          min={Number.isFinite(min) ? min : undefined}
          max={Number.isFinite(max) ? max : undefined}
          step={step}
          disabled={disabled}
          aria-invalid={field.error ? true : undefined}
          aria-describedby={describedBy(controlId, hint, field.error)}
        />
        <button type="button" className="ml-number__btn" aria-label={loc.common.increase} tabIndex={-1} disabled={disabled || model >= max} onClick={() => nudge(1)}>
          <Icon name="plus" />
        </button>
      </div>
    </Field>
  )
}

/* ── PinInput ──────────────────────────────────────────── */

export interface PinInputHandle {
  focus(): void
  /** Clear the code and put the cursor back in the first box. */
  reset(): void
}

export interface PinInputProps {
  value?: string
  defaultValue?: string
  onChange?: (value: string) => void
  /** Every box filled. */
  onComplete?: (code: string) => void
  /** Number of boxes. */
  length?: number
  /** numeric: digits only (numeric keypad on phones). alphanumeric: letters and digits. */
  type?: 'numeric' | 'alphanumeric'
  /** Show dots instead of the characters. */
  mask?: boolean
  label?: ReactNode
  hint?: string
  error?: string
  index?: string
  size?: MlSize
  disabled?: boolean
  /** Put the cursor in the first box on mount. */
  autoFocus?: boolean
  /** Draw a gap after this many boxes, e.g. 3 for "123 456". */
  groupSize?: number
  id?: string
  /** Renders a hidden input so the code is posted with a native <form>. */
  name?: string
  className?: string
}

export const PinInput = forwardRef<PinInputHandle, PinInputProps>(function PinInput(
  { value, defaultValue = '', onChange, onComplete, length = 6, type = 'numeric', mask, label, hint, error, index, size = 'md', disabled, autoFocus, groupSize, id, name, className },
  ref,
) {
  const loc = useLocale()
  const field = useFormField({ error })
  const controlId = useControlId('ml-pin', id)
  const [model, setModel] = useControllable(value, defaultValue, onChange)
  // A local copy so focus moves can read the new code right away.
  const code = useRef(model)
  code.current = model
  const boxes = useRef<(HTMLInputElement | null)[]>([])
  const pattern = type === 'numeric' ? /[0-9]/ : /[0-9a-z]/i
  const charsOf = (c: string) => Array.from({ length }, (_, i) => c[i] ?? '')
  const chars = charsOf(model)

  function setChars(next: string[]) {
    const v = next.join('').slice(0, length)
    code.current = v
    setModel(v)
    if (v.length === length && !next.slice(0, length).includes('')) onComplete?.(v)
  }
  function focusBox(i: number) {
    const el = boxes.current[Math.max(0, Math.min(length - 1, i))]
    el?.focus()
    el?.select()
  }
  const clean = (text: string) => [...text].filter((c) => pattern.test(c)).map((c) => (type === 'alphanumeric' ? c.toUpperCase() : c))

  function onInput(el: HTMLInputElement, i: number) {
    const current = charsOf(code.current)
    const typed = clean(el.value)
    if (!typed.length) {
      el.value = current[i]
      return
    }
    // Typing over a filled box, or autofill dropping the whole code into the first box.
    const next = [...current]
    typed.forEach((c, k) => {
      if (i + k < length) next[i + k] = c
    })
    // Keep the value contiguous: no holes before the last filled box.
    const firstHole = next.indexOf('')
    setChars(firstHole === -1 ? next : next.slice(0, firstHole))
    el.value = next[i]
    focusBox(Math.min(i + typed.length, length - 1))
  }

  function onKeydown(event: KeyboardEvent, i: number) {
    const k = event.key
    if (k === 'Backspace') {
      event.preventDefault()
      const next = charsOf(code.current)
      if (next[i]) {
        next.splice(i, 1)
        setChars(next)
      } else if (i > 0) {
        next.splice(i - 1, 1)
        setChars(next)
        focusBox(i - 1)
      }
    } else if (k === 'ArrowLeft' || k === 'ArrowRight') {
      event.preventDefault()
      focusBox(i + (k === 'ArrowLeft' ? -1 : 1))
    } else if (k === 'Home' || k === 'End') {
      event.preventDefault()
      focusBox(k === 'Home' ? 0 : code.current.length)
    }
  }

  function onPaste(event: ClipboardEvent, i: number) {
    event.preventDefault()
    const typed = clean(event.clipboardData?.getData('text') ?? '')
    if (!typed.length) return
    setChars([...charsOf(code.current).slice(0, i), ...typed])
    focusBox(Math.min(i + typed.length, length - 1))
  }

  // Never leave a gap: clicking an empty box past the end jumps back to the first empty one.
  function onFocus(i: number) {
    const end = code.current.length
    if (i > end) focusBox(end)
    else boxes.current[i]?.select()
  }

  useEffect(() => {
    if (!autoFocus) return
    const t = setTimeout(() => focusBox(0))
    return () => clearTimeout(t)
  }, [autoFocus])

  useImperativeHandle(ref, () => ({
    focus: () => focusBox(code.current.length),
    reset() {
      code.current = ''
      setModel('')
      focusBox(0)
    },
  }))

  return (
    <Field controlId={controlId} label={label} hint={hint} error={field.error} index={index} className={className}>
      <div
        className={cx('ml-pin', `ml-pin--${size}`, { 'ml-pin--error': field.error, 'ml-pin--disabled': disabled })}
        role="group"
        aria-labelledby={label ? `${controlId}-label` : undefined}
        aria-describedby={describedBy(controlId, hint, field.error)}
      >
        {chars.map((c, i) => [
          groupSize && i && i % groupSize === 0 ? <span key={`sep-${i}`} className="ml-pin__sep" aria-hidden="true" /> : null,
          <input
            key={i}
            id={i === 0 ? controlId : undefined}
            ref={(el) => {
              boxes.current[i] = el
            }}
            className={cx('ml-pin__box', { 'ml-pin__box--filled': c })}
            type={mask ? 'password' : 'text'}
            inputMode={type === 'numeric' ? 'numeric' : 'text'}
            autoComplete={i === 0 ? 'one-time-code' : 'off'}
            value={c}
            disabled={disabled}
            aria-label={loc.pin.digit(i + 1, length)}
            aria-invalid={field.error ? true : undefined}
            maxLength={i === 0 ? undefined : 1}
            onChange={(e) => onInput(e.target, i)}
            onKeyDown={(e) => onKeydown(e, i)}
            onPaste={(e) => onPaste(e, i)}
            onFocus={() => onFocus(i)}
          />,
        ])}
        {name && <input type="hidden" name={name} value={model} />}
      </div>
    </Field>
  )
})

/* ── TagInput ──────────────────────────────────────────── */

export interface TagInputProps extends Omit<ControlAttrs, 'onKeyDown' | 'onInput' | 'onBlur'> {
  value?: string[]
  defaultValue?: string[]
  onChange?: (value: string[]) => void
  onAdd?: (tag: string) => void
  onRemove?: (tag: string) => void
  onReject?: (tag: string, reason: string) => void
  label?: string
  hint?: string
  error?: string
  index?: string
  size?: MlSize
  /** Most tags allowed; the input hides once reached. */
  max?: number
  /** Keys (besides Enter) that turn the typed text into a tag. */
  separators?: string[]
  /** Allow the same tag twice. */
  allowDuplicates?: boolean
  /** Return false (or an error string) to reject a tag. */
  validate?: (tag: string) => boolean | string
  /** Show a × that removes every tag. */
  clearable?: boolean
  /** Renders hidden inputs so the tags are posted with a native <form>. */
  name?: string
  prefix?: ReactNode
  renderTag?: (tag: string, index: number) => ReactNode
}

const NO_TAGS: string[] = []
const DEFAULT_SEPARATORS = [',']

export function TagInput({
  value,
  defaultValue = NO_TAGS,
  onChange,
  onAdd,
  onRemove,
  onReject,
  label,
  hint,
  error,
  index,
  placeholder,
  size = 'md',
  required,
  disabled,
  id,
  max,
  separators = DEFAULT_SEPARATORS,
  allowDuplicates,
  validate,
  clearable,
  name,
  prefix,
  renderTag,
  className,
  style,
  ...rest
}: TagInputProps) {
  const loc = useLocale()
  const field = useFormField({ error, required })
  const controlId = useControlId('ml-taginput', id)
  const [tags, setTags] = useControllable(value, defaultValue, onChange)
  // Read back right away: several adds can happen in one event.
  const latest = useRef(tags)
  latest.current = tags
  const input = useRef<HTMLInputElement>(null)
  const [draft, setDraft] = useState('')
  const [rejection, setRejection] = useState('')
  /** Tag about to be removed by a second Backspace. */
  const [armed, setArmed] = useState(-1)
  const full = max !== undefined && tags.length >= max
  const shownError = field.error || rejection || undefined

  const commit = (next: string[]) => {
    latest.current = next
    setTags(next)
  }

  /** Add several tags in one go (a paste can hold many). Returns whether the last one was accepted. */
  function add(...raws: string[]) {
    const next = [...latest.current]
    let reason = ''
    let lastOk = false
    for (const raw of raws) {
      const tag = raw.trim()
      if (!tag) continue
      let why = ''
      if (max !== undefined && next.length >= max) why = loc.tagInput.max(max)
      else if (!allowDuplicates && next.includes(tag)) why = loc.tagInput.duplicate(tag)
      else {
        const result = validate?.(tag) ?? true
        if (result !== true) why = typeof result === 'string' ? result : loc.tagInput.invalid(tag)
      }
      lastOk = !why
      if (why) {
        reason = why
        onReject?.(tag, why)
      } else {
        next.push(tag)
        onAdd?.(tag)
      }
    }
    setRejection(reason)
    if (next.length !== latest.current.length) commit(next)
    return lastOk
  }

  function commitDraft() {
    if (add(draft)) setDraft('')
  }

  function remove(i: number) {
    if (disabled) return
    const tag = latest.current[i]
    commit(latest.current.filter((_, k) => k !== i))
    onRemove?.(tag)
    setArmed(-1)
    input.current?.focus()
  }

  function clear() {
    commit([])
    setRejection('')
    input.current?.focus()
  }

  function onKeydown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.nativeEvent.isComposing) return // let 注音 / 拼音 finish composing first
    if (event.key === 'Enter' || separators.includes(event.key)) {
      if (event.key === 'Enter' && !draft.trim()) return
      event.preventDefault()
      commitDraft()
    } else if (event.key === 'Backspace' && !draft && tags.length) {
      // First Backspace highlights the last tag, the second removes it.
      if (armed === tags.length - 1) remove(armed)
      else setArmed(tags.length - 1)
    } else setArmed(-1)
  }

  function onInput(text: string) {
    setRejection('')
    // Pasted "a, b, c" becomes three tags.
    const seps = separators.filter((s) => s.length === 1)
    if (seps.some((s) => text.includes(s))) {
      const parts = text.split(new RegExp(`[${seps.map((s) => s.replace(/[\\\]^-]/g, '\\$&')).join('')}]`))
      setDraft((parts.pop() ?? '').trimStart())
      add(...parts)
    } else setDraft(text)
  }

  return (
    <Field controlId={controlId} label={label} hint={hint} error={shownError} index={index} required={field.required} className={className}>
      <div
        className={cx('ml-input', `ml-input--${size}`, 'ml-taginput', { 'ml-input--error': shownError, 'ml-input--disabled': disabled })}
        style={style}
        onClick={() => input.current?.focus()}
      >
        {prefix && <span className="ml-input__affix">{prefix}</span>}
        <ul className="ml-taginput__list" aria-label={loc.tagInput.added(label)}>
          {tags.map((tag, i) => (
            <li key={`${tag}-${i}`} className={cx('ml-combobox__tag', 'ml-taginput__tag', { 'ml-taginput__tag--armed': i === armed })}>
              {renderTag ? renderTag(tag, i) : tag}
              {!disabled && (
                <button
                  type="button"
                  className="ml-combobox__tag-remove"
                  aria-label={loc.common.remove(tag)}
                  onClick={(e) => {
                    e.stopPropagation()
                    remove(i)
                  }}
                >
                  <Icon name="close" />
                </button>
              )}
            </li>
          ))}
          <li className="ml-taginput__entry">
            <input
              id={controlId}
              ref={input}
              {...rest}
              style={full ? { display: 'none' } : undefined}
              className="ml-input__control ml-taginput__control"
              type="text"
              autoComplete="off"
              enterKeyHint="enter"
              value={draft}
              placeholder={tags.length ? '' : (placeholder ?? loc.tagInput.placeholder)}
              disabled={disabled}
              aria-invalid={shownError ? true : undefined}
              aria-describedby={describedBy(controlId, hint, shownError)}
              onChange={(e) => onInput(e.target.value)}
              onKeyDown={onKeydown}
              onBlur={() => {
                commitDraft()
                setArmed(-1)
              }}
            />
          </li>
        </ul>
        {max !== undefined && (
          <span className="ml-taginput__count" aria-hidden="true">
            {tags.length}/{max}
          </span>
        )}
        {clearable && tags.length > 0 && !disabled && (
          <button
            type="button"
            className="ml-datepicker__clear"
            aria-label={loc.tagInput.clearAll}
            onClick={(e) => {
              e.stopPropagation()
              clear()
            }}
          >
            <Icon name="close" />
          </button>
        )}
        {name && tags.map((tag, i) => <input key={i} type="hidden" name={name} value={tag} />)}
      </div>
    </Field>
  )
}

/* ── Mention ───────────────────────────────────────────── */

export interface MentionProps {
  options: MlMentionOption[]
  value?: string
  defaultValue?: string
  onChange?: (value: string) => void
  /** The query after a trigger changed. */
  onSearch?: (query: string, trigger: string) => void
  onSelect?: (option: MlMentionOption, trigger: string) => void
  /** Characters that open the list. */
  triggers?: string[]
  label?: ReactNode
  hint?: string
  error?: string
  index?: string
  placeholder?: string
  rows?: number
  disabled?: boolean
  /** Most suggestions shown. */
  limit?: number
  id?: string
  className?: string
}

const AT = ['@']

export function Mention({ options, value, defaultValue = '', onChange, onSearch, onSelect, triggers = AT, label, hint, error, index, placeholder, rows = 3, disabled, limit = 8, id, className }: MentionProps) {
  const loc = useLocale()
  const field = useFormField({ error })
  const controlId = useControlId('ml-mention', id)
  const listId = `${controlId}-list`
  const [model, setModel] = useControllable(value, defaultValue, onChange)
  const root = useRef<HTMLDivElement>(null)
  const area = useRef<HTMLTextAreaElement>(null)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  /** The trigger being typed: where it starts and what follows it. */
  const [token, setToken] = useState<{ start: number; trigger: string; query: string } | null>(null)
  const caret = useRef<number | null>(null)
  const menu = useTransition(open, 'ml-dropdown', DROPDOWN)

  const q = token?.query.toLowerCase() ?? ''
  const matches = options.filter((o) => !o.disabled && (o.label.toLowerCase().includes(q) || String(o.value).toLowerCase().includes(q))).slice(0, limit)

  /** Look backwards from the caret for a trigger that starts a word. */
  function findToken() {
    const el = area.current
    if (!el) return null
    const before = el.value.slice(0, el.selectionStart ?? 0)
    for (let i = before.length - 1; i >= 0; i--) {
      const ch = before[i]
      if (/\s/.test(ch)) return null
      if (triggers.includes(ch) && (i === 0 || /\s/.test(before[i - 1]))) return { start: i, trigger: ch, query: before.slice(i + 1) }
    }
    return null
  }

  function sync() {
    const t = findToken()
    setToken(t)
    setOpen(!!t)
    setActive(0)
    if (t) onSearch?.(t.query, t.trigger)
  }

  function choose(option: MlMentionOption) {
    const el = area.current
    if (!token || !el) return
    const insert = `${token.trigger}${option.label} `
    const text = el.value
    caret.current = token.start + insert.length
    setModel(text.slice(0, token.start) + insert + text.slice(el.selectionStart ?? 0))
    setOpen(false)
    setToken(null)
    onSelect?.(option, token.trigger)
  }
  useIsoLayoutEffect(() => {
    const at = caret.current
    if (at === null || !area.current) return
    caret.current = null
    area.current.focus()
    area.current.setSelectionRange(at, at)
  })

  function onKeydown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (!open || event.nativeEvent.isComposing) return
    const n = matches.length
    if (event.key === 'ArrowDown' && n) {
      event.preventDefault()
      setActive((active + 1) % n)
    } else if (event.key === 'ArrowUp' && n) {
      event.preventDefault()
      setActive((active - 1 + n) % n)
    } else if ((event.key === 'Enter' || event.key === 'Tab') && n) {
      event.preventDefault()
      choose(matches[active])
    } else if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      setOpen(false)
    }
  }

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [open])

  return (
    <Field controlId={controlId} label={label} hint={hint} error={field.error} index={index} className={className}>
      <div ref={root} className="ml-mention">
        <div className={cx('ml-input', 'ml-input--textarea', { 'ml-input--error': field.error, 'ml-input--disabled': disabled })}>
          <textarea
            id={controlId}
            ref={area}
            value={model}
            className="ml-input__control"
            rows={rows}
            placeholder={placeholder ?? loc.mention.placeholder(triggers[0])}
            disabled={disabled}
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={open}
            aria-controls={listId}
            aria-activedescendant={open && matches.length ? `${listId}-${active}` : undefined}
            aria-invalid={field.error ? true : undefined}
            aria-describedby={describedBy(controlId, hint, field.error)}
            onChange={(e) => {
              setModel(e.target.value)
              sync()
            }}
            onClick={sync}
            onKeyUp={(e) => ['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key) && sync()}
            onKeyDown={onKeydown}
          />
        </div>
        <ul id={listId} role="listbox" className={cx('ml-dropdown__menu ml-mention__menu', menu.className)} style={menu.mounted ? undefined : { display: 'none' }}>
          {matches.map((o, i) => (
            <li
              key={o.value}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              className={cx('ml-dropdown__item', 'ml-combobox__option', { 'ml-combobox__option--active': i === active })}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(o)}
              onMouseMove={() => setActive(i)}
            >
              <Avatar size="sm" src={o.avatar} name={o.label} className="ml-mention__avatar" />
              <span className="ml-dropdown__label">{o.label}</span>
              {o.hint && <span className="ml-dropdown__hint">{o.hint}</span>}
            </li>
          ))}
          {!matches.length && (
            <li className="ml-combobox__empty" role="presentation">
              {loc.common.noMatch}
            </li>
          )}
        </ul>
      </div>
    </Field>
  )
}

/* ── Slider ────────────────────────────────────────────── */

export interface SliderProps extends ControlAttrs {
  value?: number
  defaultValue?: number
  onChange?: (value: number) => void
  min?: number
  max?: number
  step?: number
  label?: ReactNode
  /** Shown after the value, e.g. "%". */
  unit?: string
  showValue?: boolean
  tone?: 'gold' | 'tech'
}

export function Slider({ value, defaultValue = 0, onChange, min = 0, max = 100, step = 1, label, unit, showValue = true, tone = 'gold', disabled, id, className, style, ...rest }: SliderProps) {
  const controlId = useControlId('ml-slider', id)
  const [model, set] = useControllable(value, defaultValue, onChange)
  const span = max - min
  const percent = span > 0 ? ((model - min) / span) * 100 : 0
  return (
    <div className={cx('ml-slider', `ml-slider--${tone}`, className, { 'ml-slider--disabled': disabled })} style={{ ...style, '--_pct': `${percent}%` } as CSSProperties}>
      {(label || showValue) && (
        <div className="ml-slider__head">
          {label && <label htmlFor={controlId}>{label}</label>}
          {showValue && (
            <output htmlFor={controlId} className="ml-slider__value">
              {model}
              {unit}
            </output>
          )}
        </div>
      )}
      <input
        id={controlId}
        {...rest}
        type="range"
        className="ml-slider__input"
        value={model}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onChange={(e) => {
          const n = parseFloat(e.target.value)
          set(Number.isNaN(n) ? (e.target.value as unknown as number) : n)
        }}
      />
    </div>
  )
}

/* ── Rate ──────────────────────────────────────────────── */

export interface RateProps {
  value?: number
  defaultValue?: number
  onChange?: (value: number) => void
  max?: number
  /** Allow half paws (0.5 steps). */
  allowHalf?: boolean
  /** Display only — not focusable, no hover. */
  readOnly?: boolean
  disabled?: boolean
  /** Clicking the current value again resets to 0. */
  clearable?: boolean
  size?: MlSize
  tone?: 'gold' | 'bean' | 'tech'
  /** Text per whole value, e.g. ['很差', '普通', …]; shown beside the paws. */
  texts?: string[]
  /** Show the number beside the paws. */
  showValue?: boolean
  /** Accessible name. */
  label?: string
  className?: string
}

export function Rate({ value, defaultValue = 0, onChange, max = 5, allowHalf, readOnly, disabled, clearable, size = 'md', tone = 'gold', texts, showValue, label, className }: RateProps) {
  const loc = useLocale()
  const [model, setModel] = useControllable(value, defaultValue, onChange)
  const [hover, setHover] = useState<number | null>(null)
  const step = allowHalf ? 0.5 : 1
  const shown = hover ?? model
  const interactive = !readOnly && !disabled

  /** How full paw `i` (1-based) is: 0, 0.5 or 1. */
  const fill = (i: number) => (shown >= i ? 1 : shown >= i - 0.5 ? 0.5 : 0)
  const text = texts?.length ? (texts[Math.ceil(shown) - 1] ?? '') : showValue ? String(shown) : ''
  const t = texts?.[Math.ceil(model) - 1]
  const valueText = `${model} / ${max}${t ? `，${t}` : ''}`

  function valueAt(event: ReactMouseEvent, i: number) {
    if (!allowHalf) return i
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
    return event.clientX - rect.left < rect.width / 2 ? i - 0.5 : i
  }
  function set(v: number) {
    if (!interactive) return
    setModel(clearable && v === model ? 0 : Math.min(max, Math.max(0, v)))
  }
  function onKeydown(event: KeyboardEvent) {
    if (!interactive) return
    const map: Record<string, number> = { ArrowRight: model + step, ArrowUp: model + step, ArrowLeft: model - step, ArrowDown: model - step, Home: 0, End: max }
    if (event.key in map) {
      event.preventDefault()
      setModel(Math.min(max, Math.max(0, map[event.key])))
    }
  }

  return (
    <div
      className={cx('ml-rate', `ml-rate--${size}`, `ml-rate--${tone}`, className, { 'ml-rate--interactive': interactive, 'ml-rate--disabled': disabled })}
      role={readOnly ? 'img' : 'slider'}
      aria-label={readOnly ? `${label ?? loc.rate}：${valueText}` : (label ?? loc.rate)}
      aria-valuemin={readOnly ? undefined : 0}
      aria-valuemax={readOnly ? undefined : max}
      aria-valuenow={readOnly ? undefined : model}
      aria-valuetext={readOnly ? undefined : valueText}
      aria-disabled={disabled || undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={onKeydown}
      onMouseLeave={() => setHover(null)}
    >
      {Array.from({ length: max }, (_, k) => k + 1).map((i) => (
        <span
          key={i}
          className={cx('ml-rate__item', { 'ml-rate__item--on': fill(i) === 1, 'ml-rate__item--half': fill(i) === 0.5 })}
          aria-hidden="true"
          onMouseMove={(e) => interactive && setHover(valueAt(e, i))}
          onClick={(e) => set(valueAt(e, i))}
        >
          <Paw tone="current" shine={false} className="ml-rate__base" />
          <span className="ml-rate__fill" style={{ width: `${fill(i) * 100}%` }}>
            <Paw tone="current" className="ml-rate__paw" />
          </span>
        </span>
      ))}
      {text && (
        <span className="ml-rate__text" aria-hidden="true">
          {text}
        </span>
      )}
    </div>
  )
}
