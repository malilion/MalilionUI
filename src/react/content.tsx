import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ElementType,
  type ForwardedRef,
  type PointerEvent as ReactPointerEvent,
  type ReactElement,
  type ReactNode,
  type RefAttributes,
} from 'react'
import type { MlPlacement } from '../types'
import { useLocale } from './locale'
import { cx, len, useControllable } from './utils'

// useLayoutEffect warns during SSR; fall back to useEffect there.
const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect
const reduceMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/* ── Ellipsis ──────────────────────────────────────────── */

export interface EllipsisProps {
  /** The full text. `children` can render richer content instead (end position only). */
  text?: string
  /** Lines to show before truncating. */
  lines?: number
  /** Where the "…" goes. `middle` keeps both ends of one line — file names, hashes, paths. */
  position?: 'end' | 'middle'
  /** Show the full text in a tooltip when (and only when) it is actually cut off. */
  tooltip?: boolean
  placement?: MlPlacement
  /** Tooltip content; defaults to the text / children. */
  content?: ReactNode
  /** Add an expand / collapse toggle when the text is cut off. */
  expandable?: boolean
  expanded?: boolean
  defaultExpanded?: boolean
  onExpandedChange?: (expanded: boolean) => void
  expandText?: string
  collapseText?: string
  onTruncate?: (truncated: boolean) => void
  as?: ElementType
  className?: string
  style?: CSSProperties
  children?: ReactNode
}

/** Longest "head…tail" of `text` that fits `width` (the tail wins odd characters: extensions live there). */
function fitMiddle(text: string, width: number, el: HTMLElement) {
  const chars = Array.from(text)
  const fits = (s: string) => {
    el.textContent = s
    return el.offsetWidth <= width
  }
  if (fits(text)) return undefined
  const cut = (n: number) => chars.slice(0, Math.floor(n / 2)).join('') + '…' + chars.slice(chars.length - Math.ceil(n / 2)).join('')
  let lo = 0
  let hi = chars.length - 1
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2)
    if (fits(cut(mid))) lo = mid
    else hi = mid - 1
  }
  return cut(lo)
}

export function Ellipsis({
  text,
  lines = 1,
  position = 'end',
  tooltip = true,
  placement = 'top',
  content,
  expandable = false,
  expanded: expandedProp,
  defaultExpanded = false,
  onExpandedChange,
  expandText,
  collapseText,
  onTruncate,
  as: Tag = 'span',
  className,
  style,
  children,
}: EllipsisProps) {
  const loc = useLocale()
  const [expanded, setExpanded] = useControllable(expandedProp, defaultExpanded, onExpandedChange)
  const body = useRef<HTMLSpanElement>(null)
  const measurer = useRef<HTMLSpanElement>(null)
  const [truncated, setTruncated] = useState(false)
  const [middleText, setMiddleText] = useState<string>()
  const [visible, setVisible] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const frame = useRef(0)

  const middle = position === 'middle' && lines <= 1 && text != null
  const tipOn = tooltip && truncated && !expanded
  const latest = useRef({ middle, text, lines, expanded, truncated, onTruncate })
  latest.current = { middle, text, lines, expanded, truncated, onTruncate }

  const measure = useCallback(() => {
    const el = body.current
    const l = latest.current
    if (!el || l.expanded) return
    let cut = false
    if (l.middle) {
      const width = el.clientWidth
      const next = width > 0 && measurer.current ? fitMiddle(l.text!, width, measurer.current) : undefined
      setMiddleText(next)
      cut = next !== undefined
    } else {
      setMiddleText(undefined)
      cut = l.lines > 1 ? el.scrollHeight > el.clientHeight + 1 : el.scrollWidth > el.clientWidth + 1
    }
    if (cut !== l.truncated) {
      l.truncated = cut
      setTruncated(cut)
      l.onTruncate?.(cut)
    }
  }, [])

  useEffect(() => {
    const el = body.current
    if (!el) return
    const schedule = () => {
      cancelAnimationFrame(frame.current)
      frame.current = requestAnimationFrame(measure)
    }
    let observer: ResizeObserver | undefined
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(schedule)
      observer.observe(el)
    }
    let alive = true
    document.fonts?.ready?.then(() => alive && schedule())
    return () => {
      alive = false
      observer?.disconnect()
      cancelAnimationFrame(frame.current)
      clearTimeout(timer.current)
    }
  }, [measure])

  // Re-measure after the text changes or the block collapses again.
  useIsoLayoutEffect(() => {
    if (!expanded) measure()
  }, [text, lines, position, expanded, measure])

  useEffect(() => {
    if (!tipOn) {
      clearTimeout(timer.current)
      setVisible(false)
    }
  }, [tipOn])

  const show = (immediate = false) => {
    clearTimeout(timer.current)
    if (!tipOn) return
    if (immediate) setVisible(true)
    else timer.current = setTimeout(() => setVisible(true), 120)
  }
  const hide = () => {
    clearTimeout(timer.current)
    setVisible(false)
  }

  const cutShown = middleText !== undefined && !expanded
  return (
    <Tag
      className={cx(
        'ml-ellipsis',
        lines > 1 ? 'ml-ellipsis--multi' : 'ml-ellipsis--single',
        { 'ml-ellipsis--middle': middle, 'ml-ellipsis--truncated': truncated, 'ml-ellipsis--expanded': expanded },
        className,
      )}
      style={lines > 1 ? ({ '--ml-ellipsis-lines': lines, ...style } as CSSProperties) : style}
      onMouseEnter={() => show()}
      onMouseLeave={hide}
      onFocus={() => show(true)}
      onBlur={hide}
      onKeyDown={(e: { key: string }) => e.key === 'Escape' && hide()}
    >
      <span ref={body} className="ml-ellipsis__text" tabIndex={tipOn && !expandable ? 0 : undefined}>
        {middle ? (
          <>
            {/* The shortened copy is for eyes; screen readers get the whole string */}
            {cutShown && <span aria-hidden="true">{middleText}</span>}
            <span className={cutShown ? 'ml-visually-hidden' : undefined}>{text}</span>
          </>
        ) : (
          children ?? text
        )}
      </span>
      {middle && <span ref={measurer} className="ml-ellipsis__measure" aria-hidden="true" />}
      {expandable && (truncated || expanded) && (
        <button type="button" className="ml-ellipsis__toggle" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>
          {expanded ? (collapseText ?? loc.ellipsis.collapse) : (expandText ?? loc.ellipsis.expand)}
        </button>
      )}
      {tooltip && (
        <span
          role="tooltip"
          aria-hidden="true"
          className={cx('ml-tooltip__bubble', `ml-tooltip__bubble--${placement}`, { 'ml-tooltip__bubble--visible': visible && tipOn })}
        >
          {content ?? children ?? text}
        </span>
      )}
    </Tag>
  )
}

/* ── Scrollbar ─────────────────────────────────────────── */

export interface ScrollbarHandle {
  /** Like Element.scrollTo; `behavior: 'smooth'` falls back to instant under reduced motion. */
  scrollTo: {
    (options: ScrollToOptions): void
    (left: number, top: number): void
  }
  scrollToTop: (smooth?: boolean) => void
  scrollToBottom: (smooth?: boolean) => void
  /** Recompute the thumbs (e.g. after content changed size without a resize). */
  update: () => void
  /** The native scrolling element. */
  wrap: HTMLDivElement | null
}

export interface ScrollbarProps {
  /** Fixed height: px number or any CSS length. */
  height?: number | string
  /** Grow with the content up to this height, then scroll. */
  maxHeight?: number | string
  direction?: 'vertical' | 'horizontal' | 'both'
  /** Keep the bars visible instead of fading out when idle. */
  always?: boolean
  /** Smallest thumb length in px. */
  minThumb?: number
  /** `onReachEnd` fires when the end is this many px away. */
  distance?: number
  /** Accessible name; also makes the scroll area a labelled region. */
  label?: string
  /** Extra class on the content wrapper. */
  viewClassName?: string
  onScroll?: (pos: { scrollTop: number; scrollLeft: number }) => void
  onReachEnd?: (axis: 'y' | 'x') => void
  className?: string
  style?: CSSProperties
  children?: ReactNode
}

interface Thumb {
  size: number
  offset: number
}
const NONE: Thumb = { size: 0, offset: 0 }

export const Scrollbar = forwardRef(function Scrollbar(
  { height, maxHeight, direction = 'both', always = false, minThumb = 24, distance = 20, label, viewClassName, onScroll, onReachEnd, className, style, children }: ScrollbarProps,
  ref: ForwardedRef<ScrollbarHandle>,
) {
  const wrap = useRef<HTMLDivElement>(null)
  const view = useRef<HTMLDivElement>(null)
  const trackY = useRef<HTMLDivElement>(null)
  const trackX = useRef<HTMLDivElement>(null)
  const [y, setY] = useState<Thumb>(NONE)
  const [x, setX] = useState<Thumb>(NONE)
  const [active, setActive] = useState(false)
  const [dragging, setDragging] = useState<'y' | 'x' | null>(null)
  const idle = useRef<ReturnType<typeof setTimeout>>(undefined)
  const atEnd = useRef({ y: false, x: false })
  const start = useRef({ pointer: 0, scroll: 0 })
  const geo = useRef({ y: NONE, x: NONE })
  const latest = useRef({ direction, minThumb, distance, onScroll, onReachEnd })
  latest.current = { direction, minThumb, distance, onScroll, onReachEnd }

  const update = useCallback(() => {
    const el = wrap.current
    if (!el) return
    const { direction: dir, minThumb: min } = latest.current
    const calc = (viewLen: number, contentLen: number, pos: number, track: number): Thumb => {
      if (contentLen - viewLen < 1 || viewLen <= 0) return NONE
      const size = Math.min(track, Math.max(min, (viewLen / contentLen) * track))
      const offset = (pos / (contentLen - viewLen)) * (track - size)
      return { size, offset: Math.max(0, Math.min(track - size, offset)) }
    }
    const ny = dir === 'horizontal' ? NONE : calc(el.clientHeight, el.scrollHeight, el.scrollTop, trackY.current?.clientHeight || el.clientHeight)
    const nx = dir === 'vertical' ? NONE : calc(el.clientWidth, el.scrollWidth, el.scrollLeft, trackX.current?.clientWidth || el.clientWidth)
    geo.current = { y: ny, x: nx }
    setY((p) => (p.size === ny.size && p.offset === ny.offset ? p : ny))
    setX((p) => (p.size === nx.size && p.offset === nx.offset ? p : nx))
  }, [])

  useEffect(() => {
    update()
    let observer: ResizeObserver | undefined
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => requestAnimationFrame(() => update()))
      if (wrap.current) observer.observe(wrap.current)
      if (view.current) observer.observe(view.current)
    }
    return () => {
      observer?.disconnect()
      clearTimeout(idle.current)
    }
  }, [update, direction])

  function handleScroll() {
    const el = wrap.current
    if (!el) return
    update()
    setActive(true)
    clearTimeout(idle.current)
    idle.current = setTimeout(() => setActive(false), 900)
    const l = latest.current
    l.onScroll?.({ scrollTop: el.scrollTop, scrollLeft: el.scrollLeft })
    // Fire once per arrival at the end; leaving the end zone re-arms it.
    const endY = geo.current.y.size > 0 && el.scrollTop + el.clientHeight >= el.scrollHeight - l.distance
    const endX = geo.current.x.size > 0 && el.scrollLeft + el.clientWidth >= el.scrollWidth - l.distance
    if (endY && !atEnd.current.y) l.onReachEnd?.('y')
    if (endX && !atEnd.current.x) l.onReachEnd?.('x')
    atEnd.current = { y: endY, x: endX }
  }

  function startDrag(event: ReactPointerEvent<HTMLDivElement>, ax: 'y' | 'x') {
    const el = wrap.current
    if (!el || event.button !== 0) return
    event.preventDefault()
    setDragging(ax)
    start.current = ax === 'y' ? { pointer: event.clientY, scroll: el.scrollTop } : { pointer: event.clientX, scroll: el.scrollLeft }
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }
  function onDrag(event: ReactPointerEvent<HTMLDivElement>, ax: 'y' | 'x') {
    const el = wrap.current
    if (!el || dragging !== ax) return
    const g = geo.current[ax]
    const track = (ax === 'y' ? trackY.current?.clientHeight : trackX.current?.clientWidth) || (ax === 'y' ? el.clientHeight : el.clientWidth)
    const room = track - g.size
    if (room <= 0) return
    const range = ax === 'y' ? el.scrollHeight - el.clientHeight : el.scrollWidth - el.clientWidth
    const delta = ((ax === 'y' ? event.clientY : event.clientX) - start.current.pointer) * (range / room)
    if (ax === 'y') el.scrollTop = start.current.scroll + delta
    else el.scrollLeft = start.current.scroll + delta
    update()
  }
  function endDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (!dragging) return
    setDragging(null)
    event.currentTarget.releasePointerCapture?.(event.pointerId)
  }
  function onTrack(event: ReactPointerEvent<HTMLDivElement>, ax: 'y' | 'x') {
    const el = wrap.current
    const track = event.currentTarget
    if (!el || event.button !== 0 || event.target !== track) return
    const rect = track.getBoundingClientRect()
    const at = ax === 'y' ? event.clientY - rect.top : event.clientX - rect.left
    const dir = at < geo.current[ax].offset ? -1 : 1
    const behavior: ScrollBehavior = reduceMotion() ? 'auto' : 'smooth'
    const page = dir * (ax === 'y' ? el.clientHeight : el.clientWidth) * 0.9
    if (el.scrollBy) el.scrollBy(ax === 'y' ? { top: page, behavior } : { left: page, behavior })
    else if (ax === 'y') el.scrollTop += page
    else el.scrollLeft += page
  }

  useImperativeHandle(ref, () => {
    function scrollTo(a: ScrollToOptions | number, b?: number) {
      const el = wrap.current
      if (!el) return
      const opts: ScrollToOptions = typeof a === 'number' ? { left: a, top: b } : { ...a }
      if (opts.behavior === 'smooth' && reduceMotion()) opts.behavior = 'auto'
      if (el.scrollTo) el.scrollTo(opts)
      else {
        if (opts.top != null) el.scrollTop = opts.top
        if (opts.left != null) el.scrollLeft = opts.left
      }
      update()
    }
    return {
      scrollTo: scrollTo as ScrollbarHandle['scrollTo'],
      scrollToTop: (smooth = true) => scrollTo({ top: 0, behavior: smooth ? 'smooth' : 'auto' }),
      scrollToBottom: (smooth = true) => scrollTo({ top: wrap.current?.scrollHeight ?? 0, behavior: smooth ? 'smooth' : 'auto' }),
      update,
      get wrap() {
        return wrap.current
      },
    }
  }, [update])

  const thumbEvents = (ax: 'y' | 'x') => ({
    onPointerDown: (e: ReactPointerEvent<HTMLDivElement>) => startDrag(e, ax),
    onPointerMove: (e: ReactPointerEvent<HTMLDivElement>) => onDrag(e, ax),
    onPointerUp: endDrag,
    onPointerCancel: endDrag,
  })

  return (
    <div
      className={cx(
        'ml-scrollbar',
        {
          'ml-scrollbar--always': always,
          'ml-scrollbar--active': active || dragging,
          'ml-scrollbar--dragging': dragging,
          'ml-scrollbar--has-y': y.size > 0,
          'ml-scrollbar--has-x': x.size > 0,
        },
        className,
      )}
      style={style}
    >
      <div
        ref={wrap}
        className={cx('ml-scrollbar__wrap', `ml-scrollbar__wrap--${direction}`)}
        style={{ height: len(height), maxHeight: len(maxHeight) }}
        tabIndex={y.size > 0 || x.size > 0 ? 0 : undefined}
        role={label ? 'region' : undefined}
        aria-label={label}
        onScroll={handleScroll}
      >
        <div ref={view} className={cx('ml-scrollbar__view', viewClassName)}>
          {children}
        </div>
      </div>
      {/* Decorative: the native scroll area underneath already handles keyboard, wheel, touch and screen readers */}
      {direction !== 'horizontal' && (
        <div ref={trackY} className="ml-scrollbar__track ml-scrollbar__track--y" aria-hidden="true" onPointerDown={(e) => onTrack(e, 'y')}>
          <div className="ml-scrollbar__thumb" style={{ height: `${y.size}px`, transform: `translateY(${y.offset}px)` }} {...thumbEvents('y')} />
        </div>
      )}
      {direction !== 'vertical' && (
        <div ref={trackX} className="ml-scrollbar__track ml-scrollbar__track--x" aria-hidden="true" onPointerDown={(e) => onTrack(e, 'x')}>
          <div className="ml-scrollbar__thumb" style={{ width: `${x.size}px`, transform: `translateX(${x.offset}px)` }} {...thumbEvents('x')} />
        </div>
      )}
    </div>
  )
})

/* ── Masonry ───────────────────────────────────────────── */

export interface MasonryHandle {
  /** Re-measure and re-place every item. */
  layout: () => void
}

export interface MasonryProps<T> {
  items: T[]
  /** Column count, or responsive breakpoints `{ minWidth: columns }` measured on the masonry's own width. */
  columns?: number | Record<number, number>
  /** Space between items: px number or any CSS length. */
  gap?: number | string
  /** Key for each item; defaults to its index. */
  itemKey?: (item: T, index: number) => string | number
  /** Columns used before the first measurement (server render). Defaults to the smallest breakpoint. */
  ssrColumns?: number
  /** Fade items up as they are placed; repositioning glides. Off under reduced motion. */
  animate?: boolean
  /** Accessible name for the list. */
  label?: string
  onLayout?: (info: { columns: number; height: number }) => void
  /** Renders one item (the Vue default slot). */
  children?: (item: T, index: number) => ReactNode
  /** Shown when `items` is empty. */
  empty?: ReactNode
  className?: string
}

function columnsFor(columns: number | Record<number, number>, width: number) {
  if (typeof columns === 'number') return Math.max(1, Math.floor(columns))
  let best = 1
  let bestMin = -1
  for (const [min, n] of Object.entries(columns)) {
    if (width >= Number(min) && Number(min) > bestMin) {
      bestMin = Number(min)
      best = n
    }
  }
  return Math.max(1, Math.floor(best))
}

interface MasonryState {
  ready: boolean
  cols: number
  colWidth: number
  height: number
  positions: { x: number; y: number }[]
  settled: number
}

function MasonryInner<T>(
  { items, columns = 3, gap = 16, itemKey, ssrColumns, animate = false, label, onLayout, children, empty, className }: MasonryProps<T>,
  ref: ForwardedRef<MasonryHandle>,
) {
  const root = useRef<HTMLDivElement>(null)
  const [state, setState] = useState<MasonryState>({ ready: false, cols: 0, colWidth: 0, height: 0, positions: [], settled: 0 })
  // Bumped when a size change asks for a fresh pass.
  const [tick, setTick] = useState(0)
  const frame = useRef(0)
  const observer = useRef<ResizeObserver | undefined>(undefined)
  const watched = useRef(new WeakSet<Element>())
  const latest = useRef({ columns, gap, onLayout, state })
  latest.current = { columns, gap, onLayout, state }

  const fallbackColumns = (() => {
    if (ssrColumns) return ssrColumns
    if (typeof columns === 'number') return Math.max(1, Math.floor(columns))
    const keys = Object.keys(columns).map(Number).sort((a, b) => a - b)
    return Math.max(1, Math.floor(keys.length ? columns[keys[0]] : 1))
  })()
  const gapCss = typeof gap === 'number' ? `${gap}px` : gap

  const schedule = useCallback(() => {
    if (typeof requestAnimationFrame === 'undefined') return setTick((t) => t + 1)
    cancelAnimationFrame(frame.current)
    frame.current = requestAnimationFrame(() => setTick((t) => t + 1))
  }, [])

  // Each pass: settle the column width first (items re-render at that width), then read heights.
  useIsoLayoutEffect(() => {
    const el = root.current
    if (!el) return
    const width = el.clientWidth
    if (width <= 0) return
    const { columns: c, gap: g, state: s } = latest.current
    let gapPx = typeof g === 'number' ? g : parseFloat(getComputedStyle(el).getPropertyValue('row-gap'))
    if (!Number.isFinite(gapPx)) gapPx = 16
    const n = columnsFor(c, width)
    const w = (width - gapPx * (n - 1)) / n
    if (!s.ready || n !== s.cols || Math.abs(w - s.colWidth) > 0.5) {
      setState({ ...s, ready: true, cols: n, colWidth: w })
      return
    }
    const nodes = [...el.children].filter((child): child is HTMLElement => child.classList.contains('ml-masonry__item'))
    const tops = Array<number>(n).fill(0)
    const positions = nodes.map((node) => {
      let col = 0
      for (let i = 1; i < n; i++) if (tops[i] < tops[col] - 0.5) col = i
      const pos = { x: col * (w + gapPx), y: tops[col] }
      tops[col] += node.offsetHeight + gapPx
      return pos
    })
    const height = Math.max(0, Math.max(...tops) - gapPx)
    const same = positions.length === s.positions.length && positions.every((p, i) => p.x === s.positions[i].x && p.y === s.positions[i].y) && height === s.height
    if (observer.current) {
      for (const node of nodes) {
        if (watched.current.has(node)) continue
        watched.current.add(node)
        observer.current.observe(node)
      }
    }
    if (same) return
    setState({ ...s, positions, height, settled: s.positions.length })
    latest.current.onLayout?.({ columns: n, height })
  }, [tick, state.ready, state.cols, state.colWidth, items, columns, gap])

  useEffect(() => {
    if (typeof ResizeObserver === 'undefined') return
    let lastWidth = -1
    const ro = new ResizeObserver((entries) => {
      // The root's own height is ours to set; only its width matters.
      const own = entries.find((e) => e.target === root.current)
      if (own && entries.length === 1 && own.contentRect.width === lastWidth) return
      if (own) lastWidth = own.contentRect.width
      schedule()
    })
    observer.current = ro
    if (root.current) ro.observe(root.current)
    return () => {
      ro.disconnect()
      observer.current = undefined
      watched.current = new WeakSet()
      cancelAnimationFrame(frame.current)
    }
  }, [schedule])

  useImperativeHandle(ref, () => ({ layout: () => setTick((t) => t + 1) }), [])

  const { ready, positions, settled } = state
  const style: Record<string, string | number | undefined> = ready
    ? { '--ml-masonry-gap': gapCss, '--ml-masonry-col': `${state.colWidth}px`, height: `${state.height}px` }
    : { '--ml-masonry-gap': gapCss, '--ml-masonry-cols': fallbackColumns }

  return (
    <div
      ref={root}
      className={cx('ml-masonry', { 'ml-masonry--ready': ready, 'ml-masonry--animate': animate }, className)}
      style={style as CSSProperties}
      role="list"
      aria-label={label}
      onLoadCapture={schedule}
    >
      {items.map((item, index) => {
        const pos = ready ? positions[index] : undefined
        return (
          <div
            key={itemKey ? itemKey(item, index) : index}
            className={cx('ml-masonry__item', { 'ml-masonry__item--placed': pos, 'ml-masonry__item--settled': ready && index < settled })}
            role="listitem"
            style={pos ? { transform: `translate(${pos.x}px, ${pos.y}px)` } : undefined}
          >
            {children?.(item, index)}
          </div>
        )
      })}
      {!items.length && empty}
    </div>
  )
}

/** Waterfall layout: each item drops into the shortest column; DOM order stays the reading order. */
export const Masonry = forwardRef(MasonryInner) as <T>(props: MasonryProps<T> & RefAttributes<MasonryHandle>) => ReactElement | null
