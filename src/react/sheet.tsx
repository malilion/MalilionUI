import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import {
  bindSheetGesture,
  inertSiblings,
  resolveSnapPoints,
  sheetPosition,
  snapKey,
  snapPointCss,
  type SheetSnapPoint,
} from '../components/sheet'
import type { MlActionSheetAction, MlActionSheetOptions } from '../types'
import { Icon, Paw } from './basic'
import { useLocale } from './locale'
import { lockScroll, unlockScroll, useTransition } from './overlay'
import { cx, useControllable } from './utils'

export { parseSnapPoint, resolveSnapPoints, rubberBand, sheetPosition, releaseSnap, nearestSnap } from '../components/sheet'
export type { SheetSnapPoint, SheetPosition, SheetReleaseOptions } from '../components/sheet'

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), ' +
  'textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
const cleanId = (id: string) => id.replace(/[^\w-]/g, '')
const noop = () => () => {}
/** True on the client, false while server rendering or hydrating. */
const useClient = () => useSyncExternalStore(noop, () => true, () => false)

function trapFocus(event: KeyboardEvent, container: HTMLElement) {
  if (event.key !== 'Tab') return
  const items = [...container.querySelectorAll<HTMLElement>(FOCUSABLE)]
  if (!items.length) return event.preventDefault()
  const first = items[0]
  const last = items[items.length - 1]
  if (event.shiftKey && (document.activeElement === first || document.activeElement === container)) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

/* ── BottomSheet ───────────────────────────────────────── */

export interface BottomSheetHandle {
  /** Move to a snap index. */
  snapTo: (index: number) => void
  close: () => void
}

type SheetApi = { close: () => void; snapTo: (index: number) => void }

export interface BottomSheetProps {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  onClose?: () => void
  /** Index into `snapPoints`. */
  snap?: number
  defaultSnap?: number
  onSnapChange?: (index: number) => void
  /**
   * Heights the sheet rests at, low → high: px numbers, "320px" or "60%" of the
   * screen. Without them the sheet fits its content.
   */
  snapPoints?: SheetSnapPoint[]
  title?: ReactNode
  description?: ReactNode
  /** Drag down, Esc and the backdrop close it. False: it can only be closed from code. */
  dismissible?: boolean
  /** Backdrop, focus trap, page scroll lock. False: a peek sheet the page stays usable behind. */
  modal?: boolean
  /** Show the grab handle. */
  handle?: boolean
  /** Render in place (absolutely inside the nearest positioned parent) instead of portalling to <body>. */
  inline?: boolean
  /** Accessible name when there is no title. */
  label?: string
  /** Replaces the title + description in the header. */
  header?: ReactNode | ((api: SheetApi) => ReactNode)
  footer?: ReactNode | ((api: SheetApi) => ReactNode)
  children?: ReactNode | ((api: SheetApi) => ReactNode)
  className?: string
  onKeyDown?: (event: KeyboardEvent<HTMLDivElement>) => void
}

export const BottomSheet = forwardRef<BottomSheetHandle, BottomSheetProps>(function BottomSheet(
  {
    open: openProp,
    defaultOpen = false,
    onOpenChange,
    onClose,
    snap: snapProp,
    defaultSnap = 0,
    onSnapChange,
    snapPoints,
    title,
    description,
    dismissible = true,
    modal = true,
    handle = true,
    inline,
    label,
    header,
    footer,
    children,
    className,
    onKeyDown,
  },
  ref,
) {
  const loc = useLocale()
  const client = useClient()
  const [open, setOpen] = useControllable(openProp, defaultOpen, onOpenChange)
  const [snap, setSnap] = useControllable(snapProp, defaultSnap, onSnapChange)
  const titleId = `ml-sheet-${cleanId(useId())}`
  const root = useRef<HTMLDivElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const body = useRef<HTMLDivElement>(null)
  const { mounted, className: phase } = useTransition(open, 'ml-sheet', { enter: 480, leave: 280 })

  const [containerHeight, setContainerHeight] = useState(0)
  const [dragRaw, setDragRaw] = useState<number | null>(null)
  const [dragging, setDragging] = useState(false)
  const fitHeight = useRef(0)

  const fit = !snapPoints?.length
  const count = fit ? 1 : snapPoints!.length
  const index = Math.max(0, Math.min(count - 1, snap))
  const snapsPx = fit ? [fitHeight.current] : resolveSnapPoints(snapPoints!, containerHeight)
  const position =
    dragRaw === null ? null : sheetPosition(dragRaw, snapsPx, dismissible, containerHeight || window.innerHeight)

  const measure = useCallback(() => {
    if (root.current) setContainerHeight(root.current.clientHeight)
  }, [])

  const close = () => {
    if (!latest.current.open) return
    setOpen(false)
    onClose?.()
  }
  const snapTo = (target: number) => {
    if (fit) return
    setSnap(Math.max(0, Math.min(count - 1, target)))
  }
  useImperativeHandle(ref, () => ({ snapTo, close }))

  // Values the gesture callbacks read; refreshed every render.
  const latest = useRef({ open, index, snapsPx, dismissible, fit, containerHeight, close, snapTo })
  latest.current = { open, index, snapsPx, dismissible, fit, containerHeight, close, snapTo }

  useEffect(() => {
    if (!mounted || !panel.current) return
    return bindSheetGesture(panel.current, {
      snaps: () => latest.current.snapsPx,
      index: () => latest.current.index,
      restHeight: () => {
        const h = root.current?.clientHeight ?? 0
        if (latest.current.fit) {
          fitHeight.current = panel.current?.offsetHeight ?? 0
          latest.current.snapsPx = [fitHeight.current]
        } else if (h !== latest.current.containerHeight) {
          setContainerHeight(h)
          latest.current.snapsPx = resolveSnapPoints(snapPoints!, h)
        }
        return latest.current.snapsPx[latest.current.index] ?? 0
      },
      body: () => body.current,
      enabled: () => latest.current.open,
      dismissible: () => latest.current.dismissible,
      dragging: setDragging,
      move: setDragRaw,
      release: (target) => {
        if (target === -1) return latest.current.close() // the leave animation starts from the drag position
        setDragRaw(null)
        latest.current.snapTo(target)
      },
    })
  }, [mounted])

  // Reset the drag position once the sheet is gone (or reopens).
  useEffect(() => {
    if (!mounted || open) setDragRaw(null)
  }, [mounted, open])

  useEffect(() => {
    if (!open || !mounted) return
    measure()
    const ro = typeof ResizeObserver !== 'undefined' && root.current ? new ResizeObserver(measure) : null
    if (ro && root.current) ro.observe(root.current)
    const returnTo = modal ? (document.activeElement as HTMLElement | null) : null
    const locks = modal && !inline
    let undoInert: (() => void) | null = null
    if (locks) {
      lockScroll()
      if (root.current) undoInert = inertSiblings(root.current)
    }
    if (modal) panel.current?.focus({ preventScroll: true })
    return () => {
      ro?.disconnect()
      undoInert?.()
      if (locks) unlockScroll()
      returnTo?.focus?.()
    }
  }, [open, mounted])

  function onRootKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    onKeyDown?.(event)
    if (event.defaultPrevented) return
    if (event.key === 'Escape') {
      if (!dismissible) return
      event.stopPropagation()
      close()
      return
    }
    if (modal && panel.current) trapFocus(event, panel.current)
  }

  function onHandleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (fit) return
    const next = snapKey(event.key, index, count)
    if (next === null) return
    event.preventDefault()
    snapTo(next)
  }

  if (!mounted) return null

  const api: SheetApi = { close, snapTo }
  const panelStyle: Record<string, string> = {}
  if (!fit) {
    panelStyle['--_h'] = position
      ? `${position.height}px`
      : containerHeight
        ? `${snapsPx[index]}px`
        : snapPointCss(snapPoints![index])
  }
  if (position && position.offset) panelStyle['--_y'] = `${position.offset}px`
  const headerNode = typeof header === 'function' ? header(api) : header
  const footerNode = typeof footer === 'function' ? footer(api) : footer
  const labelledBy = title ? titleId : undefined

  const node = (
    <div
      ref={root}
      className={cx(
        'ml-sheet',
        modal ? 'ml-sheet--modal' : 'ml-sheet--peek',
        { 'ml-sheet--inline': inline, 'ml-sheet--fit': fit, 'ml-sheet--dragging': dragging },
        className,
        phase,
      )}
      style={position ? ({ '--_p': position.progress.toFixed(3) } as CSSProperties) : undefined}
      onKeyDown={onRootKeyDown}
    >
      {modal && <div className="ml-sheet__backdrop" onClick={() => dismissible && close()} />}
      <div
        ref={panel}
        className="ml-sheet__panel"
        role="dialog"
        aria-modal={modal ? 'true' : undefined}
        tabIndex={-1}
        aria-labelledby={labelledBy}
        aria-label={labelledBy ? undefined : label}
        style={panelStyle as CSSProperties}
      >
        <div className="ml-sheet__grip">
          {handle && (
            <div
              className="ml-sheet__handle"
              role={fit ? undefined : 'slider'}
              tabIndex={fit ? undefined : 0}
              aria-hidden={fit ? 'true' : undefined}
              aria-label={fit ? undefined : loc.sheet.handle}
              aria-orientation={fit ? undefined : 'vertical'}
              aria-valuemin={fit ? undefined : 1}
              aria-valuemax={fit ? undefined : count}
              aria-valuenow={fit ? undefined : index + 1}
              aria-valuetext={fit ? undefined : loc.sheet.position(index + 1, count)}
              onKeyDown={onHandleKeyDown}
            >
              <span className="ml-sheet__bar">
                <Paw className="ml-sheet__paw" tone="current" shine={false} />
              </span>
            </div>
          )}
          {(title || description || headerNode) && (
            <header className="ml-sheet__header">
              {headerNode ?? (
                <>
                  {title && (
                    <h2 id={titleId} className="ml-sheet__title">
                      {title}
                    </h2>
                  )}
                  {description && <p className="ml-sheet__desc">{description}</p>}
                </>
              )}
            </header>
          )}
        </div>
        <div ref={body} className="ml-sheet__body">
          {typeof children === 'function' ? children(api) : children}
        </div>
        {footerNode != null && footerNode !== false && <footer className="ml-sheet__footer">{footerNode}</footer>}
      </div>
    </div>
  )
  if (inline) return node
  return client ? createPortal(node, document.body) : null
})

/* ── ActionSheet ───────────────────────────────────────── */

export interface ActionSheetProps {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  actions?: MlActionSheetAction[]
  title?: string
  description?: string
  /** Cancel button text; false hides the button. */
  cancelText?: string | false
  /** Close after an action is picked. */
  closeOnSelect?: boolean
  /** Render in place instead of portalling to <body>. */
  inline?: boolean
  /** Accessible name of the menu when there is no title. */
  label?: string
  onSelect?: (action: MlActionSheetAction, index: number) => void
  /** Closed without picking anything (cancel button, Esc, backdrop, drag down). */
  onCancel?: () => void
  onClose?: () => void
}

export function ActionSheet({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  actions = [],
  title,
  description,
  cancelText,
  closeOnSelect = true,
  inline,
  label,
  onSelect,
  onCancel,
  onClose,
}: ActionSheetProps) {
  const loc = useLocale()
  const [open, setOpen] = useControllable(openProp, defaultOpen, onOpenChange)
  const list = useRef<HTMLUListElement>(null)
  const firstEnabled = Math.max(0, actions.findIndex((a) => !a.disabled))
  const [active, setActive] = useState(firstEnabled)
  const picked = useRef(false)

  useEffect(() => {
    if (!open) return
    picked.current = false
    setActive(firstEnabled)
  }, [open])

  const onSheetOpen = (value: boolean) => {
    if (!value && open && !picked.current) onCancel?.()
    setOpen(value)
  }
  const choose = (action: MlActionSheetAction, index: number) => {
    if (action.disabled) return
    onSelect?.(action, index)
    if (closeOnSelect) {
      picked.current = true
      setOpen(false)
      onClose?.()
    }
  }
  const cancel = () => {
    onSheetOpen(false)
    onClose?.()
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
    const buttons = [...(list.current?.querySelectorAll<HTMLButtonElement>('.ml-action-sheet__item') ?? [])]
    const enabled = buttons.map((b, i) => (b.disabled ? -1 : i)).filter((i) => i !== -1)
    if (!enabled.length) return
    event.preventDefault()
    const pos = enabled.indexOf(buttons.indexOf(document.activeElement as HTMLButtonElement))
    let next: number
    if (event.key === 'Home') next = enabled[0]
    else if (event.key === 'End') next = enabled[enabled.length - 1]
    else if (pos === -1) next = event.key === 'ArrowDown' ? enabled[0] : enabled[enabled.length - 1]
    else next = enabled[(pos + (event.key === 'ArrowDown' ? 1 : -1) + enabled.length) % enabled.length]
    setActive(next)
    buttons[next]?.focus()
  }

  return (
    <BottomSheet
      open={open}
      onOpenChange={onSheetOpen}
      onClose={onClose}
      className="ml-action-sheet"
      title={title}
      description={description}
      inline={inline}
      label={label ?? loc.sheet.actions}
      onKeyDown={onKeyDown}
      footer={
        cancelText !== false && (
          <button type="button" className="ml-action-sheet__cancel" onClick={cancel}>
            {cancelText ?? loc.common.cancel}
          </button>
        )
      }
    >
      <ul ref={list} className="ml-action-sheet__list" role="menu" aria-label={title || label || loc.sheet.actions}>
        {actions.map((action, i) => (
          <li key={i} role="none">
            <button
              type="button"
              role="menuitem"
              className={cx('ml-action-sheet__item', `ml-action-sheet__item--${action.tone ?? 'default'}`)}
              disabled={action.disabled}
              tabIndex={i === active ? 0 : -1}
              onClick={() => choose(action, i)}
            >
              {action.icon && <Icon name={action.icon} className="ml-action-sheet__icon" />}
              <span className="ml-action-sheet__text">
                <span className="ml-action-sheet__label">{action.label}</span>
                {action.description && <span className="ml-action-sheet__desc">{action.description}</span>}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </BottomSheet>
  )
}

/* ── actionSheet() + ActionSheetHost ───────────────────── */

interface ActionSheetRequest extends MlActionSheetOptions {
  id: number
  resolve: (value: string | number | null) => void
}

// One queue for the whole app; <ActionSheetHost> shows the first request. If the
// app never rendered a host, the first call mounts one on <body> by itself.
let queue: ActionSheetRequest[] = []
let hosts = 0
let seed = 0
let autoHost: Promise<unknown> | null = null
const listeners = new Set<() => void>()
const emitQueue = () => listeners.forEach((l) => l())
const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

async function ensureHost() {
  if (hosts > 0 || typeof document === 'undefined') return
  autoHost ??= import('react-dom/client').then(({ createRoot }) => {
    if (hosts > 0) return
    const el = document.createElement('div')
    el.setAttribute('data-ml-action-sheet-host', '')
    document.body.appendChild(el)
    createRoot(el).render(<ActionSheetHost />)
  })
  await autoHost
}

/**
 * `await actionSheet({ title: '分享', actions: [{ label: '複製連結', value: 'copy' }] })`
 * → the picked action's value (its label when it has none), or null when cancelled.
 */
export function actionSheet(options: MlActionSheetOptions): Promise<string | number | null> {
  return new Promise((resolve) => {
    queue = [...queue, { ...options, id: ++seed, resolve }]
    emitQueue()
    // Give a just-rendered <ActionSheetHost> the chance to register first.
    setTimeout(ensureHost)
  })
}

export function useActionSheet() {
  return actionSheet
}

function settle(id: number, value: string | number | null) {
  const request = queue.find((r) => r.id === id)
  if (!request) return
  queue = queue.filter((r) => r !== request)
  emitQueue()
  request.resolve(value)
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** Renders the sheets requested through `actionSheet()`; render it once near the root (optional). */
export function ActionSheetHost() {
  const current = useSyncExternalStore(subscribe, () => queue[0], () => undefined)
  const [open, setOpen] = useState(false)
  /** The request on screen, kept while the sheet animates out. */
  const [shown, setShown] = useState<ActionSheetRequest>()
  const openRef = useRef(false)

  useEffect(() => {
    hosts++
    return () => void hosts--
  }, [])

  useEffect(() => {
    if (!current) return
    let cancelled = false
    ;(async () => {
      if (openRef.current) {
        // Let the previous sheet finish leaving before the next one comes up.
        openRef.current = false
        setOpen(false)
        await wait(300)
        if (cancelled) return
      }
      setShown(current)
      openRef.current = true
      setOpen(true)
    })()
    return () => {
      cancelled = true
    }
  }, [current])

  const answer = (value: string | number | null) => {
    if (!shown || !openRef.current) return
    openRef.current = false
    setOpen(false)
    settle(shown.id, value)
  }

  return (
    <ActionSheet
      open={open}
      actions={shown?.actions}
      title={shown?.title}
      description={shown?.description}
      cancelText={shown?.cancelText}
      onSelect={(action) => answer(action.value ?? action.label)}
      onCancel={() => answer(null)}
    />
  )
}
