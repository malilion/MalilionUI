import { useCallback, useRef, useState } from 'react'

type ClassValue = string | false | null | undefined | Record<string, unknown>

/** Join class names; objects add their truthy keys (like Vue's :class). */
export function cx(...values: ClassValue[]): string {
  const out: string[] = []
  for (const v of values) {
    if (!v) continue
    if (typeof v === 'string') out.push(v)
    else for (const [k, on] of Object.entries(v)) if (on) out.push(k)
  }
  return out.join(' ')
}

/** px number or any CSS length. */
export const len = (v: number | string | undefined) => (typeof v === 'number' ? `${v}px` : v)

/**
 * A value that is controlled when `value` is passed and uncontrolled (seeded
 * from `defaultValue`) otherwise — the usual React input contract.
 */
export function useControllable<T>(value: T | undefined, defaultValue: T, onChange?: (v: T) => void) {
  const [inner, setInner] = useState(defaultValue)
  const controlled = value !== undefined
  const current = controlled ? value : inner
  const latest = useRef(current)
  latest.current = current
  const set = useCallback(
    (next: T) => {
      if (!controlled) setInner(next)
      if (next !== latest.current) onChange?.(next)
    },
    [controlled, onChange],
  )
  return [current, set] as const
}

/** aria-describedby for a field: the error wins over the hint. */
export function describedBy(id: string, hint?: string, error?: string) {
  if (error) return `${id}-error`
  if (hint) return `${id}-hint`
  return undefined
}
