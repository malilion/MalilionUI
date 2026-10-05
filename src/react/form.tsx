import {
  createContext,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type TextareaHTMLAttributes,
} from 'react'
import type { MlPlacement, MlRadioOption, MlSegmentedOption, MlSize, MlTabItem } from '../types'
import { Icon, Paw } from './basic'
import { useLocale } from './locale'
import { cx, describedBy, useControllable } from './utils'
import { useFormField } from './validation'
import { CheckboxGroupCtx } from './checkbox-context'
import { dropTab, moveTab, nextTabAfterClose, scrollToReveal, tabDropSlot, tabOverflow } from '../components/tabs'

// useLayoutEffect warns during SSR; fall back to useEffect there.
const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

/* ── Field ─────────────────────────────────────────────── */

export interface FieldProps {
  controlId?: string
  label?: ReactNode
  hint?: ReactNode
  error?: string
  /** HUD prefix before the label, e.g. "01". */
  index?: string
  required?: boolean
  children?: ReactNode
  className?: string
}

export function Field({ controlId, label, hint, error, index, required, children, className }: FieldProps) {
  return (
    <div className={cx('ml-field', className)}>
      {label && (
        <label id={controlId ? `${controlId}-label` : undefined} className="ml-field__label" htmlFor={controlId}>
          {index && <span className="ml-field__index">{index}</span>}
          {label}
          {required && (
            <span className="ml-field__required" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}
      {children}
      {error ? (
        <p id={`${controlId}-error`} className="ml-field__error">
          <Icon name="warning" />
          {error}
        </p>
      ) : hint ? (
        <p id={`${controlId}-hint`} className="ml-field__hint">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

interface FieldBits {
  label?: ReactNode
  hint?: string
  error?: string
  index?: string
}

/* ── Input & Textarea ──────────────────────────────────── */

export interface InputProps extends FieldBits, Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'prefix' | 'value' | 'defaultValue' | 'onChange'> {
  size?: MlSize
  value?: string
  defaultValue?: string
  onChange?: (value: string) => void
  prefix?: ReactNode
  suffix?: ReactNode
}

export function Input({ label, hint, error: errorProp, index, size = 'md', value, defaultValue = '', onChange, prefix, suffix, id, required: requiredProp, disabled, className, style, ...rest }: InputProps) {
  const { error, required } = useFormField({ error: errorProp, required: requiredProp })
  const autoId = useId()
  const controlId = id ?? `ml-input-${autoId.replace(/[^\w-]/g, '')}`
  const [current, set] = useControllable(value, defaultValue, onChange)
  return (
    <Field controlId={controlId} label={label} hint={hint} error={error} index={index} required={required} className={className}>
      <div className={cx('ml-input', `ml-input--${size}`, { 'ml-input--error': error, 'ml-input--disabled': disabled })} style={style}>
        {prefix && <span className="ml-input__affix">{prefix}</span>}
        <input
          id={controlId}
          className="ml-input__control"
          value={current}
          onChange={(e) => set(e.target.value)}
          required={required}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(controlId, hint, error)}
          {...rest}
        />
        {suffix && <span className="ml-input__affix">{suffix}</span>}
      </div>
    </Field>
  )
}

export interface TextareaProps extends FieldBits, Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'defaultValue' | 'onChange'> {
  value?: string
  defaultValue?: string
  onChange?: (value: string) => void
}

export function Textarea({ label, hint, error: errorProp, index, value, defaultValue = '', onChange, id, required: requiredProp, disabled, rows = 4, className, ...rest }: TextareaProps) {
  const { error, required } = useFormField({ error: errorProp, required: requiredProp })
  const autoId = useId()
  const controlId = id ?? `ml-textarea-${autoId.replace(/[^\w-]/g, '')}`
  const [current, set] = useControllable(value, defaultValue, onChange)
  return (
    <Field controlId={controlId} label={label} hint={hint} error={error} index={index} required={required} className={className}>
      <div className={cx('ml-input', 'ml-input--textarea', { 'ml-input--error': error, 'ml-input--disabled': disabled })}>
        <textarea
          id={controlId}
          className="ml-input__control"
          rows={rows}
          value={current}
          onChange={(e) => set(e.target.value)}
          required={required}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(controlId, hint, error)}
          {...rest}
        />
      </div>
    </Field>
  )
}

/* ── Checkbox & Switch ─────────────────────────────────── */

export interface CheckboxProps {
  checked?: boolean
  defaultChecked?: boolean
  onChange?: (checked: boolean) => void
  label?: ReactNode
  hint?: ReactNode
  disabled?: boolean
  /** Stamp a paw print instead of a check mark. */
  paw?: boolean
  indeterminate?: boolean
  name?: string
  /** Inside <CheckboxGroup>: this box's value in the group's array. Also the native value attribute. */
  value?: string | number
  className?: string
  'aria-label'?: string
}

export function Checkbox({ checked, defaultChecked = false, onChange, label, hint, disabled, paw, indeterminate = false, className, name, value, ...inputProps }: CheckboxProps) {
  const [standaloneOn, set] = useControllable(checked, defaultChecked, onChange)
  // Inside a group (and given a value) the group owns the checked state.
  const injected = useContext(CheckboxGroupCtx)
  const group = value !== undefined ? injected : null
  const register = group?.register
  useEffect(() => (register && value !== undefined ? register(value, !!disabled) : undefined), [register, value, disabled])
  const on = group ? group.isChecked(value!) : standaloneOn
  const isDisabled = disabled || (group?.isLocked(value!) ?? false)
  const input = useRef<HTMLInputElement>(null)
  // `indeterminate` is a DOM property with no HTML attribute.
  useEffect(() => {
    if (input.current) input.current.indeterminate = indeterminate
  }, [indeterminate])
  return (
    <label className={cx('ml-check', className, { 'ml-check--disabled': isDisabled })}>
      <input
        ref={input}
        type="checkbox"
        className="ml-check__input"
        name={group?.name ?? name}
        value={value}
        checked={on}
        disabled={isDisabled}
        onChange={(e) => (group ? group.toggle(value!, e.target.checked) : set(e.target.checked))}
        {...inputProps}
      />
      <span className="ml-check__box" aria-hidden="true">
        {paw ? (
          <Paw tone="current" className="ml-check__paw" />
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="square">
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
        )}
        <span className="ml-check__dash" />
      </span>
      {(label || hint) && (
        <span className="ml-check__text">
          <span>{label}</span>
          {hint && <span className="ml-check__hint">{hint}</span>}
        </span>
      )}
    </label>
  )
}

export interface SwitchProps {
  checked?: boolean
  defaultChecked?: boolean
  onChange?: (checked: boolean) => void
  label?: ReactNode
  tone?: 'gold' | 'tech'
  showState?: boolean
  disabled?: boolean
  id?: string
  className?: string
}

export function Switch({ checked, defaultChecked = false, onChange, label, tone = 'gold', showState, disabled, id, className }: SwitchProps) {
  const autoId = useId()
  const controlId = id ?? `ml-switch-${autoId.replace(/[^\w-]/g, '')}`
  const [on, set] = useControllable(checked, defaultChecked, onChange)
  return (
    <div className={cx('ml-switch', `ml-switch--${tone}`, className, { 'ml-switch--on': on })}>
      <button id={controlId} type="button" role="switch" className="ml-switch__control" aria-checked={on} disabled={disabled} onClick={() => set(!on)}>
        <span className="ml-switch__track">
          <span className="ml-switch__thumb" />
        </span>
      </button>
      {showState && (
        <span className="ml-switch__state" aria-hidden="true">
          {on ? 'ON' : 'OFF'}
        </span>
      )}
      {label && (
        <label htmlFor={controlId} className="ml-switch__label">
          {label}
        </label>
      )}
    </div>
  )
}

/* ── RadioGroup & Radio ────────────────────────────────── */

type RadioValue = string | number

interface RadioGroupContext {
  name: string
  value: RadioValue | undefined
  disabled?: boolean
  variant: 'default' | 'card'
  select: (v: RadioValue) => void
}
const RadioCtx = createContext<RadioGroupContext | null>(null)

export interface RadioGroupProps {
  value?: RadioValue
  defaultValue?: RadioValue
  onChange?: (value: RadioValue) => void
  options?: MlRadioOption[]
  label?: ReactNode
  name?: string
  disabled?: boolean
  variant?: 'default' | 'card'
  direction?: 'row' | 'column'
  children?: ReactNode
}

export function RadioGroup({ value, defaultValue, onChange, options, label, name, disabled, variant = 'default', direction = 'row', children }: RadioGroupProps) {
  const autoName = `ml-radio-${useId().replace(/[^\w-]/g, '')}`
  const [current, set] = useControllable<RadioValue | undefined>(value, defaultValue, onChange as (v: RadioValue | undefined) => void)
  return (
    <fieldset className={cx('ml-radio-group', `ml-radio-group--${variant}`, `ml-radio-group--${direction}`)} disabled={disabled}>
      {label && <legend className="ml-radio-group__label">{label}</legend>}
      <div className="ml-radio-group__items">
        <RadioCtx.Provider value={{ name: name ?? autoName, value: current, disabled, variant, select: set }}>
          {children ?? options?.map((o) => <Radio key={o.value} value={o.value} label={o.label} hint={o.hint} disabled={o.disabled} />)}
        </RadioCtx.Provider>
      </div>
    </fieldset>
  )
}

export interface RadioProps {
  value: RadioValue
  label?: ReactNode
  hint?: ReactNode
  disabled?: boolean
  /** Standalone use only. */
  name?: string
  checked?: boolean
  onChange?: (value: RadioValue) => void
}

export function Radio({ value, label, hint, disabled, name, checked, onChange }: RadioProps) {
  const group = useContext(RadioCtx)
  const isChecked = group ? group.value === value : !!checked
  const isDisabled = disabled || group?.disabled || false
  return (
    <label className={cx('ml-radio', { 'ml-radio--card': group?.variant === 'card', 'ml-radio--disabled': isDisabled })}>
      <input
        type="radio"
        className="ml-radio__input"
        name={group?.name ?? name}
        value={String(value)}
        checked={isChecked}
        disabled={isDisabled}
        onChange={() => (group ? group.select(value) : onChange?.(value))}
      />
      <span className="ml-radio__socket" aria-hidden="true">
        <Paw tone="current" className="ml-radio__paw" />
      </span>
      {(label || hint) && (
        <span className="ml-radio__text">
          <span className="ml-radio__label">{label}</span>
          {hint && <span className="ml-radio__hint">{hint}</span>}
        </span>
      )}
    </label>
  )
}

/* ── Tabs & Segmented (sliding indicator) ──────────────── */

/** Measure the active element so the gold ink / plate can slide under it. */
function useIndicator(activeEl: () => HTMLElement | undefined, deps: unknown[]) {
  const [box, setBox] = useState({ x: 0, width: 0, ready: false })
  const measure = () => {
    const el = activeEl()
    setBox(el ? { x: el.offsetLeft, width: el.offsetWidth, ready: true } : (b) => ({ ...b, ready: false }))
  }
  useIsoLayoutEffect(measure, deps)
  useEffect(() => {
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : undefined
    const el = activeEl()?.parentElement
    if (ro && el) ro.observe(el)
    document.fonts?.ready.then(measure)
    return () => ro?.disconnect()
  }, [])
  return box
}

export interface TabsProps {
  items: MlTabItem[]
  value?: string
  defaultValue?: string
  onChange?: (value: string) => void
  variant?: 'line' | 'plate'
  label?: string
  /** Panel content per tab value. */
  panels?: Record<string, ReactNode>
  renderTab?: (item: MlTabItem, active: boolean) => ReactNode
  /** Close buttons on every tab (an item's own `closable` wins). */
  closable?: boolean
  /** A "+" button after the last tab; calls onAdd. */
  addable?: boolean
  /** Drag tabs, or Alt + ←/→, to reorder them; calls onReorder. */
  reorderable?: boolean
  /** A tab asked to close. The component never changes `items`; see nextTabAfterClose. */
  onClose?: (value: string) => void
  onAdd?: () => void
  /** The tab values in their new order. */
  onReorder?: (values: string[]) => void
}

const scrollBehavior = (): ScrollBehavior =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'

function scrollStrip(el: HTMLElement, left: number) {
  if (typeof el.scrollTo === 'function') el.scrollTo({ left, behavior: scrollBehavior() })
  else el.scrollLeft = left
}

export function Tabs({ items, value, defaultValue, onChange, variant = 'line', label, panels, renderTab, closable, addable, reorderable, onClose, onAdd, onReorder }: TabsProps) {
  const loc = useLocale()
  const base = `ml-tabs-${useId().replace(/[^\w-]/g, '')}`
  const [current, set] = useControllable(value, defaultValue ?? items.find((i) => !i.disabled)?.value ?? '', onChange)
  const tabEls = useRef(new Map<string, HTMLButtonElement>())
  const list = useRef<HTMLDivElement>(null)
  const [more, setMore] = useState({ start: false, end: false })
  const [announce, setAnnounce] = useState('')
  const [drag, setDrag] = useState<{ value: string; slot: number; x: number } | null>(null)
  const refocus = useRef<string | null>(null)

  const isClosable = (item: MlTabItem) => item.closable ?? closable
  const shortcuts = (item: MlTabItem) =>
    [isClosable(item) && 'Delete', reorderable && 'Alt+ArrowLeft Alt+ArrowRight'].filter(Boolean).join(' ') || undefined
  /** The tab's whole box: its wrapper when it carries a close button. */
  const boxOf = (v: string | undefined) => {
    const el = v === undefined ? undefined : tabEls.current.get(v)
    const wrap = el?.parentElement
    return wrap?.classList.contains('ml-tabs__item') ? wrap : el
  }
  const ink = useIndicator(() => boxOf(current), [current, items])

  const checkOverflow = () => {
    if (!list.current) return
    const next = tabOverflow(list.current)
    setMore((m) => (m.start === next.start && m.end === next.end ? m : next))
  }

  // Keep the active tab in view when the strip overflows.
  useIsoLayoutEffect(() => {
    checkOverflow()
    const el = boxOf(current)
    const view = list.current
    if (!el || !view || view.scrollWidth <= view.clientWidth) return
    const left = scrollToReveal(view, el.offsetLeft, el.offsetWidth)
    if (left !== undefined) scrollStrip(view, left)
  }, [current, items])

  useEffect(() => {
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(checkOverflow) : undefined
    if (ro && list.current) ro.observe(list.current)
    return () => ro?.disconnect()
  }, [])

  // Re-rendering in a new order can drop focus; put it back.
  useEffect(() => {
    if (refocus.current === null) return
    tabEls.current.get(refocus.current)?.focus()
    refocus.current = null
  }, [items])

  function close(item: MlTabItem, fromKeyboard = false) {
    if (item.disabled || !isClosable(item)) return
    const next = nextTabAfterClose(items, item.value)
    onClose?.(item.value)
    if (fromKeyboard && next !== undefined) tabEls.current.get(next)?.focus()
  }

  function shift(item: MlTabItem, dir: 1 | -1) {
    const values = items.map((i) => i.value)
    const to = values.indexOf(item.value) + dir
    if (to < 0 || to >= values.length) return
    refocus.current = item.value
    onReorder?.(moveTab(values, item.value, to))
    setAnnounce(loc.sortable.moved(item.label, to + 1, values.length))
  }

  // Roving focus with automatic activation, per the WAI-ARIA tabs pattern.
  function onKeydown(event: KeyboardEvent, item: MlTabItem) {
    if ((event.key === 'Delete' || event.key === 'Backspace') && isClosable(item)) {
      event.preventDefault()
      close(item, true)
      return
    }
    if (reorderable && event.altKey && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
      event.preventDefault()
      shift(item, event.key === 'ArrowRight' ? 1 : -1)
      return
    }
    const enabled = items.filter((i) => !i.disabled)
    const at = enabled.findIndex((i) => i.value === current)
    const next =
      event.key === 'ArrowRight' ? (at + 1) % enabled.length : event.key === 'ArrowLeft' ? (at - 1 + enabled.length) % enabled.length : event.key === 'Home' ? 0 : event.key === 'End' ? enabled.length - 1 : -1
    if (next < 0) return
    event.preventDefault()
    set(enabled[next].value)
    tabEls.current.get(enabled[next].value)?.focus()
  }

  /* ── Pointer reordering: mouse and pen (touch keeps scrolling the strip) ── */
  const latest = useRef({ items, onReorder, loc })
  latest.current = { items, onReorder, loc }
  const dragging = useRef<{ value: string; x: number; drag: { value: string; slot: number; x: number } | null } | null>(null)
  const unlisten = useRef<(() => void) | null>(null)
  useEffect(() => () => unlisten.current?.(), [])

  function onPointerDown(event: ReactPointerEvent, item: MlTabItem) {
    if (!reorderable || item.disabled || event.button !== 0 || event.pointerType === 'touch') return
    dragging.current = { value: item.value, x: event.clientX, drag: null }
    const move = (e: PointerEvent) => {
      const d = dragging.current
      if (!d) return
      // A few pixels of travel before it counts as a drag, so clicks still select.
      if (!d.drag && Math.abs(e.clientX - d.x) < 5) return
      e.preventDefault()
      const view = list.current
      if (view) {
        // Nudge the strip when dragging past either edge.
        const r = view.getBoundingClientRect()
        if (e.clientX < r.left + 24) view.scrollLeft -= 12
        else if (e.clientX > r.right - 24) view.scrollLeft += 12
      }
      const boxes = latest.current.items.map((i) => boxOf(i.value))
      const slot = tabDropSlot(
        boxes.map((el) => {
          const r = el?.getBoundingClientRect()
          return { left: r?.left ?? 0, width: r?.width ?? 0 }
        }),
        e.clientX,
      )
      const at = boxes[slot] ?? boxes[boxes.length - 1]
      d.drag = { value: d.value, slot, x: at ? (slot < boxes.length ? at.offsetLeft : at.offsetLeft + at.offsetWidth) : 0 }
      setDrag(d.drag)
    }
    const end = (commit: boolean) => {
      unlisten.current?.()
      const done = dragging.current?.drag
      dragging.current = null
      setDrag(null)
      if (!commit || !done) return
      const { items: now, onReorder: report, loc: l } = latest.current
      const values = now.map((i) => i.value)
      const order = dropTab(values, done.value, done.slot)
      if (order.every((v, i) => v === values[i])) return
      report?.(order)
      setAnnounce(l.sortable.moved(now.find((i) => i.value === done.value)?.label ?? done.value, order.indexOf(done.value) + 1, order.length))
    }
    const up = () => end(true)
    const cancel = () => end(false)
    unlisten.current?.()
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', cancel)
    unlisten.current = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', cancel)
      unlisten.current = null
    }
  }

  const page = (dir: 1 | -1) => list.current && scrollStrip(list.current, list.current.scrollLeft + dir * list.current.clientWidth * 0.7)

  const tabOf = (item: MlTabItem) => (
    <button
      key={item.value}
      id={`${base}-tab-${item.value}`}
      ref={(el) => {
        if (el) tabEls.current.set(item.value, el)
        else tabEls.current.delete(item.value)
      }}
      type="button"
      role="tab"
      className={cx('ml-tabs__tab', drag?.value === item.value && 'ml-tabs__tab--dragging')}
      aria-selected={item.value === current}
      aria-controls={`${base}-panel-${item.value}`}
      aria-keyshortcuts={shortcuts(item)}
      tabIndex={item.value === current ? 0 : -1}
      disabled={item.disabled}
      onClick={() => !item.disabled && set(item.value)}
      onKeyDown={(e) => onKeydown(e, item)}
      onAuxClick={(e) => e.button === 1 && close(item)}
      // Stop the middle button's autoscroll on closable tabs.
      onMouseDown={(e) => e.button === 1 && isClosable(item) && e.preventDefault()}
      onPointerDown={(e) => onPointerDown(e, item)}
    >
      {renderTab ? renderTab(item, item.value === current) : item.label}
    </button>
  )

  return (
    <div className={cx('ml-tabs', `ml-tabs--${variant}`, addable && 'ml-tabs--addable')}>
      <div className={cx('ml-tabs__bar', more.start && 'ml-tabs__bar--more-start', more.end && 'ml-tabs__bar--more-end')}>
        <div ref={list} role="tablist" className="ml-tabs__list" aria-label={label} onScroll={checkOverflow}>
          {items.map((item) =>
            isClosable(item) ? (
              <div key={item.value} role="presentation" className={cx('ml-tabs__item', item.value === current && 'ml-tabs__item--active')}>
                {tabOf(item)}
                <button
                  type="button"
                  className="ml-tabs__close"
                  tabIndex={-1}
                  aria-label={loc.nav.closeTab(item.label)}
                  disabled={item.disabled}
                  onClick={(e) => {
                    e.stopPropagation()
                    close(item)
                  }}
                >
                  <Icon name="close" />
                </button>
              </div>
            ) : (
              tabOf(item)
            ),
          )}
          <span
            className="ml-tabs__ink"
            aria-hidden="true"
            style={{ width: `${ink.width}px`, transform: `translateX(${ink.x}px)`, display: ink.ready ? undefined : 'none' }}
          />
          {drag && <span className="ml-tabs__drop" aria-hidden="true" style={{ transform: `translateX(${drag.x}px)` }} />}
        </div>
        {more.start && (
          <button type="button" className="ml-tabs__scroll ml-tabs__scroll--prev" tabIndex={-1} aria-label={loc.nav.scrollTabsPrev} onClick={() => page(-1)}>
            <Icon name="chevronLeft" />
          </button>
        )}
        {more.end && (
          <button type="button" className="ml-tabs__scroll ml-tabs__scroll--next" tabIndex={-1} aria-label={loc.nav.scrollTabsNext} onClick={() => page(1)}>
            <Icon name="chevronRight" />
          </button>
        )}
        {addable && (
          <button type="button" className="ml-tabs__add" aria-label={loc.nav.addTab} onClick={() => onAdd?.()}>
            <Icon name="plus" />
          </button>
        )}
        {reorderable && (
          <span className="ml-visually-hidden" aria-live="polite">
            {announce}
          </span>
        )}
      </div>
      {panels &&
        items.map((item) =>
          panels[item.value] !== undefined ? (
            <div
              key={item.value}
              id={`${base}-panel-${item.value}`}
              role="tabpanel"
              className="ml-tabs__panel"
              tabIndex={0}
              aria-labelledby={`${base}-tab-${item.value}`}
              hidden={item.value !== current}
            >
              {panels[item.value]}
            </div>
          ) : null,
        )}
    </div>
  )
}

export interface SegmentedProps {
  options: MlSegmentedOption[]
  value?: string | number
  defaultValue?: string | number
  onChange?: (value: string | number) => void
  size?: MlSize
  block?: boolean
  disabled?: boolean
  label?: string
}

export function Segmented({ options, value, defaultValue, onChange, size = 'md', block, disabled, label }: SegmentedProps) {
  const [current, set] = useControllable<string | number | undefined>(value, defaultValue, onChange as (v: string | number | undefined) => void)
  const els = useRef(new Map<string | number, HTMLButtonElement>())
  const plate = useIndicator(() => (current !== undefined ? els.current.get(current) : undefined), [current, options])
  const isDisabled = (o: MlSegmentedOption) => !!disabled || !!o.disabled
  const enabled = options.filter((o) => !isDisabled(o))
  const hasChecked = enabled.some((o) => o.value === current)

  function onKeydown(event: KeyboardEvent) {
    if (!enabled.length) return
    const at = enabled.findIndex((o) => o.value === current)
    const k = event.key
    const next =
      k === 'ArrowRight' || k === 'ArrowDown' ? (at + 1) % enabled.length : k === 'ArrowLeft' || k === 'ArrowUp' ? (at - 1 + enabled.length) % enabled.length : k === 'Home' ? 0 : k === 'End' ? enabled.length - 1 : -1
    if (next < 0) return
    event.preventDefault()
    set(enabled[next].value)
    els.current.get(enabled[next].value)?.focus()
  }

  return (
    <div
      role="radiogroup"
      aria-label={label}
      aria-disabled={disabled || undefined}
      className={cx('ml-segmented', `ml-segmented--${size}`, { 'ml-segmented--block': block, 'ml-segmented--disabled': disabled })}
      onKeyDown={onKeydown}
    >
      <span
        className="ml-segmented__plate"
        aria-hidden="true"
        style={{ width: `${plate.width}px`, transform: `translateX(${plate.x}px)`, display: plate.ready ? undefined : 'none' }}
      />
      {options.map((o) => (
        <button
          key={o.value}
          ref={(el) => {
            if (el) els.current.set(o.value, el)
            else els.current.delete(o.value)
          }}
          type="button"
          role="radio"
          aria-checked={o.value === current}
          aria-label={!o.label ? String(o.value) : undefined}
          disabled={isDisabled(o)}
          tabIndex={isDisabled(o) ? -1 : hasChecked ? (o.value === current ? 0 : -1) : enabled[0] === o ? 0 : -1}
          className={cx('ml-segmented__item', { 'ml-segmented__item--active': o.value === current })}
          onClick={() => !isDisabled(o) && o.value !== current && set(o.value)}
        >
          {o.icon && <Icon name={o.icon} className="ml-segmented__icon" />}
          {o.label && <span>{o.label}</span>}
        </button>
      ))}
    </div>
  )
}

/* ── Pagination ────────────────────────────────────────── */

export interface PaginationProps {
  /** Number of pages. */
  total: number
  page?: number
  defaultPage?: number
  onChange?: (page: number) => void
  siblings?: number
  label?: string
}

export function Pagination({ total, page, defaultPage = 1, onChange, siblings = 1, label }: PaginationProps) {
  const loc = useLocale()
  const [current, set] = useControllable(page, defaultPage, onChange)
  const pages = Math.max(1, total)
  const at = Math.min(Math.max(1, current), pages)
  const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i)
  const s = siblings
  const slots: (number | 'gap-start' | 'gap-end')[] =
    pages <= s * 2 + 5
      ? range(1, pages)
      : at - s <= 3
        ? [...range(1, s * 2 + 3), 'gap-end', pages]
        : at + s >= pages - 2
          ? [1, 'gap-start', ...range(pages - (s * 2 + 2), pages)]
          : [1, 'gap-start', ...range(at - s, at + s), 'gap-end', pages]
  const go = (n: number) => set(Math.min(Math.max(1, n), pages))
  return (
    <nav className="ml-pagination" aria-label={label ?? loc.nav.pagination}>
      <button type="button" className="ml-pagination__btn ml-pagination__btn--nav" aria-label={loc.nav.prevPage} disabled={at <= 1} onClick={() => go(at - 1)}>
        <Icon name="chevronLeft" />
      </button>
      {slots.map((slot) =>
        typeof slot === 'string' ? (
          <span key={slot} className="ml-pagination__gap" aria-hidden="true">
            …
          </span>
        ) : (
          <button key={slot} type="button" className="ml-pagination__btn" aria-current={slot === at ? 'page' : undefined} aria-label={loc.nav.page(slot)} onClick={() => go(slot)}>
            {slot}
          </button>
        ),
      )}
      <button type="button" className="ml-pagination__btn ml-pagination__btn--nav" aria-label={loc.nav.nextPage} disabled={at >= pages} onClick={() => go(at + 1)}>
        <Icon name="chevronRight" />
      </button>
    </nav>
  )
}

/* ── Tooltip ───────────────────────────────────────────── */

export interface TooltipProps {
  content: ReactNode
  placement?: MlPlacement
  delay?: number
  /** One element: it gets aria-describedby pointing at the bubble. */
  children: ReactNode
}

export function Tooltip({ content, placement = 'top', delay = 120, children }: TooltipProps) {
  const bubbleId = `ml-tooltip-${useId().replace(/[^\w-]/g, '')}`
  const root = useRef<HTMLSpanElement>(null)
  const [visible, setVisible] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const show = (immediate = false) => {
    clearTimeout(timer.current)
    if (immediate || delay <= 0) setVisible(true)
    else timer.current = setTimeout(() => setVisible(true), delay)
  }
  const hide = () => {
    clearTimeout(timer.current)
    setVisible(false)
  }
  useEffect(() => {
    const trigger = root.current?.firstElementChild
    if (trigger && !trigger.classList.contains('ml-tooltip__bubble')) trigger.setAttribute('aria-describedby', bubbleId)
    return () => clearTimeout(timer.current)
  }, [bubbleId])
  return (
    <span
      ref={root}
      className="ml-tooltip"
      onMouseEnter={() => show()}
      onMouseLeave={hide}
      onFocus={() => show(true)}
      onBlur={hide}
      onKeyDown={(e) => e.key === 'Escape' && hide()}
    >
      {children}
      <span id={bubbleId} role="tooltip" className={cx('ml-tooltip__bubble', `ml-tooltip__bubble--${placement}`, { 'ml-tooltip__bubble--visible': visible })}>
        {content}
      </span>
    </span>
  )
}

