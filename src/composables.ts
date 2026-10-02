import { onBeforeUnmount, useAttrs, watch, type Ref } from 'vue'

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

export const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), ' +
  'textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Keep Tab / Shift+Tab inside `container` (modal dialogs). Call from a keydown
 * handler; it only acts on Tab.
 */
export function trapFocus(event: KeyboardEvent, container: HTMLElement) {
  if (event.key !== 'Tab') return
  const focusable = [...container.querySelectorAll<HTMLElement>(FOCUSABLE)]
  if (focusable.length === 0) {
    event.preventDefault()
    return
  }
  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  const active = document.activeElement
  if (event.shiftKey && (active === first || active === container)) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && active === last) {
    event.preventDefault()
    first.focus()
  }
}

/** Calls `handler` on a pointerdown outside `root`, while `active()` is true. */
export function useOutsidePointer(
  root: Ref<HTMLElement | undefined>,
  active: () => boolean,
  handler: () => void,
) {
  function onPointerDown(event: PointerEvent) {
    if (root.value && !root.value.contains(event.target as Node)) handler()
  }
  watch(
    active,
    (on) => {
      if (typeof document === 'undefined') return // SSR
      if (on) document.addEventListener('pointerdown', onPointerDown)
      else document.removeEventListener('pointerdown', onPointerDown)
    },
    { immediate: true },
  )
  onBeforeUnmount(() => {
    if (typeof document !== 'undefined') document.removeEventListener('pointerdown', onPointerDown)
  })
}
