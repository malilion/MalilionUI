import { useAttrs } from 'vue'

/**
 * Form controls render a wrapper around a native element. `class` and `style`
 * belong on the wrapper (layout), everything else (name, autocomplete,
 * aria-*, listeners) belongs on the native control.
 *
 * Returned as functions, not computeds: `useAttrs()` is always current but not
 * reactive, and the template re-runs these on every render anyway.
 */
export function useSplitAttrs() {
  const attrs = useAttrs()
  return {
    rootAttrs: () => ({ class: attrs.class, style: attrs.style }),
    controlAttrs: () => {
      const rest: Record<string, unknown> = {}
      for (const key in attrs) {
        if (key !== 'class' && key !== 'style') rest[key] = attrs[key]
      }
      return rest
    },
  }
}

export function describedBy(id: string, hint?: string, error?: string): string | undefined {
  if (error) return `${id}-error`
  if (hint) return `${id}-hint`
  return undefined
}

// Page scroll lock shared by every open modal, so closing a nested dialog
// doesn't unlock the page while its parent is still open.
let lockCount = 0
let previousOverflow = ''

export function useScrollLock() {
  let held = false
  return {
    lock() {
      if (held) return
      held = true
      if (lockCount++ === 0) {
        previousOverflow = document.documentElement.style.overflow
        document.documentElement.style.overflow = 'hidden'
      }
    },
    unlock() {
      if (!held) return
      held = false
      if (--lockCount === 0) document.documentElement.style.overflow = previousOverflow
    },
  }
}
