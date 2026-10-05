// Shared logic for MlToggleGroup / <ToggleGroup>: what a press does to the
// value, and where the arrow keys move focus.
import type { MlToggleGroupOption, MlToggleGroupValue } from '../types'

type Key = string | number

/** The pressed values, whatever shape the model has (null / undefined = none). */
export function toggleSelection(value: MlToggleGroupValue | undefined): Key[] {
  if (Array.isArray(value)) return value
  return value === null || value === undefined ? [] : [value]
}

/**
 * The value after pressing `option`, or undefined when nothing changes
 * (the last pressed item when `allowEmpty` is false).
 * Multiple mode keeps the options' order; values not among the options stay at the end.
 */
export function nextToggleValue(
  current: MlToggleGroupValue | undefined,
  pressed: Key,
  { multiple = false, allowEmpty = true, options = [] }: { multiple?: boolean; allowEmpty?: boolean; options?: readonly MlToggleGroupOption[] } = {},
): MlToggleGroupValue | undefined {
  const selected = toggleSelection(current)
  const on = selected.includes(pressed)
  if (!multiple) {
    if (!on) return pressed
    return allowEmpty ? null : undefined
  }
  if (on && selected.length === 1 && !allowEmpty) return undefined
  const next = new Set(on ? selected.filter((v) => v !== pressed) : [...selected, pressed])
  const known = new Set(options.map((o) => o.value))
  return [...options.map((o) => o.value).filter((v) => next.has(v)), ...[...next].filter((v) => !known.has(v))]
}

/** Index of the enabled option a key moves focus to, or -1 for keys the group ignores. Arrows wrap. */
export function toggleFocusTarget(key: string, from: number, count: number): number {
  if (!count) return -1
  if (key === 'ArrowRight' || key === 'ArrowDown') return (from + 1) % count
  if (key === 'ArrowLeft' || key === 'ArrowUp') return (from - 1 + count) % count
  if (key === 'Home') return 0
  if (key === 'End') return count - 1
  return -1
}

/**
 * Roving tab stop: the last focused item while it's enabled, else the first
 * pressed one, else the first enabled one.
 */
export function toggleTabStop(enabled: readonly Key[], selected: readonly Key[], focused: Key | undefined): Key | undefined {
  if (focused !== undefined && enabled.includes(focused)) return focused
  return enabled.find((v) => selected.includes(v)) ?? enabled[0]
}
