import {
  Children,
  Fragment,
  forwardRef,
  isValidElement,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
  useSyncExternalStore,
  version,
  type CSSProperties,
  type ElementType,
  type FocusEvent,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import type { MlKanbanColumn } from '../types'
import { safeHref } from '../url'
import { Button, Icon, Loader, Paw } from './basic'
import { useLocale } from './locale'
import { lockScroll, unlockScroll, useTransition } from './overlay'
import { cx, len, useControllable } from './utils'

type Key = string | number
const cleanId = (id: string) => id.replace(/[^\w-]/g, '')
const noop = () => () => {}
const useClient = () => useSyncExternalStore(noop, () => true, () => false)
// React 19 treats `inert` as a boolean; React 18 only passes it through as a string.
const inert = (on: boolean) => (on ? ({ inert: parseInt(version) >= 19 ? true : '' } as object) : {})

/* ── Layout ────────────────────────────────────────────── */

export interface LayoutHandle {
  /** Rail on desktop, drawer on mobile. */
  toggleAside: () => void
}
export interface LayoutHeaderContext {
  toggleAside: () => void
  collapsed: boolean
  mobile: boolean
}

export interface LayoutProps {
  asideWidth?: string
  asideCollapsedWidth?: string
  asideRight?: boolean
  stickyHeader?: boolean
  /** Below this viewport width (px) the sidebar becomes a slide-over drawer. */
  breakpoint?: number
  fullHeight?: boolean
  collapsed?: boolean
  defaultCollapsed?: boolean
  onCollapsedChange?: (collapsed: boolean) => void
  asideOpen?: boolean
  defaultAsideOpen?: boolean
  onAsideOpenChange?: (open: boolean) => void
  header?: ReactNode | ((ctx: LayoutHeaderContext) => ReactNode)
  aside?: ReactNode | ((ctx: { collapsed: boolean; mobile: boolean }) => ReactNode)
  footer?: ReactNode
  children?: ReactNode
}

export const Layout = forwardRef<LayoutHandle, LayoutProps>(function Layout(
  {
    asideWidth = '248px',
    asideCollapsedWidth = '64px',
    asideRight,
    stickyHeader = true,
    breakpoint = 768,
    fullHeight = true,
    collapsed: collapsedProp,
    defaultCollapsed = false,
    onCollapsedChange,
    asideOpen: asideOpenProp,
    defaultAsideOpen = false,
    onAsideOpenChange,
    header,
    aside,
    footer,
    children,
  },
  ref,
) {
  const [collapsed, setCollapsed] = useControllable(collapsedProp, defaultCollapsed, onCollapsedChange)
  const [asideOpen, setAsideOpen] = useControllable(asideOpenProp, defaultAsideOpen, onAsideOpenChange)
  const [mobile, setMobile] = useState(false)
  const wasMobile = useRef(false)

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const query = window.matchMedia(`(max-width: ${breakpoint - 0.02}px)`)
    const sync = () => setMobile(query.matches)
    sync()
    query.addEventListener('change', sync)
    return () => query.removeEventListener('change', sync)
  }, [breakpoint])
  // Leaving mobile closes the drawer so it doesn't pop back later.
  useEffect(() => {
    if (wasMobile.current && !mobile) setAsideOpen(false)
    wasMobile.current = mobile
  }, [mobile])

  const toggleAside = () => (mobile ? setAsideOpen(!asideOpen) : setCollapsed(!collapsed))
  useImperativeHandle(ref, () => ({ toggleAside }))

  function onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape' && mobile && asideOpen) {
      event.stopPropagation()
      setAsideOpen(false)
    }
  }

  const hasAside = aside != null && aside !== false
  return (
    <div
      className={cx('ml-layout', {
        'ml-layout--full': fullHeight,
        'ml-layout--right': asideRight,
        'ml-layout--collapsed': collapsed && !mobile,
        'ml-layout--mobile': mobile,
        'ml-layout--aside-open': mobile && asideOpen,
        'ml-layout--sticky': stickyHeader,
        'ml-layout--no-aside': !hasAside,
      })}
      style={{ '--ml-layout-aside': asideWidth, '--ml-layout-rail': asideCollapsedWidth } as CSSProperties}
      onKeyDown={onKeyDown}
    >
      {header != null && header !== false && (
        <header className="ml-layout__header">{typeof header === 'function' ? header({ toggleAside, collapsed, mobile }) : header}</header>
      )}
      {hasAside && (
        <aside className="ml-layout__aside" {...inert(mobile && !asideOpen)}>
          {typeof aside === 'function' ? aside({ collapsed: collapsed && !mobile, mobile }) : aside}
        </aside>
      )}
      {hasAside && <div className="ml-layout__scrim" aria-hidden="true" onClick={() => setAsideOpen(false)} />}
      <main className="ml-layout__main">{children}</main>
      {footer != null && footer !== false && <footer className="ml-layout__footer">{footer}</footer>}
    </div>
  )
})

/* ── Grid ──────────────────────────────────────────────── */

export interface GridProps {
  /** Fixed column count. Ignored when `minItemWidth` is set. */
  cols?: number
  /** Fit as many columns as possible, each at least this wide. */
  minItemWidth?: string
  gap?: 'sm' | 'md' | 'lg' | number | string
  /** Stack into one column when the grid itself is narrower than 560px. */
  stack?: boolean
  as?: ElementType
  children?: ReactNode
}

const GRID_GAPS: Record<string, string> = { sm: '10px', md: '16px', lg: '24px' }

export function Grid({ cols = 12, minItemWidth, gap = 'md', stack = true, as: Tag = 'div', children }: GridProps) {
  const style = {
    '--ml-grid-cols': minItemWidth ? undefined : cols,
    '--ml-grid-min': minItemWidth,
    '--ml-grid-gap': typeof gap === 'number' ? `${gap}px` : GRID_GAPS[gap] ?? gap,
  } as CSSProperties
  return (
    <div className={cx('ml-grid-wrap', { 'ml-grid-wrap--stack': stack })}>
      <Tag className={cx('ml-grid', { 'ml-grid--auto': minItemWidth })} style={style}>
        {children}
      </Tag>
    </div>
  )
}

export interface GridItemProps {
  span?: number
  /** Start at this column (1-based). */
  offset?: number
  rowSpan?: number
  as?: ElementType
  children?: ReactNode
}

export function GridItem({ span, offset, rowSpan, as: Tag = 'div', children }: GridItemProps) {
  return (
    <Tag
      className="ml-grid__item"
      style={{
        gridColumn: span || offset ? `${offset ? offset : 'auto'} / span ${span ?? 1}` : undefined,
        gridRow: rowSpan ? `span ${rowSpan}` : undefined,
      }}
    >
      {children}
    </Tag>
  )
}

/* ── Space ─────────────────────────────────────────────── */

export interface SpaceProps {
  direction?: 'horizontal' | 'vertical'
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number | string
  align?: 'start' | 'center' | 'end' | 'baseline' | 'stretch'
  justify?: 'start' | 'center' | 'end' | 'between' | 'around'
  wrap?: boolean
  /** Separator between children: a hairline or a tiny paw. */
  divider?: 'line' | 'paw'
  fill?: boolean
  as?: ElementType
  children?: ReactNode
}

const SPACE_PRESETS = ['xs', 'sm', 'md', 'lg', 'xl']
/** Real children only (fragments flattened), so dividers sit between them. */
const flatten = (nodes: ReactNode): ReactNode[] =>
  Children.toArray(nodes).flatMap((n) => (isValidElement(n) && n.type === Fragment ? flatten((n.props as { children?: ReactNode }).children) : [n]))

export function Space({ direction = 'horizontal', size = 'md', align, justify, wrap = true, divider, fill, as: Tag = 'div', children }: SpaceProps) {
  const preset = SPACE_PRESETS.includes(String(size))
  const gap = typeof size === 'number' ? `${size}px` : preset ? undefined : size
  return (
    <Tag
      className={cx(
        'ml-space',
        `ml-space--${direction}`,
        preset && `ml-space--${size}`,
        align && `ml-space--align-${align}`,
        justify && `ml-space--justify-${justify}`,
        { 'ml-space--wrap': wrap && direction === 'horizontal', 'ml-space--fill': fill },
      )}
      style={gap ? ({ '--ml-space-gap': gap } as CSSProperties) : undefined}
    >
      {divider
        ? flatten(children).map((node, i) => (
            <Fragment key={i}>
              {i > 0 && <span className={cx('ml-space__divider', `ml-space__divider--${divider}`)} aria-hidden="true" />}
              {node}
            </Fragment>
          ))
        : children}
    </Tag>
  )
}

/* ── Splitter ──────────────────────────────────────────── */

export interface SplitterProps {
  direction?: 'horizontal' | 'vertical'
  /** Smallest size of the first pane, in %. */
  min?: number
  max?: number
  /** Arrow-key step, in %. */
  step?: number
  /** Size restored by double-click / Enter. */
  defaultSize?: number
  disabled?: boolean
  label?: string
  /** Size of the first pane, in %. */
  value?: number
  defaultValue?: number
  onChange?: (size: number) => void
  start?: ReactNode
  end?: ReactNode
}

export function Splitter({
  direction = 'horizontal',
  min = 10,
  max = 90,
  step = 2,
  defaultSize = 50,
  disabled,
  label,
  value,
  defaultValue = 50,
  onChange,
  start,
  end,
}: SplitterProps) {
  const loc = useLocale()
  const [size, setSize] = useControllable(value, defaultValue, onChange)
  const root = useRef<HTMLDivElement>(null)
  const dragRef = useRef(false)
  const [dragging, setDragging] = useState(false)
  const horizontal = direction === 'horizontal'
  const clamp = (v: number) => Math.min(max, Math.max(min, v))

  const stop = () => {
    if (!dragRef.current) return
    dragRef.current = false
    setDragging(false)
    document.documentElement.style.cursor = ''
  }
  useEffect(() => () => {
    if (dragRef.current) document.documentElement.style.cursor = ''
  }, [])

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (disabled || event.button !== 0) return
    event.preventDefault()
    dragRef.current = true
    setDragging(true)
    event.currentTarget.setPointerCapture?.(event.pointerId)
    document.documentElement.style.cursor = horizontal ? 'col-resize' : 'row-resize'
  }
  function onPointerMove(event: ReactPointerEvent) {
    if (!dragRef.current) return
    const rect = root.current?.getBoundingClientRect()
    if (!rect) return
    const ratio = horizontal ? (event.clientX - rect.left) / (rect.width || 1) : (event.clientY - rect.top) / (rect.height || 1)
    setSize(+clamp(ratio * 100).toFixed(2))
  }
  function onKeyDown(event: KeyboardEvent) {
    if (disabled) return
    let next: number | null = null
    if (event.key === (horizontal ? 'ArrowLeft' : 'ArrowUp')) next = size - step
    else if (event.key === (horizontal ? 'ArrowRight' : 'ArrowDown')) next = size + step
    else if (event.key === 'Home') next = min
    else if (event.key === 'End') next = max
    else if (event.key === 'Enter') next = defaultSize
    if (next === null) return
    event.preventDefault()
    setSize(clamp(next))
  }

  return (
    <div
      ref={root}
      className={cx('ml-splitter', `ml-splitter--${direction}`, { 'ml-splitter--dragging': dragging, 'ml-splitter--disabled': disabled })}
      style={{ '--_size': `${size}%` } as CSSProperties}
    >
      <div className="ml-splitter__pane ml-splitter__pane--start">{start}</div>
      <div
        className="ml-splitter__handle"
        role="separator"
        tabIndex={disabled ? -1 : 0}
        aria-orientation={horizontal ? 'vertical' : 'horizontal'}
        aria-valuenow={Math.round(size)}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-label={label ?? loc.splitter}
        aria-disabled={disabled || undefined}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={stop}
        onPointerCancel={stop}
        onLostPointerCapture={stop}
        onDoubleClick={() => !disabled && setSize(clamp(defaultSize))}
        onKeyDown={onKeyDown}
      >
        <span className="ml-splitter__grip" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
      </div>
      <div className="ml-splitter__pane ml-splitter__pane--end">{end}</div>
    </div>
  )
}

/* ── List ──────────────────────────────────────────────── */

export interface ListProps {
  variant?: 'plain' | 'inset'
  title?: ReactNode
  children?: ReactNode
}

export function List({ variant = 'plain', title, children }: ListProps) {
  return (
    <section className={cx('ml-list', `ml-list--${variant}`)}>
      {title && <p className="ml-list__title">{title}</p>}
      <ul className="ml-list__items" role="list">
        {children}
      </ul>
    </section>
  )
}

export interface ListItemProps {
  title: ReactNode
  subtitle?: ReactNode
  meta?: ReactNode
  badge?: number | string
  /** Makes the row a link. */
  href?: string
  /** Makes the row a button (calls onSelect). */
  clickable?: boolean
  active?: boolean
  chevron?: boolean
  leading?: ReactNode
  trailing?: ReactNode
  onSelect?: () => void
}

export function ListItem({ title, subtitle, meta, badge, href, clickable, active, chevron, leading, trailing, onSelect }: ListItemProps) {
  const Tag = href ? 'a' : clickable ? 'button' : 'div'
  return (
    <li className="ml-list-item">
      <Tag
        href={safeHref(href)}
        type={Tag === 'button' ? 'button' : undefined}
        aria-current={active ? 'page' : undefined}
        className={cx('ml-list-item__row', { 'ml-list-item__row--interactive': Tag !== 'div', 'ml-list-item__row--active': active })}
        onClick={() => Tag === 'button' && onSelect?.()}
      >
        {leading != null && leading !== false && <span className="ml-list-item__leading">{leading}</span>}
        <span className="ml-list-item__text">
          <span className="ml-list-item__title">{title}</span>
          {subtitle && <span className="ml-list-item__subtitle">{subtitle}</span>}
        </span>
        {(meta || badge !== undefined || (trailing != null && trailing !== false) || chevron) && (
          <span className="ml-list-item__trailing">
            {meta && <span className="ml-list-item__meta">{meta}</span>}
            {badge !== undefined && <span className="ml-list-item__badge">{badge}</span>}
            {trailing}
            {chevron && <Icon name="chevronRight" className="ml-list-item__chevron" />}
          </span>
        )}
      </Tag>
    </li>
  )
}

/* ── InfiniteScroll ────────────────────────────────────── */

export interface InfiniteScrollProps {
  /** Parent is fetching; no new onLoad until it turns false. */
  loading?: boolean
  /** Nothing more to load; shows the end marker. */
  finished?: boolean
  /** Fire onLoad when the end is this many px away. */
  distance?: number
  /** Scrolling ancestor to watch; defaults to the page. Element or CSS selector. */
  container?: HTMLElement | string
  loadingText?: string
  finishedText?: string
  /** Show a "load more" button instead of loading automatically. */
  manual?: boolean
  onLoad?: () => void
  /** Replaces the default end marker (the Vue `finished` slot). */
  finishedContent?: ReactNode
  /** Replaces the default loader (the Vue `loading` slot). */
  loadingContent?: ReactNode
  children?: ReactNode
}

export function InfiniteScroll({ loading, finished, distance = 200, container, loadingText, finishedText, manual, onLoad, finishedContent, loadingContent, children }: InfiniteScrollProps) {
  const loc = useLocale()
  const sentinel = useRef<HTMLDivElement>(null)
  const visible = useRef(false)
  const live = useRef({ loading, finished, manual, onLoad })
  live.current = { loading, finished, manual, onLoad }
  const maybeLoad = () => {
    const p = live.current
    if (visible.current && !p.loading && !p.finished && !p.manual) p.onLoad?.()
  }

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined' || !sentinel.current) return
    const root = typeof container === 'string' ? document.querySelector(container) : (container ?? null)
    const observer = new IntersectionObserver(
      ([entry]) => {
        visible.current = entry.isIntersecting
        maybeLoad()
      },
      { root, rootMargin: `0px 0px ${distance}px 0px` },
    )
    observer.observe(sentinel.current)
    return () => observer.disconnect()
  }, [container, distance])

  // After a page loads, keep going while the sentinel is still on screen.
  const wasLoading = useRef(loading)
  useEffect(() => {
    const was = wasLoading.current
    wasLoading.current = loading
    if (!was || loading) return
    const raf = requestAnimationFrame(maybeLoad)
    return () => cancelAnimationFrame(raf)
  }, [loading])

  return (
    <div className="ml-infinite">
      {children}
      <div ref={sentinel} className="ml-infinite__foot" aria-live="polite">
        {finished ? (
          finishedContent ?? (
            <span className="ml-infinite__end">
              <Paw tone="steel" />
              {finishedText ?? loc.infinite.finished}
              <Paw tone="steel" />
            </span>
          )
        ) : loading ? (
          loadingContent ?? <Loader variant="paws" size={32} label={loadingText ?? loc.infinite.loading} />
        ) : manual ? (
          <Button variant="outline" size="sm" onClick={() => onLoad?.()}>
            {loc.infinite.more}
          </Button>
        ) : null}
      </div>
    </div>
  )
}

/* ── Carousel ──────────────────────────────────────────── */

export interface CarouselProps<T> {
  items: T[]
  /** ms between slides; 0 turns autoplay off. */
  autoplay?: number
  loop?: boolean
  arrows?: boolean
  indicators?: boolean
  height?: number | string
  label?: string
  index?: number
  defaultIndex?: number
  onIndexChange?: (index: number) => void
  /** Slide content. */
  children?: (item: T, index: number, active: boolean) => ReactNode
}

export function Carousel<T>({
  items,
  autoplay = 0,
  loop = true,
  arrows = true,
  indicators = true,
  height = 280,
  label,
  index: indexProp,
  defaultIndex = 0,
  onIndexChange,
  children,
}: CarouselProps<T>) {
  const loc = useLocale()
  const id = `ml-carousel-${cleanId(useId())}`
  const root = useRef<HTMLElement>(null)
  const [index, setIndex] = useControllable(indexProp, defaultIndex, onIndexChange)
  const total = items.length
  const [userPaused, setUserPaused] = useState(false)
  const [hovering, setHovering] = useState(false)
  const [focused, setFocused] = useState(false)
  const playing = autoplay > 0 && !userPaused && !hovering && !focused && total > 1
  const canPrev = loop || index > 0
  const canNext = loop || index < total - 1

  const go = (to: number) => {
    if (!total) return
    setIndex(loop ? (to + total) % total : Math.min(total - 1, Math.max(0, to)))
  }
  const prev = () => canPrev && go(index - 1)
  const next = () => canNext && go(index + 1)
  const tick = useRef(() => {})
  tick.current = () => (!loop && index >= total - 1 ? go(0) : next())

  useEffect(() => {
    if (!playing) return
    const timer = setInterval(() => tick.current(), autoplay)
    return () => clearInterval(timer)
  }, [playing, index, autoplay])

  function onKeyDown(event: KeyboardEvent) {
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      prev()
    } else if (event.key === 'ArrowRight') {
      event.preventDefault()
      next()
    }
  }
  function onBlur(event: FocusEvent) {
    if (!root.current?.contains(event.relatedTarget as Node | null)) setFocused(false)
  }

  // Swipe / drag
  const [dragX, setDragX] = useState(0)
  const start = useRef<{ x: number; y: number; id: number } | null>(null)
  function onPointerDown(event: ReactPointerEvent) {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    start.current = { x: event.clientX, y: event.clientY, id: event.pointerId }
  }
  function onPointerMove(event: ReactPointerEvent) {
    const s = start.current
    if (!s || event.pointerId !== s.id) return
    const dx = event.clientX - s.x
    if (Math.abs(dx) > Math.abs(event.clientY - s.y)) setDragX(dx)
  }
  function onPointerUp() {
    if (!start.current) return
    const width = root.current?.clientWidth ?? 1
    if (dragX < -width * 0.18) next()
    else if (dragX > width * 0.18) prev()
    setDragX(0)
    start.current = null
  }

  return (
    <section
      ref={root}
      className="ml-carousel"
      aria-roledescription="carousel"
      aria-label={label ?? loc.carousel.label}
      style={{ '--_h': len(height) } as CSSProperties}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onFocus={() => setFocused(true)}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
    >
      <div
        className="ml-carousel__viewport"
        aria-live={playing ? 'off' : 'polite'}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        <div className="ml-carousel__track" style={{ transform: `translateX(calc(${-index * 100}% + ${dragX}px))`, transition: dragX ? 'none' : undefined }}>
          {items.map((item, i) => (
            <div
              key={i}
              id={`${id}-slide-${i}`}
              className="ml-carousel__slide"
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} / ${total}`}
              aria-hidden={i !== index || undefined}
              {...inert(i !== index)}
            >
              {children?.(item, i, i === index)}
            </div>
          ))}
        </div>
      </div>

      {arrows && total > 1 && (
        <>
          <button type="button" className="ml-carousel__arrow ml-carousel__arrow--prev" aria-label={loc.carousel.prev} aria-controls={`${id}-slide-${index}`} disabled={!canPrev} onClick={prev}>
            <Icon name="chevronLeft" />
          </button>
          <button type="button" className="ml-carousel__arrow ml-carousel__arrow--next" aria-label={loc.carousel.next} aria-controls={`${id}-slide-${index}`} disabled={!canNext} onClick={next}>
            <Icon name="chevronRight" />
          </button>
        </>
      )}

      {(indicators || autoplay > 0) && total > 1 && (
        <div className="ml-carousel__bar">
          {autoplay > 0 && (
            <button type="button" className="ml-carousel__play" aria-label={userPaused ? loc.carousel.play : loc.carousel.pause} onClick={() => setUserPaused(!userPaused)}>
              <Icon name={userPaused ? 'play' : 'pause'} />
            </button>
          )}
          {indicators && (
            <div className="ml-carousel__dots">
              {items.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  className={cx('ml-carousel__dot', { 'ml-carousel__dot--active': i === index })}
                  aria-label={loc.carousel.slide(i + 1)}
                  aria-current={i === index || undefined}
                  style={i === index && playing ? ({ '--_dur': `${autoplay}ms` } as CSSProperties) : undefined}
                  onClick={() => go(i)}
                >
                  <span className="ml-carousel__dot-fill" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  )
}

/* ── ImagePreview ──────────────────────────────────────── */

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), ' +
  'textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
const ZOOM_MIN = 0.25
const ZOOM_MAX = 4

export interface ImagePreviewProps {
  images: string[]
  /** Alt text per image (falls back to "圖片 n / total"). */
  alts?: string[]
  loop?: boolean
  /** Render in place instead of portalling to <body>. */
  inline?: boolean
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  index?: number
  defaultIndex?: number
  onIndexChange?: (index: number) => void
  onClose?: () => void
}

const NO_ALTS: string[] = []

export function ImagePreview({
  images,
  alts = NO_ALTS,
  loop = true,
  inline,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  index: indexProp,
  defaultIndex = 0,
  onIndexChange,
  onClose,
}: ImagePreviewProps) {
  const loc = useLocale()
  const client = useClient()
  const [open, setOpen] = useControllable(openProp, defaultOpen, onOpenChange)
  const [index, setIndex] = useControllable(indexProp, defaultIndex, onIndexChange)
  const [scale, setScale] = useState(1)
  const [rotate, setRotate] = useState(0)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const root = useRef<HTMLDivElement>(null)
  const stage = useRef<HTMLDivElement>(null)
  const { mounted, className } = useTransition(open, 'ml-preview', { enter: 260, leave: 260 })

  const total = images.length
  const current = images[index] ?? ''
  const alt = alts[index] ?? loc.preview.image(index + 1, total)
  const canPrev = total > 1 && (loop || index > 0)
  const canNext = total > 1 && (loop || index < total - 1)

  const reset = () => {
    setScale(1)
    setRotate(0)
    setOffset({ x: 0, y: 0 })
  }
  const go = (delta: 1 | -1) => {
    if (delta < 0 ? !canPrev : !canNext) return
    setIndex((index + delta + total) % total)
    reset()
  }
  const zoom = (factor: number) => {
    const next = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, +(scale * factor).toFixed(3)))
    setScale(next)
    if (next <= 1) setOffset({ x: 0, y: 0 })
  }
  const close = () => {
    setOpen(false)
    onClose?.()
  }

  useEffect(() => {
    if (!open) return
    const returnTo = document.activeElement as HTMLElement | null
    lockScroll()
    reset()
    return () => {
      unlockScroll()
      returnTo?.focus?.()
    }
  }, [open])
  useEffect(() => {
    if (open && mounted) root.current?.focus()
  }, [open, mounted, client])

  // React's wheel listener is passive; zooming needs preventDefault.
  const zoomRef = useRef(zoom)
  zoomRef.current = zoom
  useEffect(() => {
    const el = stage.current
    if (!el) return
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      zoomRef.current(event.deltaY < 0 ? 1.1 : 0.9)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [mounted, client])

  function onKeyDown(event: KeyboardEvent) {
    const actions: Record<string, () => void> = {
      Escape: close,
      ArrowLeft: () => go(-1),
      ArrowRight: () => go(1),
      '+': () => zoom(1.25),
      '=': () => zoom(1.25),
      '-': () => zoom(0.8),
      '0': reset,
      r: () => setRotate(rotate + 90),
    }
    const action = actions[event.key]
    if (action) {
      event.preventDefault()
      event.stopPropagation()
      action()
      return
    }
    if (event.key !== 'Tab' || !root.current) return
    const focusable = [...root.current.querySelectorAll<HTMLElement>(FOCUSABLE)]
    if (!focusable.length) return event.preventDefault()
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    const active = document.activeElement
    if (event.shiftKey && (active === first || active === root.current)) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && active === last) {
      event.preventDefault()
      first.focus()
    }
  }

  // Drag to pan once zoomed in.
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null)
  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (scale <= 1) return
    drag.current = { x: event.clientX, y: event.clientY, ox: offset.x, oy: offset.y }
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }
  function onPointerMove(event: ReactPointerEvent) {
    const d = drag.current
    if (d) setOffset({ x: d.ox + event.clientX - d.x, y: d.oy + event.clientY - d.y })
  }
  const onPointerUp = () => (drag.current = null)

  if (!mounted) return null
  const node = (
    <div ref={root} className={cx('ml-preview', className)} role="dialog" aria-modal="true" aria-label={loc.preview.label} tabIndex={-1} onKeyDown={onKeyDown}>
      <div className="ml-preview__backdrop" onClick={close} />
      <div
        ref={stage}
        className="ml-preview__stage"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClick={(e) => e.target === e.currentTarget && close()}
      >
        <img
          key={current}
          src={current}
          alt={alt}
          className={cx('ml-preview__img', { 'ml-preview__img--grab': scale > 1 })}
          draggable="false"
          style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale}) rotate(${rotate}deg)` }}
        />
      </div>

      {total > 1 && (
        <p className="ml-preview__counter" aria-live="polite">
          {String(index + 1).padStart(2, '0')} <span>/ {String(total).padStart(2, '0')}</span>
        </p>
      )}

      <button type="button" className="ml-preview__btn ml-preview__close" aria-label={loc.preview.close} onClick={close}>
        <Icon name="close" />
      </button>
      {total > 1 && (
        <>
          <button type="button" className="ml-preview__btn ml-preview__nav ml-preview__nav--prev" aria-label={loc.common.prev} disabled={!canPrev} onClick={() => go(-1)}>
            <Icon name="chevronLeft" />
          </button>
          <button type="button" className="ml-preview__btn ml-preview__nav ml-preview__nav--next" aria-label={loc.common.next} disabled={!canNext} onClick={() => go(1)}>
            <Icon name="chevronRight" />
          </button>
        </>
      )}

      <div className="ml-preview__toolbar" role="toolbar" aria-label={loc.preview.toolbar}>
        <button type="button" className="ml-preview__btn" aria-label={loc.preview.zoomOut} disabled={scale <= ZOOM_MIN} onClick={() => zoom(0.8)}>
          <Icon name="minus" />
        </button>
        <span className="ml-preview__zoom">{Math.round(scale * 100)}%</span>
        <button type="button" className="ml-preview__btn" aria-label={loc.preview.zoomIn} disabled={scale >= ZOOM_MAX} onClick={() => zoom(1.25)}>
          <Icon name="plus" />
        </button>
        <button type="button" className="ml-preview__btn" aria-label={loc.preview.rotate} onClick={() => setRotate(rotate + 90)}>
          <Icon name="rotate" />
        </button>
        <button type="button" className="ml-preview__btn" aria-label={loc.preview.reset} onClick={reset}>
          <Icon name="expand" />
        </button>
      </div>
    </div>
  )
  if (inline) return node
  return client ? createPortal(node, document.body) : null
}

/* ── Image ─────────────────────────────────────────────── */

export interface ImageProps {
  src: string
  alt: string
  width?: number | string
  height?: number | string
  fit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down'
  /** Native lazy loading. */
  lazy?: boolean
  /** Click to open a full-screen preview. */
  preview?: boolean
  /** Images the preview can page through; defaults to just `src`. */
  previewList?: string[]
  round?: boolean
  onLoad?: (event: Event) => void
  onError?: (event: Event) => void
  /** Shown while loading (the Vue `placeholder` slot). */
  placeholder?: ReactNode
  /** Replaces the default error state (the Vue `error` slot). */
  fallback?: ReactNode
}

export function Image({ src, alt, width, height, fit = 'cover', lazy = true, preview, previewList, round, onLoad, onError, placeholder, fallback }: ImageProps) {
  const loc = useLocale()
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading')
  const [shownSrc, setShownSrc] = useState(src)
  if (shownSrc !== src) {
    setShownSrc(src)
    setStatus('loading')
  }
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewIndex, setPreviewIndex] = useState(0)
  const img = useRef<HTMLImageElement>(null)
  const list = previewList?.length ? previewList : [src]

  // An image cached before hydration already fired its load event.
  useEffect(() => {
    if (img.current?.complete && img.current.naturalWidth) setStatus('loaded')
  }, [])

  function openPreview() {
    if (!preview || status === 'error') return
    setPreviewIndex(Math.max(0, list.indexOf(src)))
    setPreviewOpen(true)
  }

  return (
    <div
      className={cx('ml-image', `ml-image--${status}`, { 'ml-image--preview': preview && status !== 'error', 'ml-image--round': round })}
      style={{ width: len(width), height: len(height) }}
    >
      <img
        ref={img}
        src={src}
        alt={alt}
        loading={lazy ? 'lazy' : undefined}
        className="ml-image__img"
        style={{ objectFit: fit, display: status === 'error' ? 'none' : undefined }}
        onLoad={(e) => {
          setStatus('loaded')
          onLoad?.(e.nativeEvent)
        }}
        onError={(e) => {
          setStatus('error')
          onError?.(e.nativeEvent)
        }}
      />
      {status === 'loading' ? (
        <span className="ml-image__placeholder" aria-hidden="true">
          {placeholder}
        </span>
      ) : status === 'error' ? (
        <span className="ml-image__error" role="img" aria-label={loc.image.failed(alt)}>
          {fallback ?? (
            <>
              <Paw tone="steel" className="ml-image__error-paw" />
              <span>{loc.image.error}</span>
            </>
          )}
        </span>
      ) : null}
      {preview && status !== 'error' && <button type="button" className="ml-image__zoom" aria-label={loc.image.zoomIn(alt)} onClick={openPreview} />}
      {preview && <ImagePreview open={previewOpen} onOpenChange={setPreviewOpen} index={previewIndex} onIndexChange={setPreviewIndex} images={list} />}
    </div>
  )
}

/* ── Watermark ─────────────────────────────────────────── */

export interface WatermarkProps {
  /** One line per string. */
  content?: string | string[]
  /** Image drawn above the text. Needs CORS for remote URLs. */
  image?: string
  imageWidth?: number
  imageHeight?: number
  fontSize?: number
  fontWeight?: number | string
  color?: string
  /** Degrees. */
  rotate?: number
  /** [x, y] gap between marks, px. */
  gap?: [number, number]
  zIndex?: number
  children?: ReactNode
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement | null>((resolve) => {
    const img = new window.Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
}

export function Watermark({
  content = '',
  image,
  imageWidth = 64,
  imageHeight = 64,
  fontSize = 14,
  fontWeight = 600,
  color = 'rgb(240 173 47 / 0.14)',
  rotate = -22,
  gap = [120, 100],
  zIndex = 9,
  children,
}: WatermarkProps) {
  const layer = useRef<HTMLDivElement>(null)
  const [mark, setMark] = useState({ url: '', w: 0, h: 0 })
  const lines = Array.isArray(content) ? content : content ? [content] : []
  const linesKey = JSON.stringify(lines)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      const ratio = window.devicePixelRatio || 1
      const font = `${fontWeight} ${fontSize}px ${getComputedStyle(document.body).getPropertyValue('--ml-font-mono') || 'monospace'}`
      ctx.font = font
      const lineH = fontSize * 1.5
      const textW = Math.max(0, ...lines.map((l) => ctx.measureText(l).width))
      const img = image ? await loadImage(image) : null
      if (cancelled) return
      const contentW = Math.max(textW, img ? imageWidth : 0)
      const contentH = lines.length * lineH + (img ? imageHeight + (lines.length ? 8 : 0) : 0)
      if (!contentW || !contentH) return setMark({ url: '', w: 0, h: 0 })
      const w = contentW + gap[0]
      const h = contentH + gap[1]
      canvas.width = w * ratio
      canvas.height = h * ratio
      ctx.scale(ratio, ratio)
      ctx.translate(w / 2, h / 2)
      ctx.rotate((rotate * Math.PI) / 180)
      let y = -contentH / 2
      if (img) {
        ctx.drawImage(img, -imageWidth / 2, y, imageWidth, imageHeight)
        y += imageHeight + (lines.length ? 8 : 0)
      }
      ctx.font = font
      ctx.fillStyle = color
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      for (const line of lines) {
        ctx.fillText(line, 0, y + (lineH - fontSize) / 2)
        y += lineH
      }
      let url = ''
      try {
        url = canvas.toDataURL()
      } catch {
        // tainted by a non-CORS image
      }
      setMark({ url, w, h })
    })()
    return () => {
      cancelled = true
    }
  }, [linesKey, image, fontSize, fontWeight, color, rotate, gap[0], gap[1], imageWidth, imageHeight])

  const layerStyle: Record<string, string | number> = mark.url
    ? { backgroundImage: `url("${mark.url}")`, backgroundSize: `${mark.w}px ${mark.h}px`, zIndex }
    : { display: 'none' }
  const styleRef = useRef(layerStyle)
  styleRef.current = layerStyle

  // Put the mark back if someone deletes or restyles it in devtools.
  useEffect(() => {
    const el = layer.current
    const host = el?.parentElement
    if (!el || !host || typeof MutationObserver === 'undefined') return
    let observer: MutationObserver
    const guard = () => {
      observer = new MutationObserver((records) => {
        const tampered = records.some((r) => (r.type === 'childList' && [...r.removedNodes].includes(el)) || (r.type === 'attributes' && r.target === el))
        if (!tampered) return
        observer.disconnect()
        if (!host.contains(el)) host.appendChild(el)
        el.removeAttribute('hidden')
        el.setAttribute('style', Object.entries(styleRef.current).map(([k, v]) => `${k.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}:${v}`).join(';'))
        guard()
      })
      observer.observe(host, { childList: true })
      observer.observe(el, { attributes: true, attributeFilter: ['style', 'class', 'hidden'] })
    }
    guard()
    return () => observer.disconnect()
  }, [mark, zIndex])

  return (
    <div className="ml-watermark">
      {children}
      <div ref={layer} className="ml-watermark__layer" style={layerStyle as CSSProperties} aria-hidden="true" />
    </div>
  )
}

/* ── Sortable ──────────────────────────────────────────── */

interface SortableInstance {
  id: string
  group: () => string
  items: () => unknown[]
  setItems: (next: unknown[]) => void
  max: () => number | undefined
  root: () => HTMLElement | null
  vertical: () => boolean
}
interface DragState {
  active: boolean
  item: unknown
  source: SortableInstance | null
  sourceIndex: number
  target: SortableInstance | null
  targetIndex: number
  offsetX: number
  offsetY: number
}

/** Every mounted list, so lists in a group can trade items. */
const sortables = new Set<SortableInstance>()
const IDLE: DragState = { active: false, item: null, source: null, sourceIndex: -1, target: null, targetIndex: -1, offsetX: 0, offsetY: 0 }
/** The drag in progress (only ever one pointer drag at a time). */
let dragState = IDLE
const dragListeners = new Set<() => void>()
const setDrag = (patch: Partial<DragState>) => {
  dragState = { ...dragState, ...patch }
  dragListeners.forEach((l) => l())
}
const subscribeDrag = (l: () => void) => {
  dragListeners.add(l)
  return () => void dragListeners.delete(l)
}

export interface SortableChangeEvent<Item> {
  item: Item
  /** Source / target list ids. */
  from: string
  to: string
  oldIndex: number
  newIndex: number
}

export interface SortableProps<Item> {
  value?: Item[]
  defaultValue?: Item[]
  onChange?: (items: Item[]) => void
  /** Field name or function giving each item a stable key. */
  itemKey?: string | ((item: Item) => Key)
  /** Lists sharing a group name can pass items between each other. */
  group?: string
  /** Drag only by the grip on each row. */
  handle?: boolean
  direction?: 'vertical' | 'horizontal'
  /** Most items this list accepts from other lists. */
  max?: number
  disabled?: boolean
  /** Text for screen-reader announcements; defaults to the key. */
  itemLabel?: (item: Item) => string
  as?: ElementType
  className?: string
  /** A completed move (the Vue `change` event). */
  onSort?: (event: SortableChangeEvent<Item>) => void
  /** Row content. */
  children?: (item: Item, index: number) => ReactNode
  /** Shown when the list is empty. */
  empty?: ReactNode
}

type Row<Item> = { kind: 'item'; item: Item; index: number } | { kind: 'placeholder' }

export function Sortable<Item>({
  value,
  defaultValue,
  onChange,
  itemKey = 'id',
  group,
  handle,
  direction = 'vertical',
  max,
  disabled,
  itemLabel,
  as: Tag = 'ul',
  className,
  onSort,
  children,
  empty,
}: SortableProps<Item>) {
  const loc = useLocale()
  const [items, setItems] = useControllable<Item[]>(value, defaultValue ?? [], onChange)
  const root = useRef<HTMLElement>(null)
  const listId = `ml-sortable-${cleanId(useId())}`
  const [announce, setAnnounce] = useState('')
  const keyOf = (item: Item): Key => (typeof itemKey === 'function' ? itemKey(item) : ((item as Record<string, unknown>)[itemKey] as Key))
  const labelOf = (item: Item) => (itemLabel ? itemLabel(item) : String(keyOf(item)))

  const live = useRef({ items, setItems, group, max, direction, disabled, handle, listId, loc, onSort, labelOf })
  live.current = { items, setItems, group, max, direction, disabled, handle, listId, loc, onSort, labelOf }

  const [self] = useState<SortableInstance>(() => ({
    id: listId,
    group: () => live.current.group ?? live.current.listId,
    items: () => live.current.items,
    setItems: (next) => {
      live.current.items = next as Item[]
      live.current.setItems(next as Item[])
    },
    max: () => live.current.max,
    root: () => root.current,
    vertical: () => live.current.direction === 'vertical',
  }))
  self.id = listId

  const [ctl] = useState(() => {
    let ghost: HTMLElement | null = null
    let pending: { x: number; y: number; item: unknown; el: HTMLElement } | null = null

    function move(event: PointerEvent) {
      if (ghost) {
        ghost.style.left = `${event.clientX - dragState.offsetX}px`
        ghost.style.top = `${event.clientY - dragState.offsetY}px`
      }
      // Which list is under the pointer? Only lists in the same group count.
      const hit = document.elementFromPoint?.(event.clientX, event.clientY)?.closest<HTMLElement>('[data-ml-sortable]')
      const over = hit ? [...sortables].find((s) => s.root() === hit && s.group() === self.group()) : undefined
      if (!over) return
      const limit = over.max()
      if (over !== dragState.source && limit !== undefined && over.items().length >= limit) return setDrag({ target: null })
      // Insertion index: the first row whose midpoint is past the pointer.
      const rowEls = [...over.root()!.querySelectorAll<HTMLElement>(':scope > .ml-sortable__item')]
      const pos = over.vertical() ? event.clientY : event.clientX
      let index = rowEls.length
      for (let i = 0; i < rowEls.length; i++) {
        const r = rowEls[i].getBoundingClientRect()
        if (pos < (over.vertical() ? r.top + r.height / 2 : r.left + r.width / 2)) {
          index = i
          break
        }
      }
      setDrag({ target: over, targetIndex: index })
    }

    function begin(event: PointerEvent) {
      if (!pending) return
      const { el, item } = pending
      const rect = el.getBoundingClientRect()
      ghost = el.cloneNode(true) as HTMLElement
      ghost.classList.add('ml-sortable__ghost')
      Object.assign(ghost.style, { width: `${rect.width}px`, height: `${rect.height}px`, left: `${rect.left}px`, top: `${rect.top}px` })
      document.body.appendChild(ghost)
      const at = self.items().indexOf(item)
      setDrag({ active: true, item, source: self, sourceIndex: at, target: self, targetIndex: at, offsetX: pending.x - rect.left, offsetY: pending.y - rect.top })
      document.documentElement.classList.add('ml-sortable-dragging')
      move(event)
    }

    function onPointerMove(event: PointerEvent) {
      if (pending && !dragState.active) {
        // A few pixels of travel before it counts as a drag, so clicks still work.
        if (Math.hypot(event.clientX - pending.x, event.clientY - pending.y) < 5) return
        begin(event)
      }
      if (dragState.active && dragState.source === self) {
        event.preventDefault()
        move(event)
      }
    }

    function finish(commit: boolean) {
      window.removeEventListener('pointermove', onPointerMove)
      ghost?.remove()
      ghost = null
      pending = null
      document.documentElement.classList.remove('ml-sortable-dragging')
      if (!dragState.active) return
      // Swallow the click the drag-ending pointerup would also fire.
      const swallow = (event: MouseEvent) => {
        event.stopPropagation()
        event.preventDefault()
      }
      window.addEventListener('click', swallow, { capture: true, once: true })
      setTimeout(() => window.removeEventListener('click', swallow, { capture: true }), 0)
      const { source, target, item, sourceIndex, targetIndex } = dragState
      setDrag(IDLE)
      if (!commit || !source || !target) return
      if (source === target) {
        const next = source.items().filter((it) => it !== item)
        next.splice(targetIndex, 0, item)
        if (next.indexOf(item) === sourceIndex) return
        source.setItems(next)
      } else {
        source.setItems(source.items().filter((it) => it !== item))
        const next = [...target.items()]
        next.splice(targetIndex, 0, item)
        target.setItems(next)
      }
      const l = live.current
      l.onSort?.({ item: item as Item, from: source.id, to: target.id, oldIndex: sourceIndex, newIndex: targetIndex })
      setAnnounce(l.loc.sortable.moved(l.labelOf(item as Item), targetIndex + 1, target.items().length))
    }

    function onPointerUp() {
      window.removeEventListener('pointercancel', onCancel)
      finish(true)
    }
    function onCancel() {
      window.removeEventListener('pointerup', onPointerUp)
      finish(false)
    }

    function down(event: ReactPointerEvent<HTMLElement>, item: unknown) {
      const l = live.current
      if (l.disabled || event.button !== 0) return
      const target = event.target as HTMLElement
      if (l.handle && !target.closest('.ml-sortable__handle')) return
      if (!l.handle && target.closest('input, textarea, select, button, a, [contenteditable]')) return
      pending = { x: event.clientX, y: event.clientY, item, el: event.currentTarget }
      window.addEventListener('pointermove', onPointerMove)
      window.addEventListener('pointerup', onPointerUp, { once: true })
      window.addEventListener('pointercancel', onCancel, { once: true })
    }

    function unmount() {
      if (dragState.source === self) finish(false)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onCancel)
    }
    return { down, unmount }
  })

  useEffect(() => {
    sortables.add(self)
    return () => {
      sortables.delete(self)
      ctl.unmount()
    }
  }, [])

  const drag = useSyncExternalStore(subscribeDrag, () => dragState, () => IDLE)
  const isSource = drag.active && drag.source === self
  const isTarget = drag.active && drag.target === self
  const draggingKey = isSource ? keyOf(drag.item as Item) : undefined

  const rows: Row<Item>[] = items.filter((it) => !(isSource && keyOf(it) === draggingKey)).map((item) => ({ kind: 'item', item, index: items.indexOf(item) }))
  if (isTarget) rows.splice(Math.min(drag.targetIndex, rows.length), 0, { kind: 'placeholder' })

  /* Keyboard: Space picks up, arrows move, Space drops, Esc cancels */
  const [grabbed, setGrabbed] = useState<Key | null>(null)
  const snapshot = useRef<Item[]>([])

  function onHandleKeyDown(event: KeyboardEvent<HTMLButtonElement>, item: Item) {
    if (disabled) return
    const key = keyOf(item)
    const back = direction === 'vertical' ? 'ArrowUp' : 'ArrowLeft'
    const fwd = direction === 'vertical' ? 'ArrowDown' : 'ArrowRight'
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault()
      if (grabbed === key) {
        setGrabbed(null)
        setAnnounce(loc.sortable.dropped)
        const from = snapshot.current.indexOf(item)
        const to = items.indexOf(item)
        if (from !== to) onSort?.({ item, from: listId, to: listId, oldIndex: from, newIndex: to })
      } else {
        setGrabbed(key)
        snapshot.current = [...items]
        setAnnounce(loc.sortable.grabbed(labelOf(item)))
      }
    } else if (grabbed === key && (event.key === back || event.key === fwd)) {
      event.preventDefault()
      const from = items.indexOf(item)
      const to = from + (event.key === fwd ? 1 : -1)
      if (to < 0 || to >= items.length) return
      const next = [...items]
      next.splice(from, 1)
      next.splice(to, 0, item)
      self.setItems(next)
      setAnnounce(loc.sortable.moved(labelOf(item), to + 1, next.length))
      // Keep focus on the moved row's handle after re-render.
      const el = event.currentTarget
      requestAnimationFrame(() => el.focus())
    } else if (event.key === 'Escape' && grabbed === key) {
      event.preventDefault()
      self.setItems(snapshot.current)
      setGrabbed(null)
    }
  }

  return (
    <Tag
      ref={root}
      className={cx('ml-sortable', `ml-sortable--${direction}`, { 'ml-sortable--target': isTarget, 'ml-sortable--disabled': disabled, 'ml-sortable--handle': handle }, className)}
      data-ml-sortable=""
    >
      {rows.map((row) =>
        row.kind === 'placeholder' ? (
          <li key="__placeholder" className="ml-sortable__placeholder" aria-hidden="true" />
        ) : (
          <li
            key={keyOf(row.item)}
            className={cx('ml-sortable__item', { 'ml-sortable__item--grabbed': grabbed === keyOf(row.item) })}
            onPointerDown={(e) => ctl.down(e, row.item)}
          >
            {handle && (
              <button
                type="button"
                className="ml-sortable__handle"
                aria-label={loc.sortable.handle}
                aria-pressed={grabbed === keyOf(row.item)}
                aria-describedby={`${listId}-live`}
                disabled={disabled}
                onKeyDown={(e) => onHandleKeyDown(e, row.item)}
              >
                <svg viewBox="0 0 10 16" aria-hidden="true">
                  <circle cx="3" cy="3" r="1.4" />
                  <circle cx="7" cy="3" r="1.4" />
                  <circle cx="3" cy="8" r="1.4" />
                  <circle cx="7" cy="8" r="1.4" />
                  <circle cx="3" cy="13" r="1.4" />
                  <circle cx="7" cy="13" r="1.4" />
                </svg>
              </button>
            )}
            <div className="ml-sortable__content">{children?.(row.item, row.index)}</div>
          </li>
        ),
      )}
      {!rows.length && <li className="ml-sortable__empty">{empty}</li>}
      <li id={`${listId}-live`} className="ml-visually-hidden" aria-live="assertive">
        {announce}
      </li>
    </Tag>
  )
}

/* ── Kanban ────────────────────────────────────────────── */

export interface KanbanMoveEvent<Item> {
  item: Item
  /** Column keys. */
  from: string
  to: string
  newIndex: number
}

export interface KanbanProps<Item extends Record<string, any>> {
  value?: MlKanbanColumn<Item>[]
  defaultValue?: MlKanbanColumn<Item>[]
  onChange?: (columns: MlKanbanColumn<Item>[]) => void
  itemKey?: string | ((item: Item) => Key)
  itemLabel?: (item: Item) => string
  /** Drag cards only by their grip. */
  handle?: boolean
  disabled?: boolean
  onMove?: (event: KanbanMoveEvent<Item>) => void
  renderCard?: (item: Item, index: number, column: MlKanbanColumn<Item>) => ReactNode
  renderColumnActions?: (column: MlKanbanColumn<Item>) => ReactNode
  renderColumnFooter?: (column: MlKanbanColumn<Item>) => ReactNode
}

export function Kanban<Item extends Record<string, any>>({
  value,
  defaultValue,
  onChange,
  itemKey = 'id',
  itemLabel,
  handle,
  disabled,
  onMove,
  renderCard,
  renderColumnActions,
  renderColumnFooter,
}: KanbanProps<Item>) {
  const loc = useLocale()
  const [columns, setColumns] = useControllable(value, defaultValue ?? [], onChange)
  const group = `ml-kanban-${cleanId(useId())}`
  // A cross-column drop updates two columns back to back, faster than the
  // parent re-renders, so build each update on the latest copy.
  const latest = useRef(columns)
  const seen = useRef(columns)
  if (seen.current !== columns) seen.current = latest.current = columns

  const setItems = (key: string, items: Item[]) => {
    latest.current = latest.current.map((c) => (c.key === key ? { ...c, items } : c))
    setColumns(latest.current)
  }
  const onSort = (fromKey: string, e: SortableChangeEvent<Item>) => {
    const toKey = latest.current.find((c) => c.items.includes(e.item))?.key ?? fromKey
    onMove?.({ item: e.item, from: fromKey, to: toKey, newIndex: e.newIndex })
  }

  return (
    <div className="ml-kanban">
      {columns.map((column) => {
        const full = column.limit !== undefined && column.items.length >= column.limit
        return (
          <section key={column.key} className={cx('ml-kanban__col', column.tone && `ml-kanban__col--${column.tone}`)} aria-label={column.title}>
            <header className="ml-kanban__head">
              <h3 className="ml-kanban__title">{column.title}</h3>
              <span className={cx('ml-kanban__count', { 'ml-kanban__count--full': full })} title={full ? loc.kanban.full : undefined}>
                {loc.kanban.count(column.items.length, column.limit)}
              </span>
              {renderColumnActions?.(column)}
            </header>
            <Sortable<Item>
              value={column.items}
              group={group}
              itemKey={itemKey}
              itemLabel={itemLabel}
              handle={handle}
              disabled={disabled}
              max={column.limit}
              className="ml-kanban__list"
              onChange={(items) => setItems(column.key, items)}
              onSort={(e) => onSort(column.key, e)}
              empty={<p className="ml-kanban__empty">{loc.kanban.empty}</p>}
            >
              {(item, index) => <div className="ml-kanban__card">{renderCard?.(item, index, column)}</div>}
            </Sortable>
            {renderColumnFooter && <footer className="ml-kanban__foot">{renderColumnFooter(column)}</footer>}
          </section>
        )
      })}
    </div>
  )
}
