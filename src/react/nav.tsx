import {
  createContext,
  forwardRef,
  useContext,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
  useSyncExternalStore,
  version,
  type CSSProperties,
  type HTMLAttributes,
  type KeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import type { IconName } from '../components/icons'
import type { MlAccordionItem, MlAnchorItem, MlDropdownItem, MlFloatAction, MlMenuItem, MlTabBarItem, MlTourStep } from '../types'
import { Button, Icon, Mascot, Paw } from './basic'
import { useLocale } from './locale'
import { lockScroll, unlockScroll, useTransition } from './overlay'
import { cx, useControllable } from './utils'

const cleanId = (id: string) => id.replace(/[^\w-]/g, '')
const noop = () => () => {}
const useClient = () => useSyncExternalStore(noop, () => true, () => false)
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), ' +
  'textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
/** `inert` is a boolean prop in React 19 but an unknown attribute (needs "") in React 18. */
const inert = (on: boolean) => (on ? ({ inert: version.startsWith('18') ? '' : true } as HTMLAttributes<HTMLDivElement>) : {})
const reducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
type Scroller = HTMLElement | Window
const resolveEl = (target?: string | HTMLElement): Scroller =>
  !target ? window : typeof target === 'string' ? (document.querySelector<HTMLElement>(target) ?? window) : target

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

/* ── Menu ──────────────────────────────────────────────── */

interface MenuContext {
  active?: string
  activePath: string[]
  inline: boolean
  horizontal: boolean
  isOpen: (key: string) => boolean
  toggle: (item: MlMenuItem) => void
  close: (key: string) => void
  select: (item: MlMenuItem) => void
}
const MenuCtx = createContext<MenuContext | null>(null)

/** Keys of every ancestor of `key`, outermost first. */
function pathTo(key: string, items: MlMenuItem[], trail: string[] = []): string[] | null {
  for (const item of items) {
    if (item.key === key) return trail
    if (item.children) {
      const found = pathTo(key, item.children, item.group ? trail : [...trail, item.key])
      if (found) return found
    }
  }
  return null
}

export interface MenuProps {
  items: MlMenuItem[]
  /** vertical: a sidebar with inline submenus. horizontal: a top bar with drop-down submenus. */
  mode?: 'vertical' | 'horizontal'
  /** Vertical only: icon rail; submenus fly out to the side. */
  collapsed?: boolean
  /** Only one submenu open at a time (vertical). */
  accordion?: boolean
  label?: string
  value?: string
  defaultValue?: string
  onChange?: (key: string) => void
  openKeys?: string[]
  defaultOpenKeys?: string[]
  onOpenKeysChange?: (keys: string[]) => void
  onSelect?: (item: MlMenuItem) => void
}

export function Menu({ items, mode = 'vertical', collapsed, accordion, label, value, defaultValue, onChange, openKeys: openProp, defaultOpenKeys = [], onOpenKeysChange, onSelect }: MenuProps) {
  const loc = useLocale()
  const [model, setModel] = useControllable<string | undefined>(value, defaultValue, onChange as (v: string | undefined) => void)
  const [openKeys, setOpenKeysState] = useControllable(openProp, defaultOpenKeys, onOpenKeysChange)
  const openRef = useRef(openKeys)
  openRef.current = openKeys
  const setOpenKeys = (next: string[]) => {
    openRef.current = next
    setOpenKeysState(next)
  }
  const root = useRef<HTMLElement>(null)
  const inline = mode === 'vertical' && !collapsed

  const ctx: MenuContext = {
    active: model,
    activePath: model ? (pathTo(model, items) ?? []) : [],
    inline,
    horizontal: mode === 'horizontal',
    isOpen: (key) => openKeys.includes(key),
    toggle(item) {
      const keys = openRef.current
      if (keys.includes(item.key)) setOpenKeys(keys.filter((k) => k !== item.key))
      else if (accordion) setOpenKeys([...(pathTo(item.key, items) ?? []), item.key])
      else setOpenKeys([...keys, item.key])
    },
    close(key) {
      if (openRef.current.includes(key)) setOpenKeys(openRef.current.filter((k) => k !== key))
    },
    select(item) {
      if (item.disabled) return
      setModel(item.key)
      onSelect?.(item)
      if (!inline) setOpenKeys([])
    },
  }

  useOutsidePointer(root, !inline && openKeys.length > 0, () => setOpenKeys([]))

  function onKeyDown(event: KeyboardEvent) {
    const target = event.target as HTMLElement
    const popup = target.closest('.ml-menu__popup')
    const horizontal = mode === 'horizontal' && !popup
    const fwd = horizontal ? 'ArrowRight' : 'ArrowDown'
    const back = horizontal ? 'ArrowLeft' : 'ArrowUp'
    if (![fwd, back, 'Home', 'End'].includes(event.key)) return
    const scope = (popup as HTMLElement | null) ?? root.current
    if (!scope) return
    // Hidden items sit inside an inert (collapsed) submenu.
    const links = [...scope.querySelectorAll<HTMLElement>('.ml-menu__link:not([aria-disabled="true"])')].filter(
      (el) => !el.closest('[inert]') && el.closest('.ml-menu__popup') === popup,
    )
    const index = links.indexOf(target)
    let to = -1
    if (event.key === fwd) to = (index + 1) % links.length
    else if (event.key === back) to = (index - 1 + links.length) % links.length
    else if (event.key === 'Home') to = 0
    else if (event.key === 'End') to = links.length - 1
    if (to === -1) return
    event.preventDefault()
    links[to]?.focus()
  }

  return (
    <nav
      ref={root}
      className={cx('ml-menu', `ml-menu--${mode}`, { 'ml-menu--collapsed': mode === 'vertical' && collapsed })}
      aria-label={label ?? loc.nav.menu}
      onKeyDown={onKeyDown}
    >
      <MenuCtx.Provider value={ctx}>
        <MenuList items={items} depth={0} />
      </MenuCtx.Provider>
    </nav>
  )
}

/** @internal recursive list of a <Menu>. */
export function MenuList({ items, depth }: { items: MlMenuItem[]; depth: number }) {
  return (
    <ul className={cx('ml-menu__list', `ml-menu__list--depth-${depth}`)}>
      {items.map((item) =>
        item.group ? (
          <li key={item.key} className="ml-menu__group">
            <p className="ml-menu__group-title">{item.label}</p>
            {item.children && <MenuList items={item.children} depth={depth} />}
          </li>
        ) : (
          <MenuEntry key={item.key} item={item} depth={depth} />
        ),
      )}
    </ul>
  )
}

function MenuEntry({ item, depth }: { item: MlMenuItem; depth: number }) {
  const menu = useContext(MenuCtx)!
  const parent = !!item.children?.length && !item.group
  const open = parent && menu.isOpen(item.key)
  const active = menu.active === item.key
  const rootPopup = menu.horizontal && depth === 0
  const li = useRef<HTMLLIElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const focusFirst = useRef(false)
  const popup = useTransition(open && !menu.inline, 'ml-dropdown', { enter: 480, leave: 120 })

  useEffect(() => () => clearTimeout(timer.current), [])
  useEffect(() => {
    if (!focusFirst.current || !popup.mounted) return
    focusFirst.current = false
    li.current?.querySelector<HTMLElement>(':scope > .ml-menu__popup .ml-menu__link:not([aria-disabled="true"])')?.focus()
  }, [popup.mounted, open])

  const onEnter = () => {
    if (menu.inline || !parent || item.disabled) return
    clearTimeout(timer.current)
    if (!menu.isOpen(item.key)) menu.toggle(item)
  }
  const onLeave = () => {
    if (menu.inline || !parent) return
    timer.current = setTimeout(() => menu.close(item.key), 160)
  }
  const onHeaderKeyDown = (event: KeyboardEvent) => {
    if (menu.inline) return
    const opens = rootPopup ? ['ArrowDown', 'Enter', ' '] : ['ArrowRight', 'Enter', ' ']
    if (!opens.includes(event.key)) return
    event.preventDefault()
    event.stopPropagation()
    focusFirst.current = true
    if (!menu.isOpen(item.key)) menu.toggle(item)
    else if (popup.mounted) li.current?.querySelector<HTMLElement>(':scope > .ml-menu__popup .ml-menu__link:not([aria-disabled="true"])')?.focus()
  }
  const onPopupKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Escape' && (rootPopup || event.key !== 'ArrowLeft')) return
    event.preventDefault()
    event.stopPropagation()
    menu.close(item.key)
    li.current?.querySelector<HTMLElement>(':scope > .ml-menu__link')?.focus()
  }
  const onClick = (event: ReactMouseEvent) => {
    if (item.disabled) return event.preventDefault()
    if (parent) menu.toggle(item)
    else menu.select(item)
  }

  const link = item.href && !parent
  const Tag = link ? 'a' : 'button'
  return (
    <li
      ref={li}
      className={cx('ml-menu__item', { 'ml-menu__item--open': open, 'ml-menu__item--in-path': menu.activePath.includes(item.key) })}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      <Tag
        type={link ? undefined : 'button'}
        href={item.disabled ? undefined : item.href}
        className={cx('ml-menu__link', { 'ml-menu__link--active': active, 'ml-menu__link--parent': parent })}
        style={menu.inline && depth ? ({ '--_depth': depth } as CSSProperties) : undefined}
        aria-current={active ? 'page' : undefined}
        aria-expanded={parent ? open : undefined}
        aria-disabled={item.disabled || undefined}
        title={!menu.inline && depth === 0 ? item.label : undefined}
        onClick={onClick}
        onKeyDown={parent ? onHeaderKeyDown : undefined}
      >
        {item.icon && <Icon name={item.icon} className="ml-menu__icon" />}
        <span className="ml-menu__label">{item.label}</span>
        {item.badge !== undefined && <span className="ml-menu__badge">{item.badge}</span>}
        {parent && <Icon name="chevronDown" className="ml-menu__chevron" />}
      </Tag>
      {parent && menu.inline ? (
        <div className="ml-menu__sub" {...inert(!open)}>
          <div className="ml-menu__sub-inner">
            <MenuList items={item.children!} depth={depth + 1} />
          </div>
        </div>
      ) : (
        parent &&
        popup.mounted && (
          <div className={cx('ml-menu__popup', rootPopup ? 'ml-menu__popup--root' : 'ml-menu__popup--side', popup.className)} onKeyDown={onPopupKeyDown}>
            {!menu.horizontal && depth === 0 && <p className="ml-menu__popup-title">{item.label}</p>}
            <MenuList items={item.children!} depth={depth + 1} />
          </div>
        )
      )}
    </li>
  )
}

/* ── ContextMenu ───────────────────────────────────────── */

export interface ContextMenuHandle {
  open: (x: number, y: number) => void
  close: () => void
}

export interface ContextMenuProps {
  items: MlDropdownItem[]
  disabled?: boolean
  label?: string
  onSelect?: (item: MlDropdownItem) => void
  onOpen?: (event: ReactMouseEvent | KeyboardEvent) => void
  children?: ReactNode | ((api: { open: boolean }) => ReactNode)
}

export const ContextMenu = forwardRef<ContextMenuHandle, ContextMenuProps>(function ContextMenu({ items, disabled, label, onSelect, onOpen, children }, ref) {
  const loc = useLocale()
  const client = useClient()
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const menu = useRef<HTMLUListElement>(null)
  const itemEls = useRef<(HTMLLIElement | null)[]>([])
  const returnTo = useRef<HTMLElement | null>(null)
  const pending = useRef<{ x: number; y: number } | null>(null)
  const openRef = useRef(open)
  openRef.current = open
  const menuId = `ml-ctx-${cleanId(useId())}`
  const { mounted, className: phase } = useTransition(open, 'ml-dropdown', { enter: 480, leave: 120 })
  const enabled = items.flatMap((item, i) => (item.disabled ? [] : [i]))

  const show = (x: number, y: number) => {
    returnTo.current = document.activeElement as HTMLElement | null
    pending.current = { x, y }
    setPos({ x, y })
    setOpen(true)
  }
  const close = (returnFocus = false) => {
    if (!openRef.current) return
    openRef.current = false
    setOpen(false)
    if (returnFocus) returnTo.current?.focus?.()
  }
  useImperativeHandle(ref, () => ({ open: show, close: () => close(false) }))

  useEffect(() => {
    const at = pending.current
    if (!open || !mounted || !at) return
    pending.current = null
    // Keep the whole menu on screen: flip left / up when it would overflow.
    const el = menu.current
    if (el) {
      const { width, height } = el.getBoundingClientRect()
      setPos({
        x: at.x + width > window.innerWidth - 8 ? Math.max(8, at.x - width) : at.x,
        y: at.y + height > window.innerHeight - 8 ? Math.max(8, at.y - height) : at.y,
      })
    }
    itemEls.current[enabled[0]]?.focus()
  }, [open, mounted])

  useEffect(() => {
    if (!open) return
    const onOutside = (event: Event) => {
      if (!menu.current?.contains(event.target as Node)) close(false)
    }
    const quiet = () => close(false)
    document.addEventListener('pointerdown', onOutside, true)
    window.addEventListener('scroll', quiet, true)
    window.addEventListener('resize', quiet)
    return () => {
      document.removeEventListener('pointerdown', onOutside, true)
      window.removeEventListener('scroll', quiet, true)
      window.removeEventListener('resize', quiet)
    }
  }, [open])

  const onContextMenu = (event: ReactMouseEvent) => {
    if (disabled) return
    event.preventDefault()
    onOpen?.(event)
    show(event.clientX, event.clientY)
  }
  const onTargetKeyDown = (event: KeyboardEvent) => {
    if (disabled) return
    if (event.key === 'ContextMenu' || (event.key === 'F10' && event.shiftKey)) {
      event.preventDefault()
      const rect = (event.target as HTMLElement).getBoundingClientRect()
      onOpen?.(event)
      show(rect.left + 12, rect.top + Math.min(rect.height, 32))
    }
  }
  const choose = (item: MlDropdownItem) => {
    if (item.disabled) return
    close(true)
    onSelect?.(item)
  }
  function onMenuKeyDown(event: KeyboardEvent) {
    const current = itemEls.current.findIndex((el) => el === document.activeElement)
    const at = enabled.indexOf(current)
    const focus = (i: number | undefined) => i !== undefined && itemEls.current[i]?.focus()
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        focus(enabled[(at + 1) % enabled.length])
        break
      case 'ArrowUp':
        event.preventDefault()
        focus(enabled[(at - 1 + enabled.length) % enabled.length])
        break
      case 'Home':
        event.preventDefault()
        focus(enabled[0])
        break
      case 'End':
        event.preventDefault()
        focus(enabled.at(-1))
        break
      case 'Enter':
      case ' ':
        event.preventDefault()
        if (current !== -1) choose(items[current])
        break
      case 'Escape':
      case 'Tab':
        event.preventDefault()
        close(true)
    }
  }

  const list = mounted && (
    <ul
      id={menuId}
      ref={menu}
      role="menu"
      aria-label={label ?? loc.contextMenu}
      className={cx('ml-dropdown__menu ml-ctx__menu', phase)}
      style={{ left: `${pos.x}px`, top: `${pos.y}px` }}
      onKeyDown={onMenuKeyDown}
      onContextMenu={(e) => e.preventDefault()}
    >
      {items.map((item, index) => [
        item.divider && <li key={`${item.value}-divider`} role="separator" className="ml-dropdown__divider" />,
        <li
          key={item.value}
          ref={(el) => {
            itemEls.current[index] = el
          }}
          role="menuitem"
          tabIndex={-1}
          aria-disabled={item.disabled || undefined}
          className={cx('ml-dropdown__item', { 'ml-dropdown__item--danger': item.danger })}
          onClick={() => choose(item)}
          onMouseMove={(e) => !item.disabled && e.currentTarget.focus()}
        >
          {item.icon && <Icon name={item.icon} className="ml-dropdown__icon" />}
          <span className="ml-dropdown__label">{item.label}</span>
          {item.hint && <span className="ml-dropdown__hint">{item.hint}</span>}
        </li>,
      ])}
    </ul>
  )
  return (
    <>
      <div className="ml-ctx" onContextMenu={onContextMenu} onKeyDown={onTargetKeyDown}>
        {typeof children === 'function' ? children({ open }) : children}
      </div>
      {list && client ? createPortal(list, document.body) : null}
    </>
  )
})

/* ── NavBar ────────────────────────────────────────────── */

export interface NavBarProps {
  title?: ReactNode
  subtitle?: ReactNode
  /** Show a back button (calls onBack). */
  back?: boolean
  /** Big left-aligned title under the bar, iOS style. */
  large?: boolean
  onBack?: () => void
  left?: ReactNode
  right?: ReactNode
  /** Replaces the whole title block (title + subtitle). */
  heading?: ReactNode
}

export function NavBar({ title, subtitle, back, large, onBack, left, right, heading }: NavBarProps) {
  const loc = useLocale()
  return (
    <header className={cx('ml-navbar', { 'ml-navbar--large': large })}>
      <div className="ml-navbar__bar">
        <div className="ml-navbar__side">
          {back && (
            <button type="button" className="ml-navbar__icon-btn" aria-label={loc.nav.back} onClick={onBack}>
              <Icon name="chevronLeft" />
            </button>
          )}
          {left}
        </div>
        {!large && (
          <div className="ml-navbar__center">
            {heading ?? (
              <>
                <span className="ml-navbar__title">{title}</span>
                {subtitle && <span className="ml-navbar__subtitle">{subtitle}</span>}
              </>
            )}
          </div>
        )}
        <div className="ml-navbar__side ml-navbar__side--end">{right}</div>
      </div>
      {large && (
        <div className="ml-navbar__large">
          {heading ?? (
            <>
              <h2 className="ml-navbar__large-title">{title}</h2>
              {subtitle && <p className="ml-navbar__large-sub">{subtitle}</p>}
            </>
          )}
        </div>
      )}
    </header>
  )
}

/* ── TabBar ────────────────────────────────────────────── */

export interface TabBarProps {
  items: MlTabBarItem[]
  /** Raised paw button in the middle; calls onAction. */
  actionLabel?: string
  label?: string
  value?: string
  defaultValue?: string
  onChange?: (value: string) => void
  onAction?: () => void
}

export function TabBar({ items, actionLabel, label, value, defaultValue, onChange, onAction }: TabBarProps) {
  const loc = useLocale()
  const [model, setModel] = useControllable<string | undefined>(value, defaultValue, onChange as (v: string | undefined) => void)
  const half = Math.ceil(items.length / 2)
  const groups = actionLabel ? [items.slice(0, half), items.slice(half)] : [items, []]
  return (
    <nav className="ml-tabbar" aria-label={label ?? loc.nav.tabBar}>
      {groups.map((group, g) => [
        ...group.map((item) => (
          <button
            key={item.value}
            type="button"
            className={cx('ml-tabbar__item', { 'ml-tabbar__item--active': model === item.value })}
            aria-current={model === item.value ? 'page' : undefined}
            onClick={() => setModel(item.value)}
          >
            <span className="ml-tabbar__icon">
              <Icon name={item.icon} />
              {item.badge !== undefined && <span className="ml-tabbar__badge">{item.badge}</span>}
            </span>
            <span className="ml-tabbar__label">{item.label}</span>
          </button>
        )),
        actionLabel && g === 0 && (
          <button key="__action" type="button" className="ml-tabbar__action" aria-label={actionLabel} onClick={onAction}>
            <Paw tone="current" />
          </button>
        ),
      ])}
    </nav>
  )
}

/* ── Anchor ────────────────────────────────────────────── */

export interface AnchorProps {
  items: MlAnchorItem[]
  /** Space kept above a section when jumping to it, in px. */
  offset?: number
  /** Scrolling element to watch; defaults to the page. Element or CSS selector. */
  container?: HTMLElement | string
  /** Write #id to the URL when a link is clicked. */
  updateHash?: boolean
  title?: ReactNode
  label?: string
  /** The id of the section currently in view. */
  value?: string
  defaultValue?: string
  onChange?: (id: string) => void
}

export function Anchor({ items, offset = 0, container, updateHash = true, title, label, value, defaultValue, onChange }: AnchorProps) {
  const loc = useLocale()
  const [active, setActive] = useControllable<string | undefined>(value, defaultValue, onChange as (v: string | undefined) => void)
  const list = useRef<HTMLDivElement>(null)
  const [ink, setInk] = useState({ top: 0, height: 0, ready: false })
  const scroller = useRef<Scroller | null>(null)
  const lockedUntil = useRef(0)

  const flat: { item: MlAnchorItem; depth: number }[] = []
  const walk = (list: MlAnchorItem[], depth: number) =>
    list.forEach((item) => {
      flat.push({ item, depth })
      if (item.children) walk(item.children, depth + 1)
    })
  walk(items, 0)

  const latest = useRef({ flat, offset, active, setActive })
  latest.current = { flat, offset, active, setActive }

  const viewportTop = () => {
    const s = scroller.current
    return s === window || !s ? 0 : (s as HTMLElement).getBoundingClientRect().top
  }

  useEffect(() => {
    const spy = () => {
      if (Date.now() < lockedUntil.current) return
      const { flat, offset, active, setActive } = latest.current
      const line = viewportTop() + offset + 8
      let current: string | undefined
      for (const { item } of flat) {
        const el = document.getElementById(item.id)
        if (el && el.getBoundingClientRect().top <= line) current = item.id
      }
      // Scrolled to the very bottom: the last section wins even if it's short.
      const el = scroller.current === window ? document.documentElement : (scroller.current as HTMLElement | null)
      const scrolls = !!el && el.scrollHeight > el.clientHeight
      if (el && scrolls && el.scrollTop + el.clientHeight >= el.scrollHeight - 2 && flat.length) current = flat[flat.length - 1].item.id
      current ??= flat[0]?.item.id
      if (current && current !== active) setActive(current)
    }
    let frame = 0
    const onScroll = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(spy)
    }
    const s = (scroller.current = resolveEl(container))
    s.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    spy()
    return () => {
      s.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      cancelAnimationFrame(frame)
    }
  }, [container])

  useEffect(() => {
    const link = list.current?.querySelector<HTMLElement>('.ml-anchor__link--active')
    if (link) setInk({ top: link.offsetTop, height: link.offsetHeight, ready: true })
  }, [active])

  function go(event: ReactMouseEvent, id: string) {
    const target = document.getElementById(id)
    if (!target || event.button !== 0 || event.metaKey || event.ctrlKey) return
    event.preventDefault()
    const behavior: ScrollBehavior = reducedMotion() ? 'auto' : 'smooth'
    const s = scroller.current
    if (s === window || !s) window.scrollTo({ top: window.scrollY + target.getBoundingClientRect().top - offset, behavior })
    else (s as HTMLElement).scrollTo({ top: (s as HTMLElement).scrollTop + target.getBoundingClientRect().top - viewportTop() - offset, behavior })
    if (updateHash) history.replaceState(history.state, '', `#${id}`)
    lockedUntil.current = Date.now() + 700
    setActive(id)
    target.setAttribute('tabindex', '-1')
    target.focus({ preventScroll: true })
  }

  return (
    <nav className="ml-anchor" aria-label={label ?? loc.nav.anchor}>
      {title && <p className="ml-anchor__title">{title}</p>}
      <div ref={list} className="ml-anchor__list">
        <span
          className="ml-anchor__ink"
          style={{ transform: `translateY(${ink.top}px)`, height: `${ink.height}px`, opacity: ink.ready ? 1 : 0 }}
          aria-hidden="true"
        />
        {flat.map(({ item, depth }) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            className={cx('ml-anchor__link', { 'ml-anchor__link--active': active === item.id })}
            style={depth ? ({ '--_depth': depth } as CSSProperties) : undefined}
            aria-current={active === item.id ? 'location' : undefined}
            onClick={(e) => go(e, item.id)}
          >
            {item.label}
          </a>
        ))}
      </div>
    </nav>
  )
}

/* ── Affix ─────────────────────────────────────────────── */

export interface AffixHandle {
  update: () => void
}

export interface AffixProps {
  /** Pin when the element's top reaches this many px from the top. */
  offsetTop?: number
  /** Pin to the bottom instead, this many px up. Overrides offsetTop. */
  offsetBottom?: number
  /** Scroll container to watch; defaults to the window. */
  target?: string | HTMLElement
  zIndex?: number
  onChange?: (fixed: boolean) => void
  children?: ReactNode | ((api: { fixed: boolean }) => ReactNode)
}

export const Affix = forwardRef<AffixHandle, AffixProps>(function Affix({ offsetTop = 0, offsetBottom, target, zIndex = 100, onChange, children }, ref) {
  const holder = useRef<HTMLDivElement>(null)
  const [fixed, setFixed] = useState(false)
  const [box, setBox] = useState({ width: 0, height: 0, left: 0, top: 0 })
  const container = useRef<Scroller | null>(null)
  const frame = useRef(0)
  const latest = useRef({ offsetTop, offsetBottom, onChange, fixed })
  latest.current = { offsetTop, offsetBottom, onChange, fixed: latest.current.fixed }

  const update = () => {
    frame.current = 0
    const el = holder.current
    const c = container.current
    if (!el || !c) return
    const { offsetTop, offsetBottom, onChange } = latest.current
    const rect = el.getBoundingClientRect()
    const area = c === window ? { top: 0, bottom: window.innerHeight } : (c as HTMLElement).getBoundingClientRect()
    let pin: boolean
    let top: number
    if (offsetBottom !== undefined) {
      const limit = area.bottom - offsetBottom
      pin = rect.bottom > limit
      top = limit - rect.height
    } else {
      const limit = area.top + offsetTop
      pin = rect.top < limit
      top = limit
    }
    setBox({ width: rect.width, height: rect.height, left: rect.left, top })
    if (pin !== latest.current.fixed) {
      latest.current.fixed = pin
      setFixed(pin)
      onChange?.(pin)
    }
  }
  const schedule = () => {
    if (!frame.current) frame.current = requestAnimationFrame(update)
  }
  const updateRef = useRef(update)
  updateRef.current = update
  useImperativeHandle(ref, () => ({ update: () => updateRef.current() }))

  useEffect(() => {
    const onScroll = () => {
      if (!frame.current) frame.current = requestAnimationFrame(() => updateRef.current())
    }
    const c = (container.current = resolveEl(target))
    c.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    updateRef.current()
    return () => {
      c.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      cancelAnimationFrame(frame.current)
      frame.current = 0
    }
  }, [target])
  const first = useRef(true)
  useEffect(() => {
    if (first.current) first.current = false
    else schedule()
  }, [offsetTop, offsetBottom])

  return (
    <div ref={holder} className="ml-affix" style={fixed ? { height: `${box.height}px` } : undefined}>
      <div
        className={cx('ml-affix__inner', { 'ml-affix__inner--fixed': fixed })}
        style={fixed ? { position: 'fixed', top: `${box.top}px`, left: `${box.left}px`, width: `${box.width}px`, zIndex } : undefined}
      >
        {typeof children === 'function' ? children({ fixed }) : children}
      </div>
    </div>
  )
})

/* ── BackTop ───────────────────────────────────────────── */

const CIRC = 2 * Math.PI * 25

export interface BackTopProps {
  /** Show after scrolling this many px. */
  visibilityHeight?: number
  /** Scroll container; defaults to the window. */
  target?: string | HTMLElement
  right?: number
  bottom?: number
  label?: string
  onClick?: () => void
  children?: ReactNode
}

export function BackTop({ visibilityHeight = 400, target, right = 32, bottom = 32, label, onClick, children }: BackTopProps) {
  const loc = useLocale()
  const [scroll, setScroll] = useState({ top: 0, max: 1 })
  const container = useRef<Scroller | null>(null)
  const visible = scroll.top >= visibilityHeight
  const progress = Math.min(1, scroll.top / Math.max(1, scroll.max))
  const { mounted, className } = useTransition(visible, 'ml-backtop', { enter: 480, leave: 240 })

  useEffect(() => {
    let frame = 0
    const measure = () => {
      frame = 0
      const c = container.current
      if (c === window) setScroll({ top: window.scrollY, max: document.documentElement.scrollHeight - window.innerHeight })
      else if (c) setScroll({ top: (c as HTMLElement).scrollTop, max: (c as HTMLElement).scrollHeight - (c as HTMLElement).clientHeight })
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure)
    }
    const c = (container.current = resolveEl(target))
    c.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    measure()
    return () => {
      c.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      cancelAnimationFrame(frame)
    }
  }, [target])

  const toTop = () => {
    container.current?.scrollTo({ top: 0, behavior: reducedMotion() ? 'auto' : 'smooth' })
    onClick?.()
  }

  if (!mounted) return null
  return (
    <button type="button" className={cx('ml-backtop', className)} aria-label={label ?? loc.nav.backTop} style={{ right: `${right}px`, bottom: `${bottom}px` }} onClick={toTop}>
      {children ?? (
        <>
          <svg className="ml-backtop__ring" viewBox="0 0 56 56" aria-hidden="true">
            <circle cx="28" cy="28" r="25" className="ml-backtop__track" />
            <circle cx="28" cy="28" r="25" className="ml-backtop__progress" strokeDasharray={CIRC} strokeDashoffset={CIRC * (1 - progress)} />
          </svg>
          <Icon name="arrowUp" className="ml-backtop__icon" />
        </>
      )}
    </button>
  )
}

/* ── FloatButton ───────────────────────────────────────── */

export interface FloatButtonProps {
  /** Main button icon (when there are no actions, or while closed). */
  icon?: IconName
  label?: string
  /** Speed-dial actions that fan out from the main button. */
  actions?: MlFloatAction[]
  /** Open the actions on hover as well as click. */
  hover?: boolean
  corner?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
  /** Distance from the corner, in px. */
  offset?: number
  badge?: number | string
  tone?: 'gold' | 'steel' | 'tech'
  /** Render in place instead of fixed to the viewport. */
  inline?: boolean
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  onClick?: (event: ReactMouseEvent) => void
  onSelect?: (action: MlFloatAction) => void
  /** Replaces the main icon. */
  children?: ReactNode
}

const NO_ACTIONS: MlFloatAction[] = []

export function FloatButton({
  icon = 'plus',
  label,
  actions = NO_ACTIONS,
  hover,
  corner = 'bottom-right',
  offset = 24,
  badge,
  tone = 'gold',
  inline,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  onClick,
  onSelect,
  children,
}: FloatButtonProps) {
  const loc = useLocale()
  const [open, setOpen] = useControllable(openProp, defaultOpen, onOpenChange)
  const root = useRef<HTMLDivElement>(null)
  const menuId = `ml-fab-${cleanId(useId())}`
  const hasActions = actions.length > 0
  const [v, h] = corner.split('-')

  const onMain = (event: ReactMouseEvent) => {
    if (hasActions) setOpen(!open)
    else onClick?.(event)
  }
  const choose = (action: MlFloatAction) => {
    setOpen(false)
    onSelect?.(action)
  }
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && open) {
      setOpen(false)
      root.current?.querySelector<HTMLElement>('.ml-fab__main')?.focus()
    }
  }
  useOutsidePointer(root, open, () => setOpen(false))

  return (
    <div
      ref={root}
      className={cx('ml-fab', `ml-fab--${tone}`, `ml-fab--${corner}`, { 'ml-fab--open': open, 'ml-fab--inline': inline, 'ml-fab--up': corner.startsWith('bottom') })}
      style={inline ? undefined : { [v]: `${offset}px`, [h]: `${offset}px` }}
      onKeyDown={onKeyDown}
      onMouseEnter={() => hover && hasActions && setOpen(true)}
      onMouseLeave={() => hover && hasActions && setOpen(false)}
    >
      {hasActions && (
        <ul id={menuId} className="ml-fab__actions" role="menu" aria-hidden={!open}>
          {actions.map((action, i) => (
            <li key={action.key} role="none" style={{ '--i': i } as CSSProperties}>
              <span className="ml-fab__label" aria-hidden="true">
                {action.label}
              </span>
              <button
                type="button"
                role="menuitem"
                className={cx('ml-fab__action', { 'ml-fab__action--danger': action.danger })}
                aria-label={action.label}
                tabIndex={open ? 0 : -1}
                onClick={() => choose(action)}
              >
                <Icon name={action.icon} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <button
        type="button"
        className="ml-fab__main"
        aria-label={label ?? (hasActions ? (open ? loc.float.close : loc.float.open) : undefined)}
        title={label}
        aria-haspopup={hasActions ? 'menu' : undefined}
        aria-expanded={hasActions ? open : undefined}
        aria-controls={hasActions ? menuId : undefined}
        onClick={onMain}
      >
        {children ?? <Icon name={icon} className="ml-fab__icon" />}
        {badge !== undefined && <span className="ml-fab__badge">{badge}</span>}
      </button>
    </div>
  )
}

/* ── Tour ──────────────────────────────────────────────── */

export interface TourProps {
  steps: MlTourStep[]
  /** Show the lion guide in each card. */
  mascot?: boolean
  /** Space around the highlighted element, in px. */
  padding?: number
  /** Close when the dimmed area is clicked. */
  closeOnMask?: boolean
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  current?: number
  defaultCurrent?: number
  onCurrentChange?: (index: number) => void
  onFinish?: () => void
  onClose?: (step: number) => void
  /** Rich body content; defaults to `step.content`. */
  children?: (api: { step: MlTourStep; index: number }) => ReactNode
}

type Rect = { top: number; left: number; width: number; height: number }

function resolveStep(target: MlTourStep['target']): HTMLElement | null {
  if (!target) return null
  if (typeof target === 'string') return document.querySelector<HTMLElement>(target)
  if (typeof target === 'function') return target()
  return target
}

export function Tour({
  steps,
  mascot = true,
  padding = 8,
  closeOnMask = false,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  current: currentProp,
  defaultCurrent = 0,
  onCurrentChange,
  onFinish,
  onClose,
  children,
}: TourProps) {
  const loc = useLocale()
  const client = useClient()
  const [open, setOpen] = useControllable(openProp, defaultOpen, onOpenChange)
  const [current, setCurrent] = useControllable(currentProp, defaultCurrent, onCurrentChange)
  const [rect, setRect] = useState<Rect | null>(null)
  const card = useRef<HTMLDivElement>(null)
  const titleId = `ml-tour-${cleanId(useId())}`
  const step = steps[current] as MlTourStep | undefined
  const isLast = current >= steps.length - 1
  const { mounted, className: phase } = useTransition(open && !!step, 'ml-tour', { enter: 240, leave: 240 })

  const measureRef = useRef(() => {})
  measureRef.current = () => {
    const el = resolveStep(step?.target)
    if (!el) return setRect(null)
    const r = el.getBoundingClientRect()
    setRect({ top: r.top - padding, left: r.left - padding, width: r.width + padding * 2, height: r.height + padding * 2 })
  }

  useEffect(() => {
    if (!open) return
    const returnTo = document.activeElement as HTMLElement | null
    lockScroll()
    const onViewport = () => measureRef.current()
    window.addEventListener('resize', onViewport)
    window.addEventListener('scroll', onViewport, true)
    return () => {
      unlockScroll()
      window.removeEventListener('resize', onViewport)
      window.removeEventListener('scroll', onViewport, true)
      returnTo?.focus?.()
    }
  }, [open])

  useEffect(() => {
    if (!open || !mounted) return
    const el = resolveStep(step?.target)
    el?.scrollIntoView?.({ block: 'center', inline: 'nearest', behavior: reducedMotion() ? 'auto' : 'smooth' })
    // Measure now, and again once a smooth scroll has settled.
    measureRef.current()
    const timer = setTimeout(() => measureRef.current(), 380)
    card.current?.focus()
    return () => clearTimeout(timer)
  }, [open, mounted, current])

  const go = (to: number) => {
    if (to >= 0 && to < steps.length) setCurrent(to)
  }
  const next = () => {
    if (isLast) {
      setOpen(false)
      onFinish?.()
    } else go(current + 1)
  }
  const close = () => {
    setOpen(false)
    onClose?.(current)
  }
  const onKeyDown = (event: KeyboardEvent) => {
    const onButton = !!(event.target as HTMLElement).closest('button')
    if (event.key === 'Escape') {
      event.preventDefault()
      close()
    } else if (event.key === 'ArrowRight' && !onButton) next()
    else if (event.key === 'ArrowLeft' && !onButton) go(current - 1)
    else if (event.key === 'Tab' && card.current) {
      const items = [...card.current.querySelectorAll<HTMLElement>(FOCUSABLE)]
      if (!items.length) return event.preventDefault()
      const first = items[0]
      const last = items[items.length - 1]
      if (event.shiftKey && (document.activeElement === first || document.activeElement === card.current)) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
  }

  let cardStyle: CSSProperties = { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
  if (rect && typeof window !== 'undefined') {
    const gap = 14
    const placement = step?.placement ?? 'bottom'
    const w = Math.min(340, window.innerWidth - 32)
    const clampX = (x: number) => Math.max(16, Math.min(window.innerWidth - w - 16, x))
    const clampY = (y: number) => Math.max(16, Math.min(window.innerHeight - 200, y))
    if (placement === 'top') cardStyle = { left: `${clampX(rect.left)}px`, top: `${rect.top - gap}px`, transform: 'translateY(-100%)', width: `${w}px` }
    else if (placement === 'left') cardStyle = { left: `${Math.max(16, rect.left - gap - w)}px`, top: `${clampY(rect.top)}px`, width: `${w}px` }
    else if (placement === 'right') cardStyle = { left: `${Math.min(window.innerWidth - w - 16, rect.left + rect.width + gap)}px`, top: `${clampY(rect.top)}px`, width: `${w}px` }
    else cardStyle = { left: `${clampX(rect.left)}px`, top: `${rect.top + rect.height + gap}px`, width: `${w}px` }
  }

  if (!mounted || !step || !client) return null
  const body = children ? children({ step, index: current }) : step.content
  return createPortal(
    <div className={cx('ml-tour', phase)} onKeyDown={onKeyDown}>
      {rect ? (
        <div className="ml-tour__spot" style={{ top: `${rect.top}px`, left: `${rect.left}px`, width: `${rect.width}px`, height: `${rect.height}px` }} aria-hidden="true" />
      ) : (
        <div className="ml-tour__dim" aria-hidden="true" />
      )}
      <div className="ml-tour__catcher" onClick={() => closeOnMask && close()} />
      <div key={`step-${current}`} ref={card} className="ml-tour__card" role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} style={cardStyle}>
        <header className="ml-tour__head">
          {mascot && <Mascot size={40} frame="ring" title="" className="ml-tour__lion" />}
          <div className="ml-tour__heading">
            <p className="ml-tour__count">{loc.tour.step(current + 1, steps.length)}</p>
            <h2 id={titleId} className="ml-tour__title">
              {step.title}
            </h2>
          </div>
          <button type="button" className="ml-tour__close" aria-label={loc.tour.skip} onClick={close}>
            <Icon name="close" />
          </button>
        </header>
        <div className="ml-tour__body">{body}</div>
        <footer className="ml-tour__foot">
          <span className="ml-tour__dots" aria-hidden="true">
            {steps.map((_, i) => (
              <i key={i} className={cx({ on: i === current, done: i < current }) || undefined} />
            ))}
          </span>
          {current > 0 && (
            <Button size="sm" variant="ghost" onClick={() => go(current - 1)}>
              {loc.tour.prev}
            </Button>
          )}
          <Button size="sm" stamp onClick={next}>
            {isLast ? loc.tour.finish : loc.tour.next}
          </Button>
        </footer>
      </div>
    </div>,
    document.body,
  )
}

/* ── Accordion ─────────────────────────────────────────── */

export interface AccordionProps {
  items: MlAccordionItem[]
  /** Allow several panels open at once. */
  multiple?: boolean
  /** Values of the open panels. */
  value?: string[]
  defaultValue?: string[]
  onChange?: (open: string[]) => void
  /** Rich panel content; return undefined to fall back to `item.content`. */
  children?: (item: MlAccordionItem) => ReactNode
}

const NONE: string[] = []

export function Accordion({ items, multiple, value, defaultValue = NONE, onChange, children }: AccordionProps) {
  const [open, setOpen] = useControllable(value, defaultValue, onChange)
  const baseId = `ml-accordion-${cleanId(useId())}`
  const toggle = (item: MlAccordionItem) => {
    if (item.disabled) return
    if (open.includes(item.value)) setOpen(open.filter((v) => v !== item.value))
    else setOpen(multiple ? [...open, item.value] : [item.value])
  }
  return (
    <div className="ml-accordion">
      {items.map((item) => {
        const isOpen = open.includes(item.value)
        const custom = children?.(item)
        return (
          <div key={item.value} className={cx('ml-accordion__item', { 'ml-accordion__item--open': isOpen })}>
            <h3 className="ml-accordion__heading">
              <button
                id={`${baseId}-${item.value}-btn`}
                type="button"
                className="ml-accordion__trigger"
                aria-expanded={isOpen}
                aria-controls={`${baseId}-${item.value}-panel`}
                disabled={item.disabled}
                onClick={() => toggle(item)}
              >
                <Paw tone="current" className="ml-accordion__paw" />
                <span className="ml-accordion__title">{item.title}</span>
                <Icon name="chevronDown" className="ml-accordion__chevron" />
              </button>
            </h3>
            <div
              id={`${baseId}-${item.value}-panel`}
              role="region"
              className="ml-accordion__panel"
              aria-labelledby={`${baseId}-${item.value}-btn`}
              {...inert(!isOpen)}
            >
              <div className="ml-accordion__clip">
                <div className="ml-accordion__content">{custom === undefined ? item.content : custom}</div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
