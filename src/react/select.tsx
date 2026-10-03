import {
  Fragment,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  type RefObject,
  type SelectHTMLAttributes,
} from 'react'
import type { MlAutocompleteItem, MlCascaderOption, MlSelectOption, MlSize, MlTreeNode } from '../types'
import { Icon, Paw } from './basic'
import { Tree } from './data'
import { Field } from './form'
import { useLocale } from './locale'
import { useTransition } from './overlay'
import { cx, describedBy, useControllable } from './utils'

type Value = string | number
type Key = string | number

/** `.ml-dropdown-*` enter uses --ml-dur-slow, leave --ml-dur-fast. */
const DROPDOWN = { enter: 480, leave: 120 }

function useControlId(prefix: string, id?: string) {
  const auto = useId()
  return id ?? `${prefix}-${auto.replace(/[^\w-]/g, '')}`
}

/** Calls `handler` on a pointerdown outside `root` while `active`. */
function useOutsidePointer(root: RefObject<HTMLElement | null>, active: boolean, handler: () => void) {
  const latest = useRef(handler)
  latest.current = handler
  useEffect(() => {
    if (!active) return
    const onDown = (e: PointerEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) latest.current()
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [active])
}

/** The label with the query wrapped in <mark>. */
function highlight(label: string, query: string): ReactNode {
  const q = query.trim()
  const at = q ? label.toLowerCase().indexOf(q.toLowerCase()) : -1
  if (at < 0) return label
  return (
    <>
      {label.slice(0, at)}
      <mark className="ml-combobox__hit">{label.slice(at, at + q.length)}</mark>
      {label.slice(at + q.length)}
    </>
  )
}

/** A v-show'd menu: always rendered, hidden with display:none once the leave ends. */
const shownStyle = (mounted: boolean): CSSProperties | undefined => (mounted ? undefined : { display: 'none' })

/* ── Select (native) ───────────────────────────────────── */

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size' | 'value' | 'defaultValue' | 'onChange' | 'prefix'> {
  options: MlSelectOption[]
  value?: Value
  defaultValue?: Value
  onChange?: (value: Value) => void
  label?: ReactNode
  hint?: string
  error?: string
  index?: string
  /** Shown as an unselectable first option while nothing is chosen. */
  placeholder?: string
  size?: MlSize
  prefix?: ReactNode
}

export function Select({ options, value, defaultValue, onChange, label, hint, error, index, placeholder, size = 'md', prefix, id, required, disabled, className, style, ...rest }: SelectProps) {
  const controlId = useControlId('ml-select', id)
  const [current, set] = useControllable<Value | undefined>(value, defaultValue, onChange as (v: Value | undefined) => void)
  return (
    <Field controlId={controlId} label={label} hint={hint} error={error} index={index} required={required} className={className}>
      <div className={cx('ml-input', `ml-input--${size}`, { 'ml-input--error': error, 'ml-input--disabled': disabled })} style={style}>
        {prefix && <span className="ml-input__affix">{prefix}</span>}
        <select
          id={controlId}
          {...rest}
          className="ml-input__control"
          value={current ?? ''}
          onChange={(e) => {
            const o = options.find((o) => String(o.value) === e.target.value)
            if (o) set(o.value)
          }}
          required={required}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(controlId, hint, error)}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((o) => (
            <option key={o.value} value={o.value} disabled={o.disabled}>
              {o.label}
            </option>
          ))}
        </select>
        <Icon name="chevronDown" className="ml-input__chevron" />
      </div>
    </Field>
  )
}

/* ── Combobox ──────────────────────────────────────────── */

export interface ComboboxProps {
  options: MlSelectOption[]
  /** An array when `multiple`. */
  value?: Value | Value[] | null
  defaultValue?: Value | Value[] | null
  onChange?: (value: Value | Value[] | null) => void
  label?: ReactNode
  hint?: string
  error?: string
  index?: string
  placeholder?: string
  size?: MlSize
  required?: boolean
  disabled?: boolean
  id?: string
  /** Type to filter the options. */
  searchable?: boolean
  /** The value becomes an array; chosen options show as tags. */
  multiple?: boolean
  clearable?: boolean
  /** Custom match test for searchable mode. Default: label contains the query (case-insensitive). */
  filter?: (option: MlSelectOption, query: string) => boolean
  noMatchText?: string
  /** Renders hidden inputs so the value is posted with a native <form>. */
  name?: string
  prefix?: ReactNode
  renderTag?: (option: MlSelectOption) => ReactNode
  renderSelected?: (option: MlSelectOption) => ReactNode
  renderOption?: (option: MlSelectOption, selected: boolean) => ReactNode
  className?: string
}

export function Combobox({
  options,
  value,
  defaultValue = null,
  onChange,
  label,
  hint,
  error,
  index,
  placeholder,
  size = 'md',
  required,
  disabled,
  id,
  searchable,
  multiple,
  clearable,
  filter,
  noMatchText,
  name,
  prefix,
  renderTag,
  renderSelected,
  renderOption,
  className,
}: ComboboxProps) {
  const loc = useLocale()
  const controlId = useControlId('ml-combobox', id)
  const listId = `${controlId}-list`
  const optionId = (i: number) => `${controlId}-opt-${i}`
  const ph = placeholder ?? loc.common.choose
  const [model, setModel] = useControllable(value, defaultValue, onChange)
  const root = useRef<HTMLDivElement>(null)
  const control = useRef<HTMLElement | null>(null)
  const listEl = useRef<HTMLUListElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  /** Index into `visible` of the highlighted option (aria-activedescendant). */
  const [active, setActive] = useState(-1)
  const typeahead = useRef({ text: '', timer: undefined as ReturnType<typeof setTimeout> | undefined })
  const menu = useTransition(open, 'ml-dropdown', DROPDOWN)

  const selectedValues: Value[] = Array.isArray(model) ? model : model === null || model === undefined ? [] : [model]
  const isSelected = (o: MlSelectOption) => selectedValues.includes(o.value)
  const selectedOptions = selectedValues.map((v) => options.find((o) => o.value === v)).filter((o): o is MlSelectOption => !!o)
  const singleLabel = multiple ? '' : (selectedOptions[0]?.label ?? '')
  const hasValue = selectedValues.length > 0
  const visibleFor = (q: string) => {
    const s = q.trim().toLowerCase()
    if (!searchable || !s) return options
    const test = filter ?? ((o: MlSelectOption, t: string) => o.label.toLowerCase().includes(t))
    return options.filter((o) => test(o, s))
  }
  const visible = visibleFor(query)

  function step(list: MlSelectOption[], from: number, delta: 1 | -1) {
    for (let i = 1; i <= list.length; i++) {
      const next = (from + delta * i + list.length * 2) % list.length
      if (!list[next].disabled) return next
    }
    return -1
  }

  /** Opens the list; returns the highlighted index. */
  function show() {
    if (disabled) return -1
    if (open) return active
    const sel = visible.findIndex((o) => isSelected(o) && !o.disabled)
    const at = sel !== -1 ? sel : step(visible, -1, 1)
    setOpen(true)
    setActive(at)
    return at
  }

  function hide() {
    setOpen(false)
    setQuery('')
    setActive(-1)
  }

  function choose(option: MlSelectOption) {
    if (option.disabled) return
    let next: Value | Value[] | null
    if (multiple) {
      next = isSelected(option) ? selectedValues.filter((v) => v !== option.value) : [...selectedValues, option.value]
      setQuery('')
      // Keep the highlighted row on the option just toggled, even if the list re-filtered.
      setActive(Math.max(0, visibleFor('').indexOf(option)))
    } else {
      next = option.value
      hide()
    }
    setModel(next)
    control.current?.focus()
  }

  function removeValue(v: Value) {
    if (disabled) return
    setModel(selectedValues.filter((x) => x !== v))
    control.current?.focus()
  }

  function clear() {
    setModel(multiple ? [] : null)
    setQuery('')
    control.current?.focus()
  }

  function onBoxClick(event: ReactMouseEvent) {
    if (disabled) return
    if ((event.target as HTMLElement).closest('.ml-combobox__tag-remove, .ml-combobox__clear')) return
    control.current?.focus()
    if (open && !searchable) hide()
    else show()
  }

  function onInput(q: string) {
    setQuery(q)
    setOpen(true)
    setActive(step(visibleFor(q), -1, 1))
  }

  function onKeydown(event: KeyboardEvent) {
    const key = event.key
    if (key === 'ArrowDown' || key === 'ArrowUp') {
      event.preventDefault()
      if (!open) return void show()
      setActive(step(visible, active, key === 'ArrowDown' ? 1 : -1))
    } else if ((key === 'Home' || key === 'End') && open && !searchable) {
      event.preventDefault()
      setActive(key === 'Home' ? step(visible, -1, 1) : step(visible, 0, -1))
    } else if (key === 'Enter' || (key === ' ' && !searchable)) {
      // Never let Enter submit the surrounding form while the list is in use.
      if (open || key === ' ') event.preventDefault()
      if (!open) {
        if (key === ' ') show()
        return
      }
      const option = visible[active]
      if (option) choose(option)
    } else if (key === 'Escape') {
      if (open) {
        // Close just the list, not a modal or drawer around it.
        event.preventDefault()
        event.stopPropagation()
        hide()
      }
    } else if (key === 'Tab') {
      if (open) hide()
    } else if (key === 'Backspace' && multiple && searchable && !query && hasValue) {
      removeValue(selectedValues[selectedValues.length - 1])
    } else if (!searchable && key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      const t = typeahead.current
      clearTimeout(t.timer)
      t.text += key.toLowerCase()
      t.timer = setTimeout(() => (t.text = ''), 600)
      const at = show()
      const start = t.text.length === 1 ? at + 1 : at
      for (let i = 0; i < visible.length; i++) {
        const idx = (start + i) % visible.length
        if (!visible[idx].disabled && visible[idx].label.toLowerCase().startsWith(t.text)) {
          setActive(idx)
          break
        }
      }
    }
  }

  useEffect(() => {
    if (active < 0 || !open) return
    ;(listEl.current?.children[active] as HTMLElement | undefined)?.scrollIntoView?.({ block: 'nearest' })
  }, [active, open])
  useEffect(() => () => clearTimeout(typeahead.current.timer), [])
  useOutsidePointer(root, open, hide)

  const labelledBy = label ? `${controlId}-label` : undefined
  const aria = {
    role: 'combobox',
    'aria-expanded': open,
    'aria-controls': listId,
    'aria-haspopup': 'listbox' as const,
    'aria-activedescendant': open && active >= 0 ? optionId(active) : undefined,
    'aria-invalid': error ? true : undefined,
    'aria-required': required || undefined,
    'aria-describedby': describedBy(controlId, hint, error),
  }
  const setControl = (el: HTMLElement | null) => {
    control.current = el
  }

  return (
    <Field controlId={controlId} label={label} hint={hint} error={error} index={index} required={required} className={className}>
      <div ref={root} className={cx('ml-combobox', { 'ml-combobox--open': open, 'ml-combobox--multiple': multiple, 'ml-combobox--searchable': searchable })}>
        <div className={cx('ml-input', `ml-input--${size}`, 'ml-combobox__box', { 'ml-input--error': error, 'ml-input--disabled': disabled })} onClick={onBoxClick}>
          {prefix && <span className="ml-input__affix">{prefix}</span>}
          <div className="ml-combobox__value">
            {multiple &&
              selectedOptions.map((o) => (
                <span key={o.value} className="ml-combobox__tag">
                  {renderTag ? renderTag(o) : o.label}
                  {!disabled && (
                    <button
                      type="button"
                      className="ml-combobox__tag-remove"
                      tabIndex={-1}
                      aria-label={loc.common.remove(o.label)}
                      onClick={(e) => {
                        e.stopPropagation()
                        removeValue(o.value)
                      }}
                    >
                      <Icon name="close" />
                    </button>
                  )}
                </span>
              ))}
            {searchable ? (
              <input
                id={controlId}
                ref={setControl}
                {...aria}
                className="ml-input__control ml-combobox__search"
                type="text"
                autoComplete="off"
                aria-autocomplete="list"
                value={open || multiple ? query : singleLabel}
                placeholder={multiple && hasValue ? '' : open && singleLabel ? singleLabel : ph}
                disabled={disabled}
                onChange={(e) => onInput(e.target.value)}
                onKeyDown={onKeydown}
              />
            ) : (
              <div
                id={controlId}
                ref={setControl}
                {...aria}
                className="ml-input__control ml-combobox__display"
                tabIndex={disabled ? -1 : 0}
                aria-labelledby={labelledBy}
                aria-disabled={disabled || undefined}
                onKeyDown={onKeydown}
              >
                {!multiple && singleLabel ? (
                  <span className="ml-combobox__single">{renderSelected ? renderSelected(selectedOptions[0]) : singleLabel}</span>
                ) : !hasValue ? (
                  <span className="ml-combobox__placeholder">{ph}</span>
                ) : null}
              </div>
            )}
          </div>
          {clearable && hasValue && !disabled && (
            <button
              type="button"
              className="ml-combobox__clear"
              tabIndex={-1}
              aria-label={loc.common.clear}
              onClick={(e) => {
                e.stopPropagation()
                clear()
              }}
            >
              <Icon name="close" />
            </button>
          )}
          <Icon name="chevronDown" className="ml-combobox__chevron" />
        </div>

        <ul
          id={listId}
          ref={listEl}
          role="listbox"
          className={cx('ml-dropdown__menu ml-combobox__menu', menu.className)}
          style={shownStyle(menu.mounted)}
          aria-multiselectable={multiple || undefined}
          aria-labelledby={labelledBy}
          tabIndex={-1}
        >
          {visible.map((o, i) => (
            <li
              key={o.value}
              id={optionId(i)}
              role="option"
              aria-selected={isSelected(o)}
              aria-disabled={o.disabled || undefined}
              className={cx('ml-dropdown__item', 'ml-combobox__option', { 'ml-combobox__option--active': i === active, 'ml-dropdown__item--checked': isSelected(o) })}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(o)}
              onMouseMove={() => !o.disabled && setActive(i)}
            >
              {multiple && (
                <span className="ml-combobox__check" aria-hidden="true">
                  {isSelected(o) && <Icon name="check" />}
                </span>
              )}
              <span className="ml-dropdown__label">{renderOption ? renderOption(o, isSelected(o)) : highlight(o.label, query)}</span>
              {!multiple && isSelected(o) && <Paw tone="current" className="ml-dropdown__paw" />}
            </li>
          ))}
          {!visible.length && (
            <li className="ml-combobox__empty" role="presentation">
              <Paw tone="steel" className="ml-combobox__empty-paw" />
              {noMatchText ?? loc.common.noMatch}
            </li>
          )}
        </ul>

        {name && selectedValues.map((v) => <input key={v} type="hidden" name={name} value={v} />)}
      </div>
    </Field>
  )
}

/* ── Autocomplete ──────────────────────────────────────── */

export interface AutocompleteSuggestion {
  value: string
  label: string
  hint?: string
}

export interface AutocompleteProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'prefix' | 'value' | 'defaultValue' | 'onChange' | 'onSelect'> {
  value?: string
  defaultValue?: string
  onChange?: (value: string) => void
  /** A suggestion was picked. */
  onSelect?: (item: AutocompleteSuggestion) => void
  /** Static suggestions, filtered by what's typed. */
  suggestions?: MlAutocompleteItem[]
  /** Async source; called (debounced) with the query. Overrides `suggestions`. */
  fetchSuggestions?: (query: string) => Promise<MlAutocompleteItem[]> | MlAutocompleteItem[]
  debounce?: number
  /** Characters needed before suggestions show. 0 shows them on focus. */
  minChars?: number
  limit?: number
  label?: ReactNode
  hint?: string
  error?: string
  index?: string
  size?: MlSize
  clearable?: boolean
  /** Shown when a fetch returns nothing. Empty string hides the row. */
  noMatchText?: string
  prefix?: ReactNode
  suffix?: ReactNode
  renderItem?: (item: AutocompleteSuggestion) => ReactNode
}

const normalize = (item: MlAutocompleteItem): AutocompleteSuggestion =>
  typeof item === 'string' ? { value: item, label: item } : { value: item.value, label: item.label ?? item.value, hint: item.hint }

export function Autocomplete({
  value,
  defaultValue = '',
  onChange,
  onSelect,
  suggestions = [],
  fetchSuggestions,
  debounce = 200,
  minChars = 1,
  limit = 8,
  label,
  hint,
  error,
  index,
  placeholder,
  size = 'md',
  required,
  disabled,
  clearable,
  id,
  noMatchText,
  prefix,
  suffix,
  renderItem,
  className,
  style,
  onFocus,
  onKeyDown,
  ...rest
}: AutocompleteProps) {
  const loc = useLocale()
  const controlId = useControlId('ml-autocomplete', id)
  const listId = `${controlId}-list`
  const optionId = (i: number) => `${controlId}-opt-${i}`
  const [model, setModel] = useControllable(value, defaultValue, onChange)
  const root = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const listEl = useRef<HTMLUListElement>(null)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const [loading, setLoading] = useState(false)
  const [fetched, setFetched] = useState<AutocompleteSuggestion[] | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const request = useRef(0)

  const items = (() => {
    if (fetchSuggestions) return (fetched ?? []).slice(0, limit)
    const q = model.trim().toLowerCase()
    const all = suggestions.map(normalize)
    const hits = q ? all.filter((s) => s.label.toLowerCase().includes(q) && s.label.toLowerCase() !== q) : all
    return hits.slice(0, limit)
  })()
  const enough = (q: string) => q.trim().length >= minChars
  const showEmpty = !!fetchSuggestions && noMatchText !== '' && !loading && fetched !== null && !items.length
  const expanded = open && enough(model) && (items.length > 0 || loading || showEmpty)
  const menu = useTransition(expanded, 'ml-dropdown', DROPDOWN)

  function load(q: string) {
    if (!fetchSuggestions) return
    clearTimeout(timer.current)
    if (!enough(q)) {
      setFetched(null)
      setLoading(false)
      return
    }
    setLoading(true)
    const req = ++request.current
    timer.current = setTimeout(async () => {
      try {
        const result = await fetchSuggestions(q)
        if (req === request.current) setFetched(result.map(normalize))
      } catch {
        if (req === request.current) setFetched([])
      } finally {
        if (req === request.current) setLoading(false)
      }
    }, debounce)
  }

  function close() {
    setOpen(false)
    setActive(-1)
  }

  function choose(item: AutocompleteSuggestion) {
    setModel(item.value)
    onSelect?.(item)
    close()
    input.current?.focus()
  }

  function clear() {
    setModel('')
    setFetched(null)
    input.current?.focus()
  }

  function onKeydown(event: KeyboardEvent<HTMLInputElement>) {
    onKeyDown?.(event)
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (!open) {
        setOpen(true)
        load(model)
        return
      }
      const n = items.length
      if (!n) return
      const delta = event.key === 'ArrowDown' ? 1 : -1
      setActive(active < 0 ? (delta > 0 ? 0 : n - 1) : (active + delta + n) % n)
    } else if (event.key === 'Enter') {
      // Only intercept Enter when a suggestion is highlighted; otherwise let the form submit.
      if (expanded && active >= 0 && items[active]) {
        event.preventDefault()
        choose(items[active])
      } else close()
    } else if (event.key === 'Escape') {
      if (expanded) {
        event.preventDefault()
        event.stopPropagation()
        close()
      }
    } else if (event.key === 'Tab') close()
  }

  useEffect(() => {
    if (active < 0) return
    ;(listEl.current?.children[active] as HTMLElement | undefined)?.scrollIntoView?.({ block: 'nearest' })
  }, [active])
  useEffect(() => () => clearTimeout(timer.current), [])
  useOutsidePointer(root, open, close)

  return (
    <Field controlId={controlId} label={label} hint={hint} error={error} index={index} required={required} className={className}>
      <div ref={root} className={cx('ml-autocomplete', { 'ml-autocomplete--open': expanded })} style={style}>
        <div className={cx('ml-input', `ml-input--${size}`, { 'ml-input--error': error, 'ml-input--disabled': disabled })}>
          {prefix && <span className="ml-input__affix">{prefix}</span>}
          <input
            id={controlId}
            ref={input}
            {...rest}
            className="ml-input__control"
            type="text"
            role="combobox"
            autoComplete="off"
            aria-autocomplete="list"
            aria-haspopup="listbox"
            aria-expanded={expanded}
            aria-controls={listId}
            aria-activedescendant={expanded && active >= 0 ? optionId(active) : undefined}
            aria-busy={loading || undefined}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy(controlId, hint, error)}
            value={model}
            placeholder={placeholder}
            required={required}
            disabled={disabled}
            onChange={(e) => {
              setModel(e.target.value)
              setOpen(true)
              setActive(-1)
              load(e.target.value)
            }}
            onFocus={(e) => {
              onFocus?.(e)
              if (disabled) return
              setOpen(true)
              if (fetchSuggestions && fetched === null) load(model)
            }}
            onKeyDown={onKeydown}
          />
          {loading ? (
            <span className="ml-autocomplete__spinner" aria-hidden="true" />
          ) : (
            clearable &&
            model &&
            !disabled && (
              <button type="button" className="ml-combobox__clear ml-autocomplete__clear" tabIndex={-1} aria-label={loc.common.clear} onClick={clear}>
                <Icon name="close" />
              </button>
            )
          )}
          {suffix && <span className="ml-input__affix">{suffix}</span>}
        </div>

        <ul
          id={listId}
          ref={listEl}
          role="listbox"
          className={cx('ml-dropdown__menu ml-combobox__menu', menu.className)}
          style={shownStyle(menu.mounted)}
          aria-labelledby={label ? `${controlId}-label` : undefined}
        >
          {items.map((item, i) => (
            <li
              key={`${i}-${item.value}`}
              id={optionId(i)}
              role="option"
              aria-selected={i === active}
              className={cx('ml-dropdown__item', 'ml-combobox__option', { 'ml-combobox__option--active': i === active })}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(item)}
              onMouseMove={() => setActive(i)}
            >
              <span className="ml-dropdown__label">{renderItem ? renderItem(item) : highlight(item.label, model)}</span>
              {item.hint && <span className="ml-dropdown__hint">{item.hint}</span>}
            </li>
          ))}
          {loading && !items.length ? (
            <li className="ml-combobox__empty" role="presentation">
              <span className="ml-autocomplete__spinner" aria-hidden="true" />
              {loc.autocomplete.searching}
            </li>
          ) : showEmpty ? (
            <li className="ml-combobox__empty" role="presentation">
              {noMatchText ?? loc.autocomplete.empty}
            </li>
          ) : null}
        </ul>
      </div>
    </Field>
  )
}

/* ── Cascader ──────────────────────────────────────────── */

export interface CascaderProps {
  options: MlCascaderOption[]
  /** The chosen path of values, outermost first. */
  value?: Value[]
  defaultValue?: Value[]
  onChange?: (path: Value[], options: MlCascaderOption[]) => void
  label?: string
  hint?: string
  error?: string
  index?: string
  placeholder?: string
  size?: MlSize
  required?: boolean
  disabled?: boolean
  clearable?: boolean
  /** Allow picking a parent, not only a leaf. */
  changeOnSelect?: boolean
  /** Type to search every path at once. */
  searchable?: boolean
  /** Joins the labels of the chosen path. */
  separator?: string
  id?: string
  className?: string
}

export function Cascader({
  options,
  value,
  defaultValue,
  onChange,
  label,
  hint,
  error,
  index,
  placeholder,
  size = 'md',
  required,
  disabled,
  clearable,
  changeOnSelect,
  searchable,
  separator = ' / ',
  id,
  className,
}: CascaderProps) {
  const loc = useLocale()
  const controlId = useControlId('ml-cascader', id)
  const ph = placeholder ?? loc.cascader.placeholder
  const [model, setModel] = useControllable<Value[]>(value, defaultValue ?? [])
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLDivElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  /** Path being browsed in the panel (may be deeper or shallower than the value). */
  const [browse, setBrowse] = useState<Value[]>([])
  const [query, setQuery] = useState('')
  const focusReq = useRef<{ level: number; which: 'chosen' | 'first' } | null>(null)
  const pop = useTransition(open, 'ml-dropdown', DROPDOWN)

  function resolve(path: Value[]) {
    const chain: MlCascaderOption[] = []
    let level: MlCascaderOption[] | undefined = options
    for (const v of path) {
      const found: MlCascaderOption | undefined = level?.find((o) => o.value === v)
      if (!found) break
      chain.push(found)
      level = found.children
    }
    return chain
  }
  const columnsOf = (path: Value[]) => {
    const cols: MlCascaderOption[][] = [options]
    for (const o of resolve(path)) if (o.children?.length) cols.push(o.children)
    return cols
  }
  const chosen = resolve(model)
  const columns = columnsOf(browse)

  const matches = (() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    const out: MlCascaderOption[][] = []
    const walk = (opts: MlCascaderOption[], trail: MlCascaderOption[]) => {
      for (const o of opts) {
        if (o.disabled) continue
        const path = [...trail, o]
        if (o.children?.length) {
          if (changeOnSelect) out.push(path)
          walk(o.children, path)
        } else out.push(path)
      }
    }
    walk(options, [])
    return out.filter((p) => p.some((o) => o.label.toLowerCase().includes(q))).slice(0, 50)
  })()

  // Focus requests wait for the panel (and the new column) to render.
  useEffect(() => {
    const req = focusReq.current
    if (!req || !panel.current) return
    focusReq.current = null
    const col = panel.current.querySelectorAll<HTMLElement>('.ml-cascader__col')[req.level]
    if (!col) return
    const target = (req.which === 'chosen' && col.querySelector<HTMLElement>('.ml-cascader__opt--on')) || col.querySelector<HTMLElement>('.ml-cascader__opt:not([aria-disabled="true"])')
    target?.focus()
  })

  function show() {
    if (disabled || open) return
    setBrowse([...model])
    setQuery('')
    setOpen(true)
    focusReq.current = { level: Math.max(0, columnsOf(model).length - 1), which: 'chosen' }
  }

  function hide(returnFocus = true) {
    setOpen(false)
    setQuery('')
    focusReq.current = null
    if (returnFocus) trigger.current?.focus()
  }

  function update(path: Value[], opts: MlCascaderOption[]) {
    setModel(path)
    onChange?.(path, opts)
  }

  function commit(path: MlCascaderOption[]) {
    update(
      path.map((o) => o.value),
      path,
    )
    hide()
  }

  function pick(level: number, option: MlCascaderOption) {
    if (option.disabled) return
    const path = [...browse.slice(0, level), option.value]
    setBrowse(path)
    if (!option.children?.length) commit(resolve(path))
    else if (changeOnSelect) update(path, resolve(path))
  }

  function onOptionKeydown(event: KeyboardEvent<HTMLElement>, level: number, option: MlCascaderOption) {
    const col = event.currentTarget.closest('.ml-cascader__col')!
    const opts = [...col.querySelectorAll<HTMLElement>('.ml-cascader__opt:not([aria-disabled="true"])')]
    const at = opts.indexOf(event.currentTarget)
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        opts[(at + 1) % opts.length]?.focus()
        break
      case 'ArrowUp':
        event.preventDefault()
        opts[(at - 1 + opts.length) % opts.length]?.focus()
        break
      case 'ArrowRight':
        event.preventDefault()
        if (option.children?.length && !option.disabled) {
          setBrowse([...browse.slice(0, level), option.value])
          focusReq.current = { level: level + 1, which: 'first' }
        }
        break
      case 'ArrowLeft':
        event.preventDefault()
        if (level > 0) {
          setBrowse(browse.slice(0, level))
          focusReq.current = { level: level - 1, which: 'chosen' }
        }
        break
      case 'Enter':
      case ' ':
        event.preventDefault()
        pick(level, option)
        if (option.children?.length && !option.disabled) focusReq.current = { level: level + 1, which: 'first' }
        break
      case 'Escape':
        event.preventDefault()
        event.stopPropagation()
        hide()
        break
      case 'Tab':
        hide(false)
    }
  }

  function onSearchKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.stopPropagation()
      hide()
    } else if (event.key === 'ArrowDown') {
      event.preventDefault()
      panel.current?.querySelector<HTMLElement>('.ml-cascader__hit')?.focus()
    }
  }

  function onHitKeydown(event: KeyboardEvent<HTMLElement>) {
    const hits = [...(panel.current?.querySelectorAll<HTMLElement>('.ml-cascader__hit') ?? [])]
    const at = hits.indexOf(event.currentTarget)
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      hits[at + 1]?.focus()
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      ;(at === 0 ? panel.current?.querySelector<HTMLElement>('.ml-cascader__search input') : hits[at - 1])?.focus()
    } else if (event.key === 'Escape') {
      event.stopPropagation()
      hide()
    }
  }

  useOutsidePointer(root, open, () => hide(false))
  const toggle = () => (open ? hide() : show())

  return (
    <Field controlId={controlId} label={label} hint={hint} error={error} index={index} required={required} className={className}>
      <div ref={root} className={cx('ml-cascader', 'ml-combobox', { 'ml-combobox--open': open })}>
        <div className={cx('ml-input', `ml-input--${size}`, 'ml-combobox__box', { 'ml-input--error': error, 'ml-input--disabled': disabled })} onClick={toggle}>
          <div
            id={controlId}
            ref={trigger}
            className="ml-input__control ml-combobox__display"
            role="combobox"
            aria-haspopup="dialog"
            aria-expanded={open}
            aria-labelledby={label ? `${controlId}-label` : undefined}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy(controlId, hint, error)}
            aria-disabled={disabled || undefined}
            tabIndex={disabled ? -1 : 0}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault()
                show()
              } else if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                toggle()
              }
            }}
          >
            {chosen.length ? (
              <span className="ml-combobox__single ml-cascader__path">
                {chosen.map((o, i) => (
                  <Fragment key={o.value}>
                    {i > 0 && <span className="ml-cascader__sep">{separator.trim() || '/'}</span>}
                    {o.label}
                  </Fragment>
                ))}
              </span>
            ) : (
              <span className="ml-combobox__placeholder">{ph}</span>
            )}
          </div>
          {clearable && model.length > 0 && !disabled && (
            <button
              type="button"
              className="ml-combobox__clear"
              tabIndex={-1}
              aria-label={loc.common.clear}
              onClick={(e) => {
                e.stopPropagation()
                update([], [])
                trigger.current?.focus()
              }}
            >
              <Icon name="close" />
            </button>
          )}
          <Icon name="chevronDown" className="ml-combobox__chevron" />
        </div>

        {pop.mounted && (
          <div ref={panel} className={cx('ml-cascader__panel', pop.className)} role="dialog" aria-label={label ?? ph}>
            {searchable && (
              <div className="ml-cascader__search">
                <Icon name="search" />
                <input type="text" value={query} placeholder={loc.common.search} autoComplete="off" onChange={(e) => setQuery(e.target.value)} onKeyDown={onSearchKeydown} />
              </div>
            )}
            {query.trim() ? (
              <ul className="ml-cascader__hits">
                {matches.map((path, i) => (
                  <li key={i}>
                    <button type="button" className="ml-cascader__hit" onClick={() => commit(path)} onKeyDown={onHitKeydown}>
                      {path.map((o, k) => (
                        <Fragment key={o.value}>
                          {k > 0 && <span className="ml-cascader__sep">/</span>}
                          {highlight(o.label, query)}
                        </Fragment>
                      ))}
                    </button>
                  </li>
                ))}
                {!matches.length && (
                  <li className="ml-combobox__empty">
                    <Paw tone="steel" className="ml-combobox__empty-paw" />
                    {loc.common.noMatch}
                  </li>
                )}
              </ul>
            ) : (
              <div className="ml-cascader__cols">
                {columns.map((col, level) => (
                  <ul key={level} className="ml-cascader__col" role="listbox">
                    {col.map((o) => {
                      const isChosen = model[level] === o.value && model.length === level + 1
                      return (
                        <li key={o.value} role="none">
                          <button
                            type="button"
                            role="option"
                            aria-selected={browse[level] === o.value}
                            aria-disabled={o.disabled || undefined}
                            aria-haspopup={o.children?.length ? 'listbox' : undefined}
                            className={cx('ml-cascader__opt', { 'ml-cascader__opt--on': browse[level] === o.value, 'ml-cascader__opt--chosen': isChosen })}
                            tabIndex={-1}
                            onClick={() => pick(level, o)}
                            onKeyDown={(e) => onOptionKeydown(e, level, o)}
                          >
                            <span className="ml-cascader__label">{o.label}</span>
                            {o.children?.length ? (
                              <Icon name="chevronRight" className="ml-cascader__arrow" />
                            ) : isChosen ? (
                              <Paw tone="current" className="ml-dropdown__paw" />
                            ) : null}
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Field>
  )
}

/* ── TreeSelect ────────────────────────────────────────── */

export interface TreeSelectProps {
  data: MlTreeNode[]
  /** An array of keys when `multiple`. */
  value?: Key | Key[] | null
  defaultValue?: Key | Key[] | null
  onChange?: (value: Key | Key[] | null) => void
  /** Expanded node keys. */
  expanded?: Key[]
  defaultExpanded?: Key[]
  onExpandedChange?: (keys: Key[]) => void
  /** Checkboxes; the value becomes an array of keys. */
  multiple?: boolean
  label?: string
  hint?: string
  error?: string
  index?: string
  placeholder?: string
  size?: MlSize
  required?: boolean
  disabled?: boolean
  clearable?: boolean
  /** Filter box at the top of the panel. */
  searchable?: boolean
  /** Multiple: most tags shown before "+N". */
  maxTags?: number
  id?: string
  className?: string
}

export function TreeSelect({
  data,
  value,
  defaultValue = null,
  onChange,
  expanded,
  defaultExpanded,
  onExpandedChange,
  multiple,
  label,
  hint,
  error,
  index,
  placeholder,
  size = 'md',
  required,
  disabled,
  clearable,
  searchable,
  maxTags = 3,
  id,
  className,
}: TreeSelectProps) {
  const loc = useLocale()
  const controlId = useControlId('ml-treeselect', id)
  const ph = placeholder ?? loc.common.choose
  const [model, setModel] = useControllable<Key | Key[] | null>(value, defaultValue)
  const [expandedKeys, setExpandedKeys] = useControllable<Key[]>(expanded, defaultExpanded ?? [], onExpandedChange)
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLDivElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const focusReq = useRef(false)
  const pop = useTransition(open, 'ml-dropdown', DROPDOWN)

  const byKey = new Map<Key, { node: MlTreeNode; parent: Key | null }>()
  const walk = (nodes: MlTreeNode[], parent: Key | null) =>
    nodes.forEach((n) => {
      byKey.set(n.key, { node: n, parent })
      if (n.children) walk(n.children, n.key)
    })
  walk(data, null)
  const ancestors = (k: Key) => {
    const out: Key[] = []
    let p = byKey.get(k)?.parent ?? null
    while (p !== null) {
      out.push(p)
      p = byKey.get(p)?.parent ?? null
    }
    return out
  }

  const keys: Key[] = Array.isArray(model) ? model : model === null || model === undefined ? [] : [model]
  // In multiple mode, show a checked parent instead of all of its children.
  const keySet = new Set(keys)
  const shownNodes = keys
    .filter((k) => !ancestors(k).some((p) => keySet.has(p)))
    .map((k) => byKey.get(k)?.node)
    .filter((n): n is MlTreeNode => !!n)

  useEffect(() => {
    if (!focusReq.current || !panel.current) return
    focusReq.current = false
    const target = panel.current.querySelector<HTMLElement>('.ml-treeselect__search input') ?? panel.current.querySelector<HTMLElement>('[role="treeitem"][tabindex="0"]')
    target?.focus()
  })

  function show() {
    if (disabled || open) return
    // Expand the ancestors of the chosen nodes so they're visible on open.
    const next = new Set(expandedKeys)
    for (const k of keys) ancestors(k).forEach((p) => next.add(p))
    if (next.size !== expandedKeys.length) setExpandedKeys([...next])
    setQuery('')
    setOpen(true)
    focusReq.current = true
  }

  function hide(returnFocus = true) {
    setOpen(false)
    focusReq.current = false
    if (returnFocus) trigger.current?.focus()
  }

  function update(next: Key | Key[] | null) {
    setModel(next)
    onChange?.(next)
  }

  function remove(node: MlTreeNode) {
    // Unchecking a parent unchecks everything under it, and its ancestors are no longer fully checked.
    const drop = new Set<Key>(ancestors(node.key))
    const under = (n: MlTreeNode) => {
      drop.add(n.key)
      n.children?.forEach(under)
    }
    under(node)
    update(keys.filter((k) => !drop.has(k)))
  }

  function onPanelKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.stopPropagation()
      hide()
    } else if (event.key === 'ArrowDown' && (event.target as HTMLElement).tagName === 'INPUT') {
      event.preventDefault()
      panel.current?.querySelector<HTMLElement>('[role="treeitem"]')?.focus()
    }
  }

  useOutsidePointer(root, open, () => hide(false))
  const toggle = () => (open ? hide() : show())

  return (
    <Field controlId={controlId} label={label} hint={hint} error={error} index={index} required={required} className={className}>
      <div ref={root} className={cx('ml-treeselect', 'ml-combobox', { 'ml-combobox--open': open, 'ml-combobox--multiple': multiple })}>
        <div
          className={cx('ml-input', `ml-input--${size}`, 'ml-combobox__box', { 'ml-input--error': error, 'ml-input--disabled': disabled })}
          onClick={(e) => (e.target as HTMLElement).closest('.ml-combobox__tag-remove, .ml-combobox__clear') || toggle()}
        >
          <div className="ml-combobox__value">
            {multiple && (
              <>
                {shownNodes.slice(0, maxTags).map((node) => (
                  <span key={node.key} className="ml-combobox__tag">
                    {node.label}
                    {!disabled && (
                      <button
                        type="button"
                        className="ml-combobox__tag-remove"
                        tabIndex={-1}
                        aria-label={loc.common.remove(node.label)}
                        onClick={(e) => {
                          e.stopPropagation()
                          remove(node)
                        }}
                      >
                        <Icon name="close" />
                      </button>
                    )}
                  </span>
                ))}
                {shownNodes.length > maxTags && <span className="ml-combobox__tag ml-treeselect__more">+{shownNodes.length - maxTags}</span>}
              </>
            )}
            <div
              id={controlId}
              ref={trigger}
              className="ml-input__control ml-combobox__display"
              role="combobox"
              aria-haspopup="tree"
              aria-expanded={open}
              aria-labelledby={label ? `${controlId}-label` : undefined}
              aria-invalid={error ? true : undefined}
              aria-describedby={describedBy(controlId, hint, error)}
              aria-disabled={disabled || undefined}
              tabIndex={disabled ? -1 : 0}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') {
                  e.preventDefault()
                  show()
                } else if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  toggle()
                }
              }}
            >
              {!multiple && shownNodes[0] ? (
                <span className="ml-combobox__single">{shownNodes[0].label}</span>
              ) : !shownNodes.length ? (
                <span className="ml-combobox__placeholder">{ph}</span>
              ) : null}
            </div>
          </div>
          {clearable && keys.length > 0 && !disabled && (
            <button
              type="button"
              className="ml-combobox__clear"
              tabIndex={-1}
              aria-label={loc.common.clear}
              onClick={(e) => {
                e.stopPropagation()
                update(multiple ? [] : null)
                trigger.current?.focus()
              }}
            >
              <Icon name="close" />
            </button>
          )}
          <Icon name="chevronDown" className="ml-combobox__chevron" />
        </div>

        {pop.mounted && (
          <div ref={panel} className={cx('ml-cascader__panel ml-treeselect__panel', pop.className)} onKeyDown={onPanelKeydown}>
            {searchable && (
              <div className="ml-cascader__search ml-treeselect__search">
                <Icon name="search" />
                <input type="text" value={query} placeholder={loc.common.search} autoComplete="off" onChange={(e) => setQuery(e.target.value)} />
              </div>
            )}
            {multiple ? (
              <Tree data={data} expanded={expandedKeys} onExpandedChange={setExpandedKeys} filter={query} label={label ?? ph} checkable selectable={false} checked={keys} onCheckedChange={update} />
            ) : (
              <Tree
                data={data}
                expanded={expandedKeys}
                onExpandedChange={setExpandedKeys}
                filter={query}
                label={label ?? ph}
                selected={keys[0] ?? null}
                onSelect={(node) => {
                  if (node.disabled) return
                  update(node.key)
                  hide()
                }}
              />
            )}
          </div>
        )}
      </div>
    </Field>
  )
}
