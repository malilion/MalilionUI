import { forwardRef, useEffect, useId, useImperativeHandle, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react'
import {
  INBOX_TABS,
  INBOX_TYPE_ICON,
  inboxBadge,
  inboxCounts,
  inboxDismiss,
  inboxFilter,
  inboxGroups,
  inboxMarkAllRead,
  inboxMarkRead,
  type MlInboxItem,
  type MlInboxTab,
} from '../components/inbox'
import { relativeTime, toIso, type MlTimeInput } from '../components/relative-time'
import { tabMove } from '../components/stickers'
import { safeHref } from '../url'
import { Avatar, Empty, Icon } from './basic'
import { CuteIcon } from './cute-icon'
import { useLocale } from './locale'
import { useNow, useOutsidePointer } from './use-outside'
import { cx, len, useControllable } from './utils'

export { inboxGroups, inboxCounts, inboxFilter } from '../components/inbox'
export type { MlInboxItem, MlInboxTab, MlInboxType, MlInboxGroupId } from '../components/inbox'

const NO_ITEMS: MlInboxItem[] = []

export interface InboxProps {
  items?: MlInboxItem[]
  defaultItems?: MlInboxItem[]
  onItemsChange?: (items: MlInboxItem[]) => void
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  tab?: MlInboxTab
  defaultTab?: MlInboxTab
  onTabChange?: (tab: MlInboxTab) => void
  /** Render just the panel, in the flow. */
  inline?: boolean
  /** "Now" for relative times and day groups. Defaults to the clock. */
  now?: MlTimeInput
  title?: string
  /** Default `bottom-end`. */
  placement?: 'bottom-end' | 'bottom-start'
  /** Default 360. */
  width?: number | string
  /** Default 420. */
  maxHeight?: number | string
  /** Badge cap. Default 99. */
  max?: number
  /** Default true. */
  closeOnSelect?: boolean
  onRead?: (id: MlInboxItem['id']) => void
  onReadAll?: () => void
  onDismiss?: (id: MlInboxItem['id']) => void
  onSelect?: (item: MlInboxItem) => void
  className?: string
}

export interface InboxHandle {
  show: () => void
  close: () => void
  toggle: () => void
}

export const Inbox = forwardRef<InboxHandle, InboxProps>(function Inbox(
  {
    items: itemsProp,
    defaultItems = NO_ITEMS,
    onItemsChange,
    open: openProp,
    defaultOpen = false,
    onOpenChange,
    tab: tabProp,
    defaultTab = 'all',
    onTabChange,
    inline = false,
    now: nowProp,
    title,
    placement = 'bottom-end',
    width = 360,
    maxHeight = 420,
    max = 99,
    closeOnSelect = true,
    onRead,
    onReadAll,
    onDismiss,
    onSelect,
    className,
  },
  ref,
) {
  const loc = useLocale()
  const uid = `ml-inbox-${useId().replace(/:/g, '')}`
  const [items, setItems] = useControllable(itemsProp, defaultItems, onItemsChange)
  const [open, setOpen] = useControllable(openProp, defaultOpen, onOpenChange)
  const [tab, setTab] = useControllable(tabProp, defaultTab, onTabChange)
  const now = useNow(nowProp)
  const root = useRef<HTMLDivElement>(null)
  const bell = useRef<HTMLButtonElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const body = useRef<HTMLDivElement>(null)
  const tabsEl = useRef<HTMLDivElement>(null)
  const [announce, setAnnounce] = useState('')
  const pending = useRef<(() => void) | null>(null)

  const counts = inboxCounts(items)
  const groups = inboxGroups(inboxFilter(items, tab), now)
  const showPanel = inline || open
  const time = (t: MlTimeInput) => relativeTime(t, now, loc.name, loc.relativeTime.justNow)
  const say = (text: string) => setAnnounce((a) => (a === text ? `${text} ` : text))
  const mains = () => [...(body.current?.querySelectorAll<HTMLElement>('.ml-inbox__main') ?? [])]

  // Focus moves wait for the render that puts their target in the DOM.
  useEffect(() => {
    const run = pending.current
    pending.current = null
    run?.()
  })

  const wasOpen = useRef(open)
  useEffect(() => {
    if (open && !wasOpen.current && !inline) {
      const list = mains()
      ;(list.find((el) => el.closest('.ml-inbox__item--unread')) ?? list[0] ?? panel.current)?.focus()
    }
    wasOpen.current = open
  }, [open, inline])

  function show() {
    setOpen(true)
  }
  function close(returnFocus = false) {
    if (!open) return
    setOpen(false)
    if (returnFocus) pending.current = () => bell.current?.focus()
  }
  const toggle = () => (open ? close() : show())

  useOutsidePointer(root, !inline && open, () => close())

  const live = useRef({ show, close, toggle })
  live.current = { show, close, toggle }
  useImperativeHandle(ref, () => ({ show: () => live.current.show(), close: () => live.current.close(), toggle: () => live.current.toggle() }), [])

  function onRootKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && !inline && open) {
      event.preventDefault()
      event.stopPropagation()
      close(true)
    }
  }

  function onItemSelect(item: MlInboxItem) {
    if (!item.read) {
      setItems(inboxMarkRead(items, item.id))
      onRead?.(item.id)
    }
    onSelect?.(item)
    if (!inline && closeOnSelect) close(!safeHref(item.href))
  }

  function readAll() {
    if (!counts.unread) return
    setItems(inboxMarkAllRead(items))
    onReadAll?.()
    say(loc.inbox.markedAll)
  }

  function dismiss(item: MlInboxItem) {
    const list = mains()
    const at = list.findIndex((el) => el.dataset.id === String(item.id))
    const nextId = (list[at + 1] ?? list[at - 1])?.dataset.id
    setItems(inboxDismiss(items, item.id))
    onDismiss?.(item.id)
    say(loc.inbox.dismissed(item.title))
    pending.current = () => (mains().find((el) => el.dataset.id === nextId) ?? panel.current)?.focus()
  }

  function onTabsKeydown(event: KeyboardEvent) {
    const next = tabMove(INBOX_TABS.indexOf(tab), event.key, INBOX_TABS.length)
    if (next === null) return
    event.preventDefault()
    setTab(INBOX_TABS[next])
    pending.current = () => tabsEl.current?.querySelector<HTMLElement>(`[data-tab="${INBOX_TABS[next]}"]`)?.focus()
  }

  function onListKeydown(event: KeyboardEvent) {
    const list = mains()
    if (!list.length) return
    const current = (event.target as Element).closest('.ml-inbox__item')?.querySelector<HTMLElement>('.ml-inbox__main')
    const at = current ? list.indexOf(current) : -1
    let next = -1
    if (event.key === 'ArrowDown') next = Math.min(list.length - 1, at + 1)
    else if (event.key === 'ArrowUp') next = Math.max(0, at - 1)
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = list.length - 1
    else if (event.key === 'Delete' && at >= 0) {
      event.preventDefault()
      const item = items.find((i) => String(i.id) === list[at].dataset.id)
      if (item) dismiss(item)
      return
    } else return
    event.preventDefault()
    list[next]?.focus()
  }

  function renderMain(item: MlInboxItem) {
    const href = safeHref(item.href)
    const type = item.type ?? 'info'
    const inner: ReactNode = (
      <>
        {item.avatar ? (
          <Avatar className="ml-inbox__avatar" size="sm" ring="steel" src={item.avatar} />
        ) : (
          <span className="ml-inbox__icon" role="img" aria-label={loc.inbox.types[type]}>
            <CuteIcon name={INBOX_TYPE_ICON[type]} />
          </span>
        )}
        <span className="ml-inbox__text">
          <span className="ml-inbox__item-title">{item.title}</span>
          {item.body && <span className="ml-inbox__item-body">{item.body}</span>}
          <time className="ml-inbox__time" dateTime={toIso(item.time)}>
            {time(item.time)}
          </time>
        </span>
        {!item.read && (
          <span className="ml-inbox__dot">
            <span className="ml-visually-hidden">{loc.inbox.unread}</span>
          </span>
        )}
      </>
    )
    return href ? (
      <a href={href} className="ml-inbox__main" data-id={String(item.id)} onClick={() => onItemSelect(item)}>
        {inner}
      </a>
    ) : (
      <button type="button" className="ml-inbox__main" data-id={String(item.id)} onClick={() => onItemSelect(item)}>
        {inner}
      </button>
    )
  }

  return (
    <div ref={root} className={cx('ml-inbox', { 'ml-inbox--inline': inline, 'ml-inbox--open': !inline && open }, className)} onKeyDown={onRootKeydown}>
      {!inline && (
        <button
          ref={bell}
          type="button"
          className={cx('ml-inbox__bell', { 'ml-inbox__bell--unread': counts.unread > 0 })}
          aria-label={loc.inbox.open(counts.unread)}
          aria-haspopup="dialog"
          aria-expanded={open ? 'true' : 'false'}
          aria-controls={open ? `${uid}-panel` : undefined}
          onClick={toggle}
        >
          <Icon name="bell" className="ml-inbox__bell-icon" />
          {counts.unread > 0 && (
            <span className="ml-inbox__badge" aria-hidden="true">
              {inboxBadge(counts.unread, max)}
            </span>
          )}
        </button>
      )}
      {showPanel && (
        <div
          id={`${uid}-panel`}
          ref={panel}
          className={cx('ml-inbox__panel', !inline && `ml-inbox__panel--${placement}`)}
          role={inline ? 'region' : 'dialog'}
          aria-labelledby={`${uid}-title`}
          tabIndex={-1}
          style={{ '--_ib-w': len(width), '--_ib-h': len(maxHeight) } as CSSProperties}
        >
          <header className="ml-inbox__head">
            <h2 id={`${uid}-title`} className="ml-inbox__title">
              {title ?? loc.inbox.label}
            </h2>
            <button type="button" className="ml-inbox__read-all" disabled={!counts.unread} onClick={readAll}>
              {loc.inbox.readAll}
            </button>
          </header>
          <div ref={tabsEl} className="ml-inbox__tabs" role="tablist" aria-label={title ?? loc.inbox.label} onKeyDown={onTabsKeydown}>
            {INBOX_TABS.map((t) => (
              <button
                id={`${uid}-tab-${t}`}
                key={t}
                type="button"
                role="tab"
                data-tab={t}
                className={cx('ml-inbox__tab', { 'ml-inbox__tab--active': t === tab })}
                aria-selected={t === tab ? 'true' : 'false'}
                aria-controls={`${uid}-body`}
                tabIndex={t === tab ? 0 : -1}
                onClick={() => setTab(t)}
              >
                <span className="ml-inbox__tab-label">{loc.inbox.tabs[t]}</span>
                <span className="ml-inbox__count">{counts[t]}</span>
              </button>
            ))}
          </div>
          <div id={`${uid}-body`} ref={body} className="ml-inbox__body" role="tabpanel" aria-labelledby={`${uid}-tab-${tab}`} onKeyDown={onListKeydown}>
            {groups.length ? (
              groups.map((g) => (
                <section key={g.id} className="ml-inbox__group" aria-labelledby={`${uid}-g-${g.id}`}>
                  <h3 id={`${uid}-g-${g.id}`} className="ml-inbox__group-title">
                    {loc.inbox.groups[g.id]}
                  </h3>
                  <ul className="ml-inbox__list">
                    {g.items.map((item) => (
                      <li key={item.id} className={cx('ml-inbox__item', `ml-inbox__item--${item.type ?? 'info'}`, { 'ml-inbox__item--unread': !item.read })}>
                        {renderMain(item)}
                        <button type="button" className="ml-inbox__dismiss" aria-label={loc.inbox.dismiss(item.title)} title={loc.inbox.dismiss(item.title)} onClick={() => dismiss(item)}>
                          <Icon name="close" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              ))
            ) : (
              <Empty size="sm" title={loc.inbox.empty[tab]} />
            )}
          </div>
          <p className="ml-visually-hidden" aria-live="polite">
            {announce}
          </p>
        </div>
      )}
    </div>
  )
})
