import { useEffect, useId, useRef, useState, useSyncExternalStore, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import type { MlToastOptions, MlToastPlacement, MlToastTone } from '../types'
import { Icon, Paw } from './basic'
import { useLocale } from './locale'
import { cx } from './utils'

/**
 * Vue-style enter/leave classes (`<name>-enter-from` → `<name>-enter-to`, …)
 * so the shared stylesheet's transitions run in React too.
 */
export function useTransition(show: boolean, name: string, duration: { enter: number; leave: number }) {
  const [mounted, setMounted] = useState(show)
  const [phase, setPhase] = useState<string>('')
  useEffect(() => {
    let raf = 0
    let timer: ReturnType<typeof setTimeout>
    if (show) {
      setMounted(true)
      setPhase(`${name}-enter-from ${name}-enter-active`)
      raf = requestAnimationFrame(() => {
        raf = requestAnimationFrame(() => setPhase(`${name}-enter-active ${name}-enter-to`))
      })
      timer = setTimeout(() => setPhase(''), duration.enter)
    } else if (mounted) {
      setPhase(`${name}-leave-from ${name}-leave-active`)
      raf = requestAnimationFrame(() => setPhase(`${name}-leave-active ${name}-leave-to`))
      timer = setTimeout(() => {
        setMounted(false)
        setPhase('')
      }, duration.leave)
    }
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(timer)
    }
    // Only the open state drives the sequence.
  }, [show])
  return { mounted, className: phase }
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), ' +
  'textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/* ── Scroll lock shared by every open modal, drawer and palette ── */
let lockCount = 0
let previousOverflow = ''
export function lockScroll() {
  if (lockCount++ === 0) {
    previousOverflow = document.documentElement.style.overflow
    document.documentElement.style.overflow = 'hidden'
  }
}
export function unlockScroll() {
  if (--lockCount === 0) document.documentElement.style.overflow = previousOverflow
}

/* ── Modal ─────────────────────────────────────────────── */

export interface ModalProps {
  open: boolean
  onClose: () => void
  title?: ReactNode
  eyebrow?: ReactNode
  /** Panel max width: px number or CSS length. */
  width?: number | string
  closeOnBackdrop?: boolean
  closeOnEsc?: boolean
  hideClose?: boolean
  /** Render in place instead of portalling to <body>. */
  inline?: boolean
  footer?: ReactNode
  children?: ReactNode
}

export function Modal({ open, onClose, title, eyebrow, width, closeOnBackdrop = true, closeOnEsc = true, hideClose, inline, footer, children }: ModalProps) {
  const loc = useLocale()
  const titleId = `ml-modal-${useId().replace(/[^\w-]/g, '')}`
  const panel = useRef<HTMLDivElement>(null)
  const { mounted, className } = useTransition(open, 'ml-modal', { enter: 480, leave: 220 })

  useEffect(() => {
    if (!open) return
    const returnTo = document.activeElement as HTMLElement | null
    lockScroll()
    // Focus the dialog itself, so a destructive action is never one stray Enter away.
    requestAnimationFrame(() => panel.current?.focus())
    return () => {
      unlockScroll()
      returnTo?.focus?.()
    }
  }, [open])

  function onKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && closeOnEsc) {
      event.stopPropagation()
      onClose()
      return
    }
    if (event.key !== 'Tab' || !panel.current) return
    const items = [...panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)]
    if (!items.length) return event.preventDefault()
    const first = items[0]
    const last = items[items.length - 1]
    if (event.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  if (!mounted) return null
  const node = (
    <div className={cx('ml-modal', className)} onKeyDown={onKeydown}>
      <div className="ml-modal__backdrop" onClick={() => closeOnBackdrop && onClose()} />
      <div
        ref={panel}
        className="ml-modal__panel"
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        aria-labelledby={title ? titleId : undefined}
        style={width ? ({ '--_width': typeof width === 'number' ? `${width}px` : width } as CSSProperties) : undefined}
      >
        {(title || eyebrow || !hideClose) && (
          <header className="ml-modal__header">
            <div className="ml-modal__heading">
              {eyebrow && <p className="ml-modal__eyebrow">{eyebrow}</p>}
              {title && (
                <h2 id={titleId} className="ml-modal__title">
                  {title}
                </h2>
              )}
            </div>
            {!hideClose && (
              <button type="button" className="ml-modal__close" aria-label={loc.common.close} onClick={onClose}>
                <Icon name="close" />
              </button>
            )}
          </header>
        )}
        <div className="ml-modal__body">{children}</div>
        {footer && <footer className="ml-modal__footer">{footer}</footer>}
      </div>
    </div>
  )
  return inline || typeof document === 'undefined' ? node : createPortal(node, document.body)
}

/* ── Toast ─────────────────────────────────────────────── */

export interface ToastItem extends MlToastOptions {
  id: number
  tone: MlToastTone
  duration: number
  closable: boolean
}

type ToastInput = string | MlToastOptions
let items: ToastItem[] = []
let seed = 0
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

function show(input: ToastInput, tone?: MlToastTone): number {
  const options = typeof input === 'string' ? { message: input } : input
  const item: ToastItem = {
    ...options,
    id: ++seed,
    tone: tone ?? options.tone ?? 'paw',
    duration: options.duration ?? 4000,
    closable: options.closable ?? true,
  }
  items = [...items, item]
  emit()
  return item.id
}

function dismiss(id: number) {
  items = items.filter((t) => t.id !== id)
  emit()
}

/** `toast('Saved')`, `toast.success({ title, message })`, `toast.dismiss(id)` — render a <ToastHost /> once. */
export const toast = Object.assign((input: ToastInput) => show(input), {
  show: (input: ToastInput) => show(input),
  paw: (input: ToastInput) => show(input, 'paw'),
  info: (input: ToastInput) => show(input, 'info'),
  success: (input: ToastInput) => show(input, 'success'),
  warning: (input: ToastInput) => show(input, 'warning'),
  danger: (input: ToastInput) => show(input, 'danger'),
  dismiss,
  clear: () => {
    items = []
    emit()
  },
})

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

function ToastCard({ item, onClose }: { item: ToastItem; onClose: () => void }) {
  const loc = useLocale()
  const [paused, setPaused] = useState(false)
  const [entered, setEntered] = useState(false)
  const remaining = useRef(item.duration)
  const startedAt = useRef(0)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  const start = () => {
    if (item.duration <= 0) return
    startedAt.current = Date.now()
    timer.current = setTimeout(onClose, remaining.current)
  }
  useEffect(() => {
    start()
    const raf = requestAnimationFrame(() => setEntered(true))
    return () => {
      clearTimeout(timer.current)
      cancelAnimationFrame(raf)
    }
  }, [])
  const pause = () => {
    if (item.duration <= 0 || paused) return
    setPaused(true)
    clearTimeout(timer.current)
    remaining.current -= Date.now() - startedAt.current
  }
  const resume = () => {
    if (!paused) return
    setPaused(false)
    start()
  }

  return (
    <li
      className={cx('ml-toast', `ml-toast--${item.tone}`, entered ? 'ml-toast-enter-active' : 'ml-toast-enter-from ml-toast-enter-active', { 'ml-toast--paused': paused })}
      role={item.tone === 'danger' ? 'alert' : undefined}
      onMouseEnter={pause}
      onMouseLeave={resume}
      onFocus={pause}
      onBlur={resume}
    >
      <Paw className="ml-toast__watermark" tone="current" />
      <span className="ml-toast__icon">{item.tone === 'paw' ? <Paw tone="gold" /> : <Icon name={item.tone} />}</span>
      <div className="ml-toast__content">
        {item.title && <p className="ml-toast__title">{item.title}</p>}
        {item.message && <p className="ml-toast__message">{item.message}</p>}
      </div>
      {item.action && (
        <button
          type="button"
          className="ml-toast__action"
          onClick={() => {
            item.action?.onClick()
            onClose()
          }}
        >
          {item.action.label}
        </button>
      )}
      {item.closable && (
        <button type="button" className="ml-toast__close" aria-label={loc.toast.close} onClick={onClose}>
          <Icon name="close" />
        </button>
      )}
      {item.duration > 0 && <span className="ml-toast__timer" aria-hidden="true" style={{ animationDuration: `${item.duration}ms` }} />}
    </li>
  )
}

export interface ToastHostProps {
  placement?: MlToastPlacement
  /** Older toasts beyond this wait until newer ones leave. */
  max?: number
}

export function ToastHost({ placement = 'bottom-right', max = 5 }: ToastHostProps) {
  const loc = useLocale()
  const list = useSyncExternalStore(subscribe, () => items, () => items)
  const [ready, setReady] = useState(false)
  useEffect(() => setReady(true), [])
  if (!ready) return null // portal target only exists in the browser
  return createPortal(
    <section className={cx('ml-toast-host', `ml-toast-host--${placement}`)} aria-label={loc.toast.region}>
      <ol className="ml-toast-host__list" aria-live="polite" aria-relevant="additions">
        {list.slice(-max).map((item) => (
          <ToastCard key={item.id} item={item} onClose={() => dismiss(item.id)} />
        ))}
      </ol>
    </section>,
    document.body,
  )
}
