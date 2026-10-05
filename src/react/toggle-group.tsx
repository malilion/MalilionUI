import { useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { nextToggleValue, toggleFocusTarget, toggleSelection, toggleTabStop } from '../components/toggle-group'
import type { MlSize, MlToggleGroupOption, MlToggleGroupValue } from '../types'
import { Icon } from './basic'
import { cx, useControllable } from './utils'

/* ── ToggleGroup ─────────────────────────────────────────── */

export interface ToggleGroupProps {
  options: MlToggleGroupOption[]
  /** null (single) or an array (multiple) for nothing pressed. */
  value?: MlToggleGroupValue
  defaultValue?: MlToggleGroupValue
  onChange?: (value: MlToggleGroupValue) => void
  /** Any number pressed at once; the value is then an array. */
  multiple?: boolean
  /** Pressing the only pressed item releases it. false keeps at least one pressed. */
  allowEmpty?: boolean
  size?: MlSize
  /** Stack the items top to bottom. */
  vertical?: boolean
  /** Fill the container width, items sharing it equally. */
  block?: boolean
  disabled?: boolean
  /** Accessible name for the group. */
  label?: string
  /** Custom item content. */
  renderOption?: (option: MlToggleGroupOption, active: boolean) => ReactNode
  className?: string
}

export function ToggleGroup({
  options,
  value,
  defaultValue,
  onChange,
  multiple,
  allowEmpty = true,
  size = 'md',
  vertical,
  block,
  disabled,
  label,
  renderOption,
  className,
}: ToggleGroupProps) {
  const [current, set] = useControllable<MlToggleGroupValue>(value, defaultValue ?? (multiple ? [] : null), onChange)
  const els = useRef(new Map<string | number, HTMLButtonElement>())
  const [focused, setFocused] = useState<string | number>()
  const isDisabled = (o: MlToggleGroupOption) => !!disabled || !!o.disabled
  const selected = toggleSelection(current)
  const enabled = options.filter((o) => !isDisabled(o)).map((o) => o.value)
  const tabStop = toggleTabStop(enabled, selected, focused)

  function press(o: MlToggleGroupOption) {
    if (isDisabled(o)) return
    const next = nextToggleValue(current, o.value, { multiple, allowEmpty, options })
    if (next !== undefined) set(next)
  }

  // Arrow keys only move focus; Space / Enter press the focused item.
  function onKeyDown(event: KeyboardEvent) {
    const from = tabStop === undefined ? 0 : enabled.indexOf(tabStop)
    const to = toggleFocusTarget(event.key, from, enabled.length)
    if (to < 0) return
    event.preventDefault()
    setFocused(enabled[to])
    els.current.get(enabled[to])?.focus()
  }

  return (
    <div
      role="group"
      aria-label={label}
      aria-disabled={disabled || undefined}
      className={cx('ml-toggle-group', `ml-toggle-group--${size}`, className, {
        'ml-toggle-group--vertical': vertical,
        'ml-toggle-group--block': block,
        'ml-toggle-group--disabled': disabled,
      })}
      onKeyDown={onKeyDown}
    >
      {options.map((o) => {
        const active = selected.includes(o.value)
        return (
          <button
            key={o.value}
            ref={(el) => {
              if (el) els.current.set(o.value, el)
              else els.current.delete(o.value)
            }}
            type="button"
            aria-pressed={active}
            aria-label={!o.label ? (o.title ?? String(o.value)) : undefined}
            title={o.title}
            disabled={isDisabled(o)}
            tabIndex={o.value === tabStop ? 0 : -1}
            className={cx('ml-toggle-group__item', { 'ml-toggle-group__item--active': active })}
            onClick={() => press(o)}
            onFocus={() => setFocused(o.value)}
          >
            {renderOption ? (
              renderOption(o, active)
            ) : (
              <>
                {o.icon && <Icon name={o.icon} className="ml-toggle-group__icon" />}
                {o.label && <span>{o.label}</span>}
              </>
            )}
          </button>
        )
      })}
    </div>
  )
}
