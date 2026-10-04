import { forwardRef, useEffect, useId, useImperativeHandle, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import type { CuteIconName, MlCuteIconVariant } from '../components/cute-icons'
import {
  STICKER_TAB_ICONS,
  STICKER_TABS,
  OFFSCREEN,
  gridMove,
  popupPosition,
  loadRecent,
  pushRecent,
  saveRecent,
  searchStickers,
  stickerGroup,
  tabMove,
  type StickerGroupId,
} from '../components/stickers'
import { Icon } from './basic'
import { CuteIcon } from './cute-icon'
import { useLocale } from './locale'
import { cx, useControllable } from './utils'

export { STICKER_KEYWORDS, searchStickers, stickerMatches } from '../components/stickers'
export type { StickerGroupId } from '../components/stickers'

export interface StickerPickerProps {
  /** How the stickers are drawn. Default `color`. */
  variant?: MlCuteIconVariant
  /** Sticker size in px. Default 32. */
  size?: number
  /** Stickers per row. Default 6. */
  columns?: number
  /** Show a button that opens the picker in a popover. */
  trigger?: boolean
  /** Popover side, trigger mode only. Default `top`. */
  placement?: 'top' | 'bottom'
  /** Popover edge lined up with the button. Default `start`. */
  align?: 'start' | 'end'
  /** The sticker on the trigger button. Default `lion`. */
  triggerIcon?: CuteIconName
  /** Show the "recent" tab. Default true. */
  recent?: boolean
  /** How many recent stickers to keep. Default 16. */
  recentLimit?: number
  /** Remember recent stickers in localStorage under this key. */
  storageKey?: string
  /** Close the popover after picking. Default true. */
  closeOnSelect?: boolean
  disabled?: boolean
  label?: string
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  onSelect?: (name: CuteIconName) => void
  className?: string
}

export interface StickerPickerHandle {
  show: () => void
  close: () => void
  focus: () => void
}

export const StickerPicker = forwardRef<StickerPickerHandle, StickerPickerProps>(function StickerPicker(
  {
    variant = 'color',
    size = 32,
    columns = 6,
    trigger = false,
    placement = 'top',
    align = 'start',
    triggerIcon = 'lion',
    recent = true,
    recentLimit = 16,
    storageKey,
    closeOnSelect = true,
    disabled = false,
    label,
    open: openProp,
    defaultOpen = false,
    onOpenChange,
    onSelect,
    className,
  },
  ref,
) {
  const loc = useLocale()
  const panelId = `ml-sticker-${useId().replace(/:/g, '')}`
  const [open, setOpen] = useControllable(openProp, defaultOpen, onOpenChange)
  const root = useRef<HTMLElement>(null)
  const triggerEl = useRef<HTMLButtonElement>(null)
  const inputEl = useRef<HTMLInputElement>(null)
  const gridEl = useRef<HTMLDivElement>(null)
  const tabsEl = useRef<HTMLDivElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ left: string; top: string } | undefined>()
  const [side, setSide] = useState<'top' | 'bottom'>(placement)

  const [tab, setTab] = useState<StickerGroupId>('animals')
  const [query, setQuery] = useState('')
  const [recentList, setRecentList] = useState<CuteIconName[]>([])
  const [focusIdx, setFocusIdx] = useState(0)
  const [announce, setAnnounce] = useState('')
  const pendingFocus = useRef<{ kind: 'item' | 'tab' | 'input' | 'trigger'; key?: string | number } | null>(null)

  const tabs = recent ? STICKER_TABS : STICKER_TABS.filter((t) => t !== 'recent')
  const searching = query.trim() !== ''
  const names = searching ? searchStickers(query, loc.sticker.names) : stickerGroup(tab, recentList)
  const tabLabel = (t: StickerGroupId) => (t === 'recent' ? loc.sticker.recent : loc.sticker.groups[t])
  const heading = searching ? loc.sticker.results(names.length) : tabLabel(tab)
  const empty = searching ? loc.sticker.noMatch : loc.sticker.noRecent
  const showPanel = !trigger || open

  useEffect(() => {
    if (storageKey) setRecentList(loadRecent(storageKey).slice(0, recentLimit))
    // Only on mount, like the Vue twin.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Focus moves wait for the render that puts the target in the DOM.
  useEffect(() => {
    const p = pendingFocus.current
    if (!p) return
    pendingFocus.current = null
    if (p.kind === 'item') gridEl.current?.querySelector<HTMLElement>(`[data-index="${p.key}"]`)?.focus()
    else if (p.kind === 'tab') tabsEl.current?.querySelector<HTMLElement>(`[data-tab="${p.key}"]`)?.focus()
    else if (p.kind === 'input') inputEl.current?.focus({ preventScroll: true })
    else triggerEl.current?.focus()
  })

  const resetFocus = () => setFocusIdx(0)

  function focusItem(i: number) {
    setFocusIdx(i)
    pendingFocus.current = { kind: 'item', key: i }
    gridEl.current?.querySelector<HTMLElement>(`[data-index="${i}"]`)?.focus()
  }

  function selectTab(t: StickerGroupId) {
    setTab(t)
    setQuery('')
    setAnnounce('')
    resetFocus()
  }

  function onQuery(value: string) {
    setQuery(value)
    resetFocus()
    setAnnounce(value.trim() ? loc.sticker.results(searchStickers(value, loc.sticker.names).length) : '')
  }

  function show() {
    if (disabled) return
    setOpen(true)
    pendingFocus.current = { kind: 'input' }
  }
  function close(returnFocus = false) {
    if (!(openProp ?? open)) return
    setOpen(false)
    if (returnFocus) {
      pendingFocus.current = { kind: 'trigger' }
      triggerEl.current?.focus()
    }
  }

  function pick(name: CuteIconName) {
    const next = pushRecent(recentList, name, recentLimit)
    setRecentList(next)
    saveRecent(storageKey, next)
    onSelect?.(name)
    if (trigger && closeOnSelect) close(true)
  }

  function onGridKeydown(event: KeyboardEvent) {
    const next = gridMove(focusIdx, event.key, names.length, columns)
    if (next === null) return
    event.preventDefault()
    focusItem(next)
  }

  function onTabsKeydown(event: KeyboardEvent) {
    const next = tabMove(tabs.indexOf(tab), event.key, tabs.length)
    if (next === null) return
    event.preventDefault()
    selectTab(tabs[next])
    pendingFocus.current = { kind: 'tab', key: tabs[next] }
  }

  function onSearchKeydown(event: KeyboardEvent) {
    if (event.key === 'ArrowDown' && names.length) {
      event.preventDefault()
      focusItem(0)
    } else if (event.key === 'Enter' && searching && names.length && !event.nativeEvent.isComposing) {
      event.preventDefault()
      pick(names[0])
    }
  }

  function onRootKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && trigger && open) {
      event.preventDefault()
      event.stopPropagation()
      close(true)
    }
  }

  // Trigger mode: the panel is portalled to <body> and placed with fixed coordinates.
  const popup = trigger && open
  const placeRef = useRef(() => {})
  placeRef.current = () => {
    const t = triggerEl.current
    const p = panel.current
    if (!t || !p) return
    const at = popupPosition(t.getBoundingClientRect(), { width: p.offsetWidth, height: p.offsetHeight }, { width: window.innerWidth, height: window.innerHeight }, placement, align)
    setSide(at.placement)
    setPos({ left: `${at.left}px`, top: `${at.top}px` })
  }
  const closeRef = useRef(close)
  closeRef.current = close
  useLayoutEffect(() => {
    if (!popup) return
    placeRef.current()
    const place = () => placeRef.current()
    const onOutside = (event: Event) => {
      const target = event.target as Node
      if (!root.current?.contains(target) && !panel.current?.contains(target)) closeRef.current()
    }
    document.addEventListener('pointerdown', onOutside)
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      document.removeEventListener('pointerdown', onOutside)
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [popup])

  const live = useRef({ show, close, trigger })
  live.current = { show, close, trigger }
  useImperativeHandle(
    ref,
    () => ({
      show: () => live.current.show(),
      close: () => live.current.close(),
      focus: () => (live.current.trigger ? triggerEl.current?.focus() : inputEl.current?.focus()),
    }),
    [],
  )

  const Root = trigger ? 'span' : 'div'
  const portal = (el: React.ReactElement) => (trigger && typeof document !== 'undefined' ? createPortal(el, document.body) : el)
  return (
    <Root
      ref={root as React.RefObject<HTMLDivElement & HTMLSpanElement>}
      className={cx('ml-sticker-picker', { 'ml-sticker-picker--trigger': trigger, 'ml-sticker-picker--open': trigger && open }, className)}
      style={{ '--_sp-cols': columns, '--_sp-size': `${size}px` } as CSSProperties}
      onKeyDown={onRootKeydown}
    >
      {trigger && (
        <button
          ref={triggerEl}
          type="button"
          className="ml-sticker-picker__trigger"
          aria-label={loc.sticker.open}
          aria-expanded={open ? 'true' : 'false'}
          aria-haspopup="dialog"
          aria-controls={open ? panelId : undefined}
          disabled={disabled}
          onClick={() => (open ? close() : show())}
        >
          <CuteIcon name={triggerIcon} variant={variant} />
        </button>
      )}
      {showPanel && portal(
        <div
          id={panelId}
          ref={panel}
          className={cx('ml-sticker-picker__panel', trigger && 'ml-sticker-picker__panel--popup', trigger && `ml-sticker-picker__panel--${side}`)}
          style={{ ...({ '--_sp-cols': columns, '--_sp-size': `${size}px` } as CSSProperties), ...(trigger ? (pos ?? OFFSCREEN) : undefined) }}
          role={trigger ? 'dialog' : 'group'}
          aria-label={label ?? loc.sticker.label}
          onKeyDown={onRootKeydown}
        >
          <label className="ml-sticker-picker__search">
            <Icon name="search" className="ml-sticker-picker__search-icon" />
            <input
              ref={inputEl}
              value={query}
              onChange={(e) => onQuery(e.target.value)}
              type="search"
              className="ml-sticker-picker__input"
              placeholder={loc.sticker.search}
              aria-label={loc.sticker.search}
              autoComplete="off"
              onKeyDown={onSearchKeydown}
            />
          </label>
          <div ref={tabsEl} className="ml-sticker-picker__tabs" role="tablist" aria-label={label ?? loc.sticker.label} onKeyDown={onTabsKeydown}>
            {tabs.map((t) => (
              <button
                id={`${panelId}-tab-${t}`}
                key={t}
                type="button"
                role="tab"
                data-tab={t}
                className={cx('ml-sticker-picker__tab', { 'ml-sticker-picker__tab--active': t === tab && !searching })}
                aria-selected={t === tab ? 'true' : 'false'}
                aria-controls={`${panelId}-body`}
                tabIndex={t === tab ? 0 : -1}
                title={tabLabel(t)}
                onClick={() => selectTab(t)}
              >
                {t === 'recent' ? (
                  <Icon name="clock" className="ml-sticker-picker__tab-icon" />
                ) : (
                  <CuteIcon name={STICKER_TAB_ICONS[t]} variant={variant} className="ml-sticker-picker__tab-icon" />
                )}
                <span className="ml-visually-hidden">{tabLabel(t)}</span>
              </button>
            ))}
          </div>
          <div id={`${panelId}-body`} className="ml-sticker-picker__body" role="tabpanel" aria-labelledby={`${panelId}-tab-${tab}`}>
            <p className="ml-sticker-picker__heading" aria-hidden="true">
              {heading}
            </p>
            {names.length ? (
              <div ref={gridEl} className="ml-sticker-picker__grid" role="group" aria-label={heading} onKeyDown={onGridKeydown}>
                {names.map((n, i) => (
                  <button
                    key={n}
                    type="button"
                    className="ml-sticker-picker__item"
                    data-index={i}
                    data-name={n}
                    tabIndex={i === focusIdx ? 0 : -1}
                    aria-label={loc.sticker.names[n]}
                    title={loc.sticker.names[n]}
                    onClick={() => pick(n)}
                    onFocus={() => setFocusIdx(i)}
                  >
                    <CuteIcon name={n} variant={variant} />
                  </button>
                ))}
              </div>
            ) : (
              <p className="ml-sticker-picker__empty">{empty}</p>
            )}
          </div>
          <p className="ml-visually-hidden" aria-live="polite">
            {announce}
          </p>
        </div>,
      )}
    </Root>
  )
})
