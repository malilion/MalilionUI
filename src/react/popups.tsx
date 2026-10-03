import {
  Fragment,
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type FocusEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import type { MlButtonVariant, MlCommandItem, MlConfirmOptions, MlDropdownItem, MlPlacement, MlSize } from '../types'
import { Button, Icon, Kbd, Paw } from './basic'
import { useLocale } from './locale'
import { Modal, lockScroll, unlockScroll, useTransition } from './overlay'
import { cx, len, useControllable } from './utils'

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), ' +
  'textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

const cleanId = (id: string) => id.replace(/[^\w-]/g, '')
const noop = () => () => {}
/** True on the client (also during the first client render), false while server rendering or hydrating. */
const useClient = () => useSyncExternalStore(noop, () => true, () => false)

/** Remember the focused element and lock the page while `open`; restore both on close. */
function useModalFocus(open: boolean) {
  useEffect(() => {
    if (!open) return
    const returnTo = document.activeElement as HTMLElement | null
    lockScroll()
    return () => {
      unlockScroll()
      returnTo?.focus?.()
    }
  }, [open])
}

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

/** Calls `handler` on a pointerdown outside `root` while `active`. */
function useOutsidePointer(root: React.RefObject<HTMLElement | null>, active: boolean, handler: () => void) {
  const latest = useRef(handler)
  latest.current = handler
  useEffect(() => {
    if (!active) return
    const onDown = (event: Event) => {
      if (root.current && !root.current.contains(event.target as Node)) latest.current()
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [active])
}

/* ── Drawer ────────────────────────────────────────────── */

export interface DrawerProps {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  onClose?: () => void
  title?: ReactNode
  eyebrow?: ReactNode
  /** Edge the drawer slides out of. */
  placement?: 'right' | 'left' | 'top' | 'bottom'
  /** Width (left/right) or height (top/bottom), e.g. 420 or "40vw". */
  size?: number | string
  closeOnBackdrop?: boolean
  closeOnEsc?: boolean
  hideClose?: boolean
  /** Render in place instead of portalling to <body>. */
  inline?: boolean
  footer?: ReactNode | ((api: { close: () => void }) => ReactNode)
  children?: ReactNode | ((api: { close: () => void }) => ReactNode)
}

export function Drawer({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  onClose,
  title,
  eyebrow,
  placement = 'right',
  size,
  closeOnBackdrop = true,
  closeOnEsc = true,
  hideClose,
  inline,
  footer,
  children,
}: DrawerProps) {
  const loc = useLocale()
  const client = useClient()
  const [open, setOpen] = useControllable(openProp, defaultOpen, onOpenChange)
  const titleId = `ml-drawer-${cleanId(useId())}`
  const panel = useRef<HTMLDivElement>(null)
  const { mounted, className } = useTransition(open, 'ml-drawer', { enter: 480, leave: 220 })
  useModalFocus(open)
  useEffect(() => {
    if (open && mounted) panel.current?.focus()
  }, [open, mounted, client])

  const close = () => {
    setOpen(false)
    onClose?.()
  }
  function onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape' && closeOnEsc) {
      event.stopPropagation()
      close()
      return
    }
    if (panel.current) trapFocus(event, panel.current)
  }

  if (!mounted) return null
  const footerNode = typeof footer === 'function' ? footer({ close }) : footer
  const node = (
    <div className={cx('ml-drawer', `ml-drawer--${placement}`, className)} onKeyDown={onKeyDown}>
      <div className="ml-drawer__backdrop" onClick={() => closeOnBackdrop && close()} />
      <div
        ref={panel}
        className="ml-drawer__panel"
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        aria-labelledby={title ? titleId : undefined}
        style={size ? ({ '--_size': len(size) } as CSSProperties) : undefined}
      >
        {(title || eyebrow || !hideClose) && (
          <header className="ml-drawer__header">
            <div className="ml-drawer__heading">
              {eyebrow && <p className="ml-drawer__eyebrow">{eyebrow}</p>}
              {title && (
                <h2 id={titleId} className="ml-drawer__title">
                  {title}
                </h2>
              )}
            </div>
            {!hideClose && (
              <button type="button" className="ml-drawer__close" aria-label={loc.common.close} onClick={close}>
                <Icon name="close" />
              </button>
            )}
          </header>
        )}
        <div className="ml-drawer__body">{typeof children === 'function' ? children({ close }) : children}</div>
        {footerNode != null && footerNode !== false && <footer className="ml-drawer__footer">{footerNode}</footer>}
      </div>
    </div>
  )
  if (inline) return node
  return client ? createPortal(node, document.body) : null
}

/* ── Popover ───────────────────────────────────────────── */

export interface PopoverHandle {
  show: () => void
  hide: (returnFocus?: boolean) => void
  toggle: () => void
}

export interface PopoverProps {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  placement?: MlPlacement
  /** "click" toggles on click; "hover" opens on hover and keyboard focus. */
  trigger?: 'click' | 'hover'
  title?: ReactNode
  /** Panel width, e.g. 280 or "18rem". Defaults to fit the content (max 320px). */
  width?: number | string
  disabled?: boolean
  /** Hover delay in ms. */
  delay?: number
  /** id of an element inside the content that describes the dialog. */
  describedBy?: string
  className?: string
  content?: ReactNode | ((api: { close: () => void }) => ReactNode)
  /** The trigger: one element, which gets aria-expanded / aria-controls. */
  children?: ReactNode | ((api: { open: boolean; toggle: () => void }) => ReactNode)
}

export const Popover = forwardRef<PopoverHandle, PopoverProps>(function Popover(
  { open: openProp, defaultOpen = false, onOpenChange, placement = 'bottom', trigger = 'click', title, width, disabled, delay = 120, describedBy, className, content, children },
  ref,
) {
  const [open, setOpen] = useControllable(openProp, defaultOpen, onOpenChange)
  const panelId = `ml-popover-${cleanId(useId())}`
  const titleId = `${panelId}-title`
  const root = useRef<HTMLSpanElement>(null)
  const triggerWrap = useRef<HTMLSpanElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const openRef = useRef(open)
  openRef.current = open
  const { mounted, className: phase } = useTransition(open, 'ml-popover', { enter: 480, leave: 120 })

  const triggerEl = () => triggerWrap.current?.firstElementChild as HTMLElement | null | undefined
  const show = () => {
    if (!disabled) setOpen(true)
  }
  const hide = (returnFocus = false) => {
    if (!openRef.current) return
    setOpen(false)
    if (returnFocus) triggerEl()?.focus()
  }
  const toggle = () => (openRef.current ? hide() : show())
  useImperativeHandle(ref, () => ({ show, hide, toggle }))

  const onEnter = () => {
    if (trigger !== 'hover') return
    clearTimeout(timer.current)
    timer.current = setTimeout(show, delay)
  }
  const onLeave = () => {
    if (trigger !== 'hover') return
    clearTimeout(timer.current)
    timer.current = setTimeout(() => hide(), delay)
  }
  const onFocus = () => {
    if (trigger !== 'hover') return
    clearTimeout(timer.current)
    show()
  }
  const onBlur = (event: FocusEvent) => {
    if (trigger === 'hover' && !root.current?.contains(event.relatedTarget as Node | null)) hide()
  }
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && openRef.current) {
      event.stopPropagation()
      hide(true)
    }
  }

  // The trigger is the caller's element, so wire its ARIA state directly.
  useEffect(() => {
    const el = triggerEl()
    if (!el) return
    el.setAttribute('aria-expanded', String(open))
    el.setAttribute('aria-haspopup', 'dialog')
    if (open) el.setAttribute('aria-controls', panelId)
    else el.removeAttribute('aria-controls')
  }, [open, panelId])
  useOutsidePointer(root, open && trigger === 'click', () => hide())
  useEffect(() => () => clearTimeout(timer.current), [])

  return (
    <span
      ref={root}
      className={cx('ml-popover', className, { 'ml-popover--open': open })}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onFocus={onFocus}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
    >
      <span ref={triggerWrap} className="ml-popover__trigger" onClick={() => trigger === 'click' && toggle()}>
        {typeof children === 'function' ? children({ open, toggle }) : children}
      </span>
      {mounted && (
        <div
          id={panelId}
          role="dialog"
          aria-labelledby={title ? titleId : undefined}
          aria-describedby={describedBy}
          className={cx('ml-popover__panel', `ml-popover__panel--${placement}`, phase)}
          style={width ? { width: len(width) } : undefined}
          tabIndex={-1}
        >
          {title && (
            <p id={titleId} className="ml-popover__title">
              {title}
            </p>
          )}
          <div className="ml-popover__body">{typeof content === 'function' ? content({ close: () => hide(true) }) : content}</div>
        </div>
      )}
    </span>
  )
})

/* ── Popconfirm ────────────────────────────────────────── */

export interface PopconfirmProps {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  title: ReactNode
  description?: ReactNode
  /** "danger" paints the confirm button red (deleting, revoking…). */
  tone?: 'warning' | 'danger' | 'info'
  confirmText?: ReactNode
  cancelText?: ReactNode
  placement?: MlPlacement
  disabled?: boolean
  onConfirm?: () => void
  onCancel?: () => void
  children?: PopoverProps['children']
}

export function Popconfirm({ title, description, tone = 'warning', confirmText, cancelText, placement = 'top', onConfirm, onCancel, ...rest }: PopconfirmProps) {
  const loc = useLocale()
  const descId = `ml-popconfirm-${cleanId(useId())}-desc`
  // Land on "cancel", so a stray Enter never confirms something destructive.
  const focusCancel = useCallback((el: HTMLDivElement | null) => el?.querySelector('button')?.focus(), [])
  return (
    <Popover
      {...rest}
      placement={placement}
      trigger="click"
      describedBy={description ? descId : undefined}
      className={cx('ml-popconfirm', `ml-popconfirm--${tone}`)}
      title={
        <>
          <Icon name={tone} className="ml-popconfirm__icon" />
          <span>{title}</span>
        </>
      }
      content={({ close }) => (
        <>
          {description && (
            <p id={descId} className="ml-popconfirm__desc">
              {description}
            </p>
          )}
          <div ref={focusCancel} className="ml-popconfirm__actions">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                onCancel?.()
                close()
              }}
            >
              {cancelText ?? loc.common.cancel}
            </Button>
            <Button
              size="sm"
              variant={tone === 'danger' ? 'danger' : 'primary'}
              onClick={() => {
                onConfirm?.()
                close()
              }}
            >
              {confirmText ?? loc.common.confirm}
            </Button>
          </div>
        </>
      )}
    />
  )
}

/* ── Dropdown ──────────────────────────────────────────── */

export interface DropdownTriggerAttrs {
  'aria-haspopup': 'menu'
  'aria-expanded': boolean
  'aria-controls': string | undefined
  onClick: () => void
  onKeyDown: (event: KeyboardEvent) => void
}

export interface DropdownProps {
  items: MlDropdownItem[]
  /** Text for the built-in trigger button. Ignored with a `trigger`. */
  label?: string
  placement?: 'bottom-start' | 'bottom-end'
  variant?: MlButtonVariant
  size?: MlSize
  disabled?: boolean
  /** Single-choice menu: `value` holds the chosen item, marked with a paw. */
  selectable?: boolean
  value?: string | number
  defaultValue?: string | number
  onChange?: (value: string | number | undefined) => void
  onSelect?: (item: MlDropdownItem) => void
  /** Custom trigger: spread `attrs` onto your button. */
  trigger?: (api: { attrs: DropdownTriggerAttrs; open: boolean; toggle: () => void }) => ReactNode
}

export function Dropdown({ items, label, placement = 'bottom-start', variant = 'outline', size = 'md', disabled, selectable, value, defaultValue, onChange, onSelect, trigger }: DropdownProps) {
  const [model, setModel] = useControllable<string | number | undefined>(value, defaultValue, onChange)
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const itemEls = useRef<(HTMLLIElement | null)[]>([])
  const pending = useRef<'first' | 'last' | 'selected' | null>(null)
  const menuId = `ml-dropdown-${cleanId(useId())}`
  const { mounted, className: phase } = useTransition(open, 'ml-dropdown', { enter: 480, leave: 120 })
  const enabled = items.flatMap((item, index) => (item.disabled ? [] : [index]))

  const focusItem = (index: number | undefined) => index !== undefined && itemEls.current[index]?.focus()
  const triggerEl = () => root.current?.querySelector<HTMLElement>('[aria-haspopup="menu"]') ?? null

  const show = (focus: 'first' | 'last' | 'selected' = 'selected') => {
    if (disabled || open) return
    pending.current = focus
    setOpen(true)
  }
  const hide = (returnFocus = true) => {
    if (!open) return
    setOpen(false)
    if (returnFocus) triggerEl()?.focus()
  }
  const toggle = () => (open ? hide() : show())

  useEffect(() => {
    const focus = pending.current
    if (!open || !mounted || !focus) return
    pending.current = null
    const selected = items.findIndex((item) => item.value === model && !item.disabled)
    if (focus === 'last') focusItem(enabled.at(-1))
    else if (focus === 'selected' && selectable && selected !== -1) focusItem(selected)
    else focusItem(enabled[0])
  }, [open, mounted])
  useOutsidePointer(root, open, () => hide(false))

  const choose = (item: MlDropdownItem) => {
    if (item.disabled) return
    if (selectable) setModel(item.value)
    onSelect?.(item)
    hide()
  }

  const onTriggerKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      show('first')
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      show('last')
    }
  }

  function onMenuKeyDown(event: KeyboardEvent) {
    const current = itemEls.current.findIndex((el) => el === document.activeElement)
    const position = enabled.indexOf(current)
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        focusItem(enabled[(position + 1) % enabled.length])
        break
      case 'ArrowUp':
        event.preventDefault()
        focusItem(enabled[(position - 1 + enabled.length) % enabled.length])
        break
      case 'Home':
        event.preventDefault()
        focusItem(enabled[0])
        break
      case 'End':
        event.preventDefault()
        focusItem(enabled.at(-1))
        break
      case 'Enter':
      case ' ':
        event.preventDefault()
        if (current !== -1) choose(items[current])
        break
      case 'Escape':
        event.preventDefault()
        hide()
        break
      case 'Tab':
        hide(false)
        break
      default:
        // Typeahead: jump to the next item starting with that character.
        if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
          const char = event.key.toLowerCase()
          const order = [...enabled.slice(position + 1), ...enabled.slice(0, position + 1)]
          focusItem(order.find((index) => items[index].label.toLowerCase().startsWith(char)))
        }
    }
  }

  const attrs: DropdownTriggerAttrs = {
    'aria-haspopup': 'menu',
    'aria-expanded': open,
    'aria-controls': open ? menuId : undefined,
    onClick: toggle,
    onKeyDown: onTriggerKeyDown,
  }
  const selectedLabel = selectable ? items.find((item) => item.value === model)?.label : undefined

  return (
    <div ref={root} className={cx('ml-dropdown', { 'ml-dropdown--open': open })}>
      {trigger ? (
        trigger({ attrs, open, toggle })
      ) : (
        <Button {...attrs} variant={variant} size={size} disabled={disabled} suffix={<Icon name="chevronDown" className="ml-dropdown__chevron" />}>
          {selectedLabel ?? label ?? ''}
        </Button>
      )}
      {mounted && (
        <ul id={menuId} role="menu" className={cx('ml-dropdown__menu', `ml-dropdown__menu--${placement}`, phase)} aria-label={label} onKeyDown={onMenuKeyDown}>
          {items.map((item, index) => {
            const checked = selectable && item.value === model
            return [
              item.divider && <li key={`${item.value}-divider`} role="separator" className="ml-dropdown__divider" />,
              <li
                key={item.value}
                ref={(el) => {
                  itemEls.current[index] = el
                }}
                role={selectable ? 'menuitemradio' : 'menuitem'}
                aria-checked={selectable ? item.value === model : undefined}
                aria-disabled={item.disabled || undefined}
                tabIndex={-1}
                className={cx('ml-dropdown__item', { 'ml-dropdown__item--danger': item.danger, 'ml-dropdown__item--checked': checked })}
                onClick={() => choose(item)}
                onMouseMove={(e) => !item.disabled && e.currentTarget.focus()}
              >
                {item.icon && <Icon name={item.icon} className="ml-dropdown__icon" />}
                <span className="ml-dropdown__label">{item.label}</span>
                {item.hint && <span className="ml-dropdown__hint">{item.hint}</span>}
                {checked && <Paw tone="current" className="ml-dropdown__paw" />}
              </li>,
            ]
          })}
        </ul>
      )}
    </div>
  )
}

/* ── confirm() + DialogHost ────────────────────────────── */

export interface DialogRequest extends MlConfirmOptions {
  id: number
  kind: 'confirm' | 'alert' | 'prompt'
  resolve: (value: unknown) => void
}

type DialogInput = string | MlConfirmOptions

// One queue for the whole app; <DialogHost> shows the first request. If the app
// never rendered a host, the first call mounts one on <body> by itself.
let queue: DialogRequest[] = []
let hosts = 0
let dialogSeed = 0
let autoHost: Promise<unknown> | null = null
const dialogListeners = new Set<() => void>()
const emitDialogs = () => dialogListeners.forEach((l) => l())
const subscribeDialogs = (l: () => void) => {
  dialogListeners.add(l)
  return () => dialogListeners.delete(l)
}

async function ensureHost() {
  if (hosts > 0 || typeof document === 'undefined') return
  autoHost ??= import('react-dom/client').then(({ createRoot }) => {
    if (hosts > 0) return
    const el = document.createElement('div')
    el.setAttribute('data-ml-dialog-host', '')
    document.body.appendChild(el)
    createRoot(el).render(<DialogHost />)
  })
  await autoHost
}

function openDialog<T>(kind: DialogRequest['kind'], input: DialogInput): Promise<T> {
  const options = typeof input === 'string' ? { message: input } : input
  return new Promise<T>((resolve) => {
    queue = [...queue, { ...options, id: ++dialogSeed, kind, resolve: resolve as (value: unknown) => void }]
    emitDialogs()
    // Give a just-rendered <DialogHost> the chance to register first.
    setTimeout(ensureHost)
  })
}

function settleDialog(id: number, value: unknown) {
  const request = queue.find((r) => r.id === id)
  if (!request) return
  queue = queue.filter((r) => r !== request)
  emitDialogs()
  request.resolve(value)
}

/**
 * `await confirm('刪除這個獅群？')` → true / false.
 * `await confirm.prompt({ title: '重新命名' })` → the text, or null if cancelled.
 * `await confirm.alert('已儲存')` → resolves once dismissed.
 */
export const confirm = Object.assign((input: DialogInput) => openDialog<boolean>('confirm', input), {
  danger: (input: DialogInput) => openDialog<boolean>('confirm', { ...(typeof input === 'string' ? { message: input } : input), danger: true }),
  alert: (input: DialogInput) => openDialog<void>('alert', input),
  prompt: (input: DialogInput) => {
    const options = typeof input === 'string' ? { title: input } : input
    return openDialog<string | null>('prompt', { ...options, prompt: options.prompt ?? {} })
  },
})

export function useConfirm() {
  return confirm
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** Renders the dialogs requested through `confirm()`; render it once near the root. */
export function DialogHost() {
  const loc = useLocale()
  const current = useSyncExternalStore(subscribeDialogs, () => queue[0], () => undefined)
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  /** The request currently on screen, kept while the modal animates out. */
  const [shown, setShown] = useState<DialogRequest>()
  const input = useRef<HTMLInputElement>(null)
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
        // Let the previous dialog finish leaving before the next one enters.
        openRef.current = false
        setOpen(false)
        await wait(240)
        if (cancelled) return
      }
      setShown(current)
      setText(current.prompt?.defaultValue ?? '')
      openRef.current = true
      setOpen(true)
    })()
    return () => {
      cancelled = true
    }
  }, [current])

  useEffect(() => {
    if (!open || shown?.kind !== 'prompt') return
    // After Modal has moved focus onto its panel.
    const t = setTimeout(() => {
      input.current?.focus()
      input.current?.select()
    }, 30)
    return () => clearTimeout(t)
  }, [open, shown])

  const answer = (value: unknown) => {
    if (!shown) return
    openRef.current = false
    setOpen(false)
    settleDialog(shown.id, value)
  }
  const cancelValue = () => (shown?.kind === 'prompt' ? null : shown?.kind === 'alert' ? undefined : false)
  const confirmValue = () => (shown?.kind === 'prompt' ? text : shown?.kind === 'alert' ? undefined : true)

  const eyebrow = shown?.eyebrow ?? (shown?.danger ? 'Danger Zone' : undefined)
  const icon = shown?.danger ? 'warning' : shown?.kind === 'alert' ? 'info' : null

  return (
    <Modal
      open={open}
      eyebrow={eyebrow}
      title={shown?.title}
      width={shown?.width ?? 440}
      // Closing with ×, Esc or the backdrop counts as "cancel".
      onClose={() => openRef.current && answer(cancelValue())}
      footer={
        <>
          {shown?.kind !== 'alert' && (
            <Button variant="ghost" onClick={() => answer(cancelValue())}>
              {shown?.cancelText ?? loc.common.cancel}
            </Button>
          )}
          <Button variant={shown?.danger ? 'danger' : 'primary'} stamp onClick={() => answer(confirmValue())}>
            {shown?.confirmText ?? (shown?.kind === 'alert' ? loc.dialog.ok : loc.common.confirm)}
          </Button>
        </>
      }
    >
      <div className={cx('ml-dialog__body', { 'ml-dialog__body--danger': shown?.danger })}>
        {icon && <Icon name={icon} className="ml-dialog__icon" />}
        <div className="ml-dialog__content">
          {shown?.message && <p className="ml-dialog__message">{shown.message}</p>}
          {shown?.kind === 'prompt' && (
            <form
              className="ml-dialog__form"
              onSubmit={(e) => {
                e.preventDefault()
                answer(confirmValue())
              }}
            >
              {shown.prompt?.label && (
                <label className="ml-field__label" htmlFor="ml-dialog-input">
                  {shown.prompt.label}
                </label>
              )}
              <div className="ml-input">
                <input
                  id="ml-dialog-input"
                  ref={input}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  className="ml-input__control"
                  type="text"
                  autoComplete="off"
                  placeholder={shown.prompt?.placeholder}
                />
              </div>
            </form>
          )}
        </div>
      </div>
    </Modal>
  )
}

/* ── CommandPalette ────────────────────────────────────── */

/**
 * Subsequence match: every typed character must appear in order. Returns the
 * matched positions (for highlighting) and a score that prefers consecutive
 * runs and word starts — or null when it doesn't match.
 */
function fuzzy(text: string, q: string): { score: number; hits: number[] } | null {
  const lower = text.toLowerCase()
  const hits: number[] = []
  let score = 0
  let from = 0
  for (const ch of q.toLowerCase()) {
    if (ch === ' ') continue
    const at = lower.indexOf(ch, from)
    if (at === -1) return null
    score += at === hits[hits.length - 1] + 1 ? 5 : 1
    if (at === 0 || /[\s\-_/.]/.test(lower[at - 1])) score += 3
    hits.push(at)
    from = at + 1
  }
  return { score: score - lower.length * 0.01, hits }
}

type CommandResult = { item: MlCommandItem; hits: number[]; score: number }

function search(items: MlCommandItem[], query: string, limit: number): CommandResult[] {
  const q = query.trim()
  const scored = items.flatMap((item) => {
    if (!q) return [{ item, hits: [] as number[], score: 0 }]
    const best = fuzzy(item.label, q) ?? ((item.keywords ?? []).some((k) => fuzzy(k, q)) ? { score: 0.5, hits: [] } : null)
    return best ? [{ item, hits: best.hits, score: best.score }] : []
  })
  if (q) scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, limit)
}

/** Next enabled index from `from` in direction `delta` (wrapping), or `from` if none. */
function stepFrom(list: CommandResult[], from: number, delta: 1 | -1) {
  for (let i = 1; i <= list.length; i++) {
    const next = (from + delta * i + list.length) % list.length
    if (!list[next].item.disabled) return next
  }
  return from
}

function parts(label: string, hits: number[]) {
  const set = new Set(hits)
  const out: { text: string; hit: boolean }[] = []
  for (let i = 0; i < label.length; i++) {
    const hit = set.has(i)
    const last = out[out.length - 1]
    if (last && last.hit === hit) last.text += label[i]
    else out.push({ text: label[i], hit })
  }
  return out
}

const isMac = typeof navigator !== 'undefined' && /mac|iphone|ipad/i.test(navigator.platform || navigator.userAgent)

export interface CommandPaletteProps {
  items: MlCommandItem[]
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  onSelect?: (item: MlCommandItem) => void
  placeholder?: string
  /** Global shortcut that toggles the palette; "mod" is ⌘ on Mac, Ctrl elsewhere. null disables it. */
  shortcut?: string | null
  /** Shown when nothing matches. */
  emptyText?: ReactNode
  /** Most results shown at once. */
  limit?: number
  /** Renders in place, e.g. a search button showing the shortcut `keys`. */
  trigger?: (api: { open: () => void; keys: string[] }) => ReactNode
}

export function CommandPalette({ items, open: openProp, defaultOpen = false, onOpenChange, onSelect, placeholder, shortcut = 'mod+k', emptyText, limit = 50, trigger }: CommandPaletteProps) {
  const loc = useLocale()
  const client = useClient()
  const [open, setOpen] = useControllable(openProp, defaultOpen, onOpenChange)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const input = useRef<HTMLInputElement>(null)
  const listEl = useRef<HTMLDivElement>(null)
  const uid = `ml-cmd-${cleanId(useId())}`
  const { mounted, className } = useTransition(open, 'ml-cmd', { enter: 420, leave: 200 })
  const openRef = useRef(open)
  openRef.current = open

  const results = useMemo(() => search(items, query, limit), [items, query, limit])
  const sections = useMemo(() => {
    const groups = new Map<string, (CommandResult & { index: number })[]>()
    results.forEach((r, index) => {
      const name = query.trim() ? '' : (r.item.group ?? '')
      if (!groups.has(name)) groups.set(name, [])
      groups.get(name)!.push({ ...r, index })
    })
    return [...groups.entries()].map(([name, rows]) => ({ name, rows }))
  }, [results, query])

  useModalFocus(open)
  useEffect(() => {
    if (!open) return
    setQuery('')
    setActive(0)
  }, [open])
  useEffect(() => {
    if (open && mounted) input.current?.focus()
  }, [open, mounted, client])
  useEffect(() => {
    listEl.current?.querySelector('.ml-cmd__item--active')?.scrollIntoView?.({ block: 'nearest' })
  }, [active])

  const onQuery = (value: string) => {
    const next = search(items, value, limit)
    setQuery(value)
    setActive(next[0]?.item.disabled ? stepFrom(next, 0, 1) : 0)
  }

  const run = (item: MlCommandItem | undefined) => {
    if (!item || item.disabled) return
    setOpen(false)
    onSelect?.(item)
  }

  function onKeyDown(event: KeyboardEvent) {
    if (event.nativeEvent.isComposing) return
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        if (results.length) setActive(stepFrom(results, active, 1))
        break
      case 'ArrowUp':
        event.preventDefault()
        if (results.length) setActive(stepFrom(results, active, -1))
        break
      case 'Enter':
        event.preventDefault()
        run(results[active]?.item)
        break
      case 'Escape':
        event.preventDefault()
        event.stopPropagation()
        setOpen(false)
        break
      case 'Tab':
        event.preventDefault() // the input is the only stop inside the dialog
    }
  }

  const keys = (shortcut ?? '').split('+').map((k) => (k === 'mod' ? (isMac ? '⌘' : 'Ctrl') : k.length === 1 ? k.toUpperCase() : k))

  useEffect(() => {
    if (!shortcut) return
    const onGlobal = (event: globalThis.KeyboardEvent) => {
      const parts = shortcut.toLowerCase().split('+')
      if (event.key.toLowerCase() !== parts[parts.length - 1]) return
      if (parts.includes('mod') && !(isMac ? event.metaKey : event.ctrlKey)) return
      if (parts.includes('shift') !== event.shiftKey) return
      event.preventDefault()
      setOpen(!openRef.current)
    }
    window.addEventListener('keydown', onGlobal)
    return () => window.removeEventListener('keydown', onGlobal)
  }, [shortcut, setOpen])

  const node = mounted && (
    <div className={cx('ml-cmd', className)}>
      <div className="ml-cmd__backdrop" onClick={() => setOpen(false)} />
      <div className="ml-cmd__panel" role="dialog" aria-modal="true" aria-label={loc.command.dialog}>
        <div className="ml-cmd__search">
          <Icon name="search" className="ml-cmd__search-icon" />
          <input
            ref={input}
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            className="ml-cmd__input"
            type="text"
            role="combobox"
            autoComplete="off"
            spellCheck={false}
            aria-expanded="true"
            aria-autocomplete="list"
            aria-controls={`${uid}-list`}
            aria-activedescendant={results.length ? `${uid}-opt-${active}` : undefined}
            placeholder={placeholder ?? loc.command.placeholder}
            onKeyDown={onKeyDown}
          />
          <kbd className="ml-kbd ml-cmd__esc">Esc</kbd>
        </div>
        <div id={`${uid}-list`} ref={listEl} className="ml-cmd__list" role="listbox" aria-label={loc.command.list}>
          {sections.map((section) => (
            <div key={section.name} role="group" aria-label={section.name || undefined}>
              {section.name && (
                <p className="ml-cmd__group" aria-hidden="true">
                  {section.name}
                </p>
              )}
              {section.rows.map((row) => (
                <div
                  key={row.item.value}
                  id={`${uid}-opt-${row.index}`}
                  role="option"
                  aria-selected={row.index === active}
                  aria-disabled={row.item.disabled || undefined}
                  className={cx('ml-cmd__item', { 'ml-cmd__item--active': row.index === active })}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => run(row.item)}
                  onMouseMove={() => !row.item.disabled && setActive(row.index)}
                >
                  {row.item.icon ? <Icon name={row.item.icon} className="ml-cmd__icon" /> : <span className="ml-cmd__icon ml-cmd__icon--blank" aria-hidden="true" />}
                  <span className="ml-cmd__label">
                    {parts(row.item.label, row.hits).map((p, k) =>
                      p.hit ? (
                        <mark key={k} className="ml-cmd__hit">
                          {p.text}
                        </mark>
                      ) : (
                        <Fragment key={k}>{p.text}</Fragment>
                      ),
                    )}
                  </span>
                  {row.item.shortcut && <span className="ml-cmd__shortcut">{row.item.shortcut}</span>}
                </div>
              ))}
            </div>
          ))}
          {!results.length && (
            <p className="ml-cmd__empty">
              <Paw tone="steel" className="ml-cmd__empty-paw" />
              {emptyText ?? loc.command.empty}
            </p>
          )}
        </div>
        <footer className="ml-cmd__foot" aria-hidden="true">
          <span>
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd> {loc.command.move}
          </span>
          <span>
            <Kbd>Enter</Kbd> {loc.command.run}
          </span>
          <span className="ml-cmd__brand">
            <Paw tone="current" /> Malilion
          </span>
        </footer>
      </div>
    </div>
  )

  return (
    <>
      {trigger?.({ open: () => setOpen(true), keys })}
      {node && client ? createPortal(node, document.body) : null}
    </>
  )
}
