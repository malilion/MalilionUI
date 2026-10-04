import { forwardRef, useEffect, useImperativeHandle, useRef, useState, version, type CSSProperties, type FocusEvent, type KeyboardEvent, type MouseEvent, type ReactNode } from 'react'
import {
  attachPullGesture,
  attachSwipeGesture,
  claimSwipeGroup,
  fullSwipeDistance,
  pullProgress,
  pullResistance,
  releaseSwipeGroup,
  sideOffset,
  swipeOffset,
  swipeSnap,
  type SwipeLimits,
} from '../components/gesture'
import type { MlPullRefreshStatus, MlSwipeAction, MlSwipeSide } from '../types'
import { Icon, Paw } from './basic'
import { useLocale } from './locale'
import { cx, useControllable } from './utils'

// React 19 takes `inert` as a boolean; React 18 only passes it through as a string.
const inert = (on: boolean) => (on ? ({ inert: parseInt(version, 10) >= 19 ? true : '' } as object) : {})

/* ── PullRefresh ───────────────────────────────────────── */

export interface PullRefreshState {
  status: MlPullRefreshStatus
  distance: number
  progress: number
}

export interface PullRefreshProps {
  /**
   * Runs on release. Return a Promise: the indicator spins until it settles,
   * then shows the success text (resolved) or the fail text (rejected).
   */
  onRefresh?: () => unknown
  /** Height of the indicator area, and where the content rests while refreshing (px). */
  headHeight?: number
  /** How far the content must follow the finger before letting go refreshes (px). Defaults to headHeight. */
  pullDistance?: number
  disabled?: boolean
  /** How long the success / fail text stays before the head closes (ms). */
  successDuration?: number
  pullingText?: string
  loosingText?: string
  refreshingText?: string
  successText?: string
  failText?: string
  onStatusChange?: (status: MlPullRefreshStatus) => void
  /** Replace the paw indicator and text. */
  indicator?: (state: PullRefreshState) => ReactNode
  className?: string
  children?: ReactNode
}

export interface PullRefreshHandle {
  /** Start a refresh as if the user had pulled. */
  refresh: () => Promise<void>
  readonly status: MlPullRefreshStatus
}

export const PullRefresh = forwardRef<PullRefreshHandle, PullRefreshProps>(function PullRefresh(
  {
    onRefresh,
    headHeight = 56,
    pullDistance,
    disabled,
    successDuration = 600,
    pullingText,
    loosingText,
    refreshingText,
    successText,
    failText,
    onStatusChange,
    indicator,
    className,
    children,
  },
  ref,
) {
  const loc = useLocale()
  const root = useRef<HTMLDivElement>(null)
  const [status, setStatusState] = useState<MlPullRefreshStatus>('idle')
  const [distance, setDistance] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [live, setLive] = useState('')
  const threshold = pullDistance ?? headHeight
  const progress = pullProgress(distance, threshold)

  const texts = {
    pulling: pullingText ?? loc.pullRefresh.pulling,
    loosing: loosingText ?? loc.pullRefresh.loosing,
    refreshing: refreshingText ?? loc.pullRefresh.refreshing,
    success: successText ?? loc.pullRefresh.success,
    fail: failText ?? loc.pullRefresh.fail,
  }
  const text = status === 'loosing' || status === 'refreshing' || status === 'success' || status === 'fail' ? texts[status] : texts.pulling

  const latest = useRef({ status, onRefresh, onStatusChange, headHeight, threshold, disabled, successDuration, texts })
  latest.current = { ...latest.current, onRefresh, onStatusChange, headHeight, threshold, disabled, successDuration, texts }

  const [ctl] = useState(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    let alive = true
    let run = 0
    const busy = () => latest.current.status === 'refreshing'

    function setStatus(next: MlPullRefreshStatus) {
      if (latest.current.status === next) return
      latest.current.status = next
      setStatusState(next)
      latest.current.onStatusChange?.(next)
    }

    async function refresh() {
      if (busy() || !alive) return
      clearTimeout(timer)
      const id = ++run
      const l = latest.current
      setDistance(l.headHeight)
      setStatus('refreshing')
      setLive(l.texts.refreshing)
      let ok = true
      try {
        await l.onRefresh?.()
      } catch {
        ok = false
      }
      if (!alive || id !== run) return
      setStatus(ok ? 'success' : 'fail')
      setLive(ok ? latest.current.texts.success : latest.current.texts.fail)
      timer = setTimeout(collapse, latest.current.successDuration)
    }

    function collapse() {
      setDistance(0)
      // Keep the result text while the head slides away, then go idle.
      timer = setTimeout(() => setStatus('idle'), 300)
    }

    function attach(el: HTMLElement) {
      alive = true
      const detach = attachPullGesture({
        root: el,
        enabled: () => !latest.current.disabled && !busy(),
        onStart() {
          clearTimeout(timer)
          setDragging(true)
          setStatus('pulling')
        },
        onMove(raw) {
          const { threshold: t } = latest.current
          const d = pullResistance(raw, t)
          setDistance(d)
          setStatus(d >= t ? 'loosing' : 'pulling')
        },
        onEnd(_raw, cancelled) {
          setDragging(false)
          if (!cancelled && latest.current.status === 'loosing') return void refresh()
          setDistance(0)
          setStatus('idle')
        },
      })
      return () => {
        alive = false
        clearTimeout(timer)
        detach()
      }
    }
    return { refresh, attach }
  })

  useEffect(() => ctl.attach(root.current!), [])

  useImperativeHandle(ref, () => ({
    refresh: ctl.refresh,
    get status() {
      return latest.current.status
    },
  }))

  return (
    <div
      ref={root}
      className={cx('ml-pull-refresh', `ml-pull-refresh--${status}`, { 'ml-pull-refresh--dragging': dragging, 'ml-pull-refresh--disabled': disabled }, className)}
      style={{ '--_head': `${headHeight}px`, '--_p': progress } as CSSProperties}
    >
      {!disabled && (
        <button type="button" className="ml-pull-refresh__button" disabled={status === 'refreshing'} onClick={() => void ctl.refresh()}>
          <Icon name="rotate" />
          {loc.pullRefresh.button}
        </button>
      )}
      <div className="ml-pull-refresh__track" style={distance ? { transform: `translate3d(0, ${distance}px, 0)` } : undefined}>
        <div className="ml-pull-refresh__head" aria-hidden="true">
          {indicator ? (
            indicator({ status, distance, progress })
          ) : (
            <>
              <span className="ml-pull-refresh__icon">
                {status === 'refreshing' ? (
                  <span className="ml-pull-refresh__spinner">
                    {[0, 1, 2, 3].map((i) => (
                      <Paw key={i} tone="current" className="ml-pull-refresh__step" style={{ '--i': i } as CSSProperties} />
                    ))}
                  </span>
                ) : status === 'success' || status === 'fail' ? (
                  <Icon name={status === 'success' ? 'check' : 'warning'} className="ml-pull-refresh__result" />
                ) : (
                  <>
                    <svg className="ml-pull-refresh__ring" viewBox="0 0 36 36">
                      <circle className="ml-pull-refresh__ring-track" cx="18" cy="18" r="16" />
                      <circle className="ml-pull-refresh__ring-fill" cx="18" cy="18" r="16" pathLength={100} />
                    </svg>
                    <Paw className="ml-pull-refresh__paw" />
                  </>
                )}
              </span>
              <span className="ml-pull-refresh__text">{text}</span>
            </>
          )}
        </div>
        <div className="ml-pull-refresh__content">{children}</div>
      </div>
      <span className="ml-visually-hidden" role="status">
        {live}
      </span>
    </div>
  )
})

/* ── SwipeCell ─────────────────────────────────────────── */

export interface SwipeCellProps {
  /** Buttons revealed by swiping right, listed left to right. */
  leftActions?: MlSwipeAction[]
  /** Buttons revealed by swiping left, listed left to right. */
  rightActions?: MlSwipeAction[]
  /** Custom left actions instead of `leftActions`; a function gets `close`. */
  left?: ReactNode | ((close: () => void) => ReactNode)
  /** Custom right actions instead of `rightActions`; a function gets `close`. */
  right?: ReactNode | ((close: () => void) => ReactNode)
  /** Swiping far enough fires the outermost action (left side's first, right side's last). */
  fullSwipe?: boolean
  disabled?: boolean
  /** Only one cell per group is open at a time. */
  group?: string
  /** 'li' inside List (the default), 'div' anywhere else. */
  as?: 'li' | 'div'
  /** Which side is open (controlled). */
  open?: MlSwipeSide | null
  defaultOpen?: MlSwipeSide | null
  onOpenChange?: (side: MlSwipeSide | null) => void
  onAction?: (action: MlSwipeAction, side: MlSwipeSide) => void
  /** List-row content like ListItem; without a title `children` is used. */
  title?: ReactNode
  subtitle?: ReactNode
  meta?: ReactNode
  badge?: number | string
  /** Makes the row a button (calls onSelect). */
  clickable?: boolean
  onSelect?: () => void
  leading?: ReactNode
  trailing?: ReactNode
  className?: string
  children?: ReactNode
}

export interface SwipeCellHandle {
  /** Reveal a side; `focus` moves focus to its first action. */
  open: (side: MlSwipeSide, focus?: boolean) => void
  close: () => void
}

const shown = (node: unknown) => node != null && node !== false

export const SwipeCell = forwardRef<SwipeCellHandle, SwipeCellProps>(function SwipeCell(
  {
    leftActions,
    rightActions,
    left,
    right,
    fullSwipe,
    disabled,
    group = 'default',
    as: Tag = 'li',
    open: openProp,
    defaultOpen = null,
    onOpenChange,
    onAction,
    title,
    subtitle,
    meta,
    badge,
    clickable,
    onSelect,
    leading,
    trailing,
    className,
    children,
  },
  ref,
) {
  const loc = useLocale()
  const [open, setOpenValue] = useControllable<MlSwipeSide | null>(openProp, defaultOpen, onOpenChange)
  const [offset, setOffset] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [full, setFull] = useState(false)
  const root = useRef<HTMLElement>(null)
  const content = useRef<HTMLDivElement>(null)
  const leftEl = useRef<HTMLDivElement>(null)
  const rightEl = useRef<HTMLDivElement>(null)
  const moreEl = useRef<HTMLButtonElement>(null)
  const limits = useRef<SwipeLimits>({ left: 0, right: 0 })

  const hasLeft = !!leftActions?.length || shown(left)
  const hasRight = !!rightActions?.length || shown(right)
  const fullSide: MlSwipeSide | null = full ? (offset > 0 ? 'left' : 'right') : null

  const live = useRef({ open, setOpenValue, disabled, hasLeft, hasRight, group, fullSwipe, leftActions, rightActions, onAction, dragging: false, offset, full })
  Object.assign(live.current, { open, setOpenValue, disabled, hasLeft, hasRight, group, fullSwipe, leftActions, rightActions, onAction, offset, full })

  const [ctl] = useState(() => {
    const self = { close: () => setOpen(null) }

    function measure() {
      const width = (el: HTMLElement | null) => (el ? el.getBoundingClientRect().width : 0)
      limits.current = { left: width(leftEl.current), right: width(rightEl.current), full: live.current.fullSwipe, width: width(root.current) }
    }

    function setOpen(side: MlSwipeSide | null) {
      const l = live.current
      if (side) claimSwipeGroup(l.group, self)
      else releaseSwipeGroup(l.group, self)
      l.offset = sideOffset(side, limits.current)
      l.full = false
      setOffset(l.offset)
      setFull(false)
      l.open = side
      l.setOpenValue(side)
    }

    function outer(side: MlSwipeSide) {
      const list = side === 'left' ? live.current.leftActions : live.current.rightActions
      return side === 'left' ? list?.[0] : list?.[list.length - 1]
    }

    function focusFirst(side: MlSwipeSide) {
      // After the re-render that lifts `inert` off the revealed side.
      setTimeout(() => {
        const box = side === 'left' ? leftEl.current : rightEl.current
        box?.querySelector<HTMLElement>('button, [href], [tabindex]:not([tabindex="-1"])')?.focus()
      })
    }

    function reveal(side: MlSwipeSide, focus = false) {
      measure()
      setOpen(side)
      if (focus) focusFirst(side)
    }

    let base = 0
    function attach(el: HTMLElement) {
      return attachSwipeGesture({
        el,
        enabled: () => !live.current.disabled && (live.current.hasLeft || live.current.hasRight),
        onStart() {
          measure()
          base = sideOffset(live.current.open, limits.current)
          live.current.dragging = true
          setDragging(true)
          claimSwipeGroup(live.current.group, self)
        },
        onMove(dx) {
          const l = live.current
          const next = swipeOffset(base + dx, limits.current)
          const side = next > 0 ? 'left' : 'right'
          const size = side === 'left' ? limits.current.left : limits.current.right
          const isFull = !!l.fullSwipe && !!outer(side) && Math.abs(next) >= fullSwipeDistance(limits.current.width ?? 0, size)
          l.offset = next
          l.full = isFull
          setOffset(next)
          setFull(isFull)
        },
        onEnd(dx, velocity, cancelled) {
          const l = live.current
          l.dragging = false
          setDragging(false)
          const side = l.full ? (l.offset > 0 ? 'left' : 'right') : null
          if (side && !cancelled) {
            const action = outer(side)!
            setOpen(null)
            l.onAction?.(action, side)
            return
          }
          setOpen(cancelled ? l.open : swipeSnap(swipeOffset(base + dx, limits.current), velocity, limits.current))
        },
      })
    }

    return { self, measure, setOpen, reveal, attach }
  })

  useEffect(() => ctl.attach(content.current!), [])

  // Follow the open side (controlled changes, or another cell closing this one).
  useEffect(() => {
    if (open) claimSwipeGroup(group, ctl.self)
    else releaseSwipeGroup(group, ctl.self)
    if (live.current.dragging) return
    ctl.measure()
    setOffset(sideOffset(open, limits.current))
    if (!open) setFull(false)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onOutside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) ctl.setOpen(null)
    }
    document.addEventListener('pointerdown', onOutside, true)
    return () => document.removeEventListener('pointerdown', onOutside, true)
  }, [!!open])

  useEffect(() => () => releaseSwipeGroup(live.current.group, ctl.self), [])

  useImperativeHandle(ref, () => ({ open: ctl.reveal, close: () => ctl.setOpen(null) }))

  const close = () => ctl.setOpen(null)
  const defaultSide = (): MlSwipeSide => (hasRight ? 'right' : 'left')

  function onActionClick(action: MlSwipeAction, side: MlSwipeSide, event: MouseEvent) {
    onAction?.(action, side)
    ctl.setOpen(null)
    // From the keyboard, focus would fall to <body> once the actions go inert.
    if (event.detail === 0) setTimeout(() => moreEl.current?.focus())
  }

  function onKeyDown(event: KeyboardEvent) {
    if (disabled || !(hasLeft || hasRight)) return
    if (event.key === 'ContextMenu' || (event.key === 'F10' && event.shiftKey)) {
      event.preventDefault()
      ctl.reveal(open ?? defaultSide(), true)
    } else if (event.key === 'Escape' && open) {
      event.preventDefault()
      close()
      moreEl.current?.focus()
    } else if (open && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
      // Arrows switch sides the way a swipe would: ← shows the right actions.
      const side: MlSwipeSide = event.key === 'ArrowLeft' ? 'right' : 'left'
      if (side !== open && (side === 'left' ? hasLeft : hasRight)) {
        event.preventDefault()
        ctl.reveal(side, true)
      }
    }
  }

  function onBlur(event: FocusEvent) {
    const next = event.relatedTarget as Node | null
    if (open && next && !root.current?.contains(next)) close()
  }

  function onContentClickCapture(event: MouseEvent) {
    if (!open) return
    event.preventDefault()
    event.stopPropagation()
    close()
  }

  const stretch = (side: MlSwipeSide) => {
    const size = side === 'left' ? limits.current.left : limits.current.right
    const revealed = side === 'left' ? offset : -offset
    return revealed > size ? { width: `${revealed}px` } : undefined
  }

  const actionButtons = (side: MlSwipeSide, list: MlSwipeAction[] | undefined) =>
    list?.map((action, i) => {
      const isOuter = side === 'left' ? i === 0 : i === list.length - 1
      return (
        <button
          key={String(action.value ?? action.label)}
          type="button"
          className={cx('ml-swipe-cell__action', `ml-swipe-cell__action--${action.tone ?? 'default'}`, {
            'ml-swipe-cell__action--outer': isOuter,
            'ml-swipe-cell__action--expanded': fullSide === side && isOuter,
          })}
          onClick={(event) => onActionClick(action, side, event)}
        >
          {action.icon && <Icon name={action.icon} />}
          <span className="ml-swipe-cell__label">{action.label}</span>
        </button>
      )
    })

  const custom = (node: SwipeCellProps['left']) => (typeof node === 'function' ? node(close) : node)
  const Row = clickable ? 'button' : 'div'

  return (
    <Tag
      ref={root as never}
      className={cx(
        'ml-list-item',
        'ml-swipe-cell',
        {
          'ml-swipe-cell--dragging': dragging,
          'ml-swipe-cell--open': !!open,
          'ml-swipe-cell--full': full,
          'ml-swipe-cell--disabled': disabled,
        },
        className,
      )}
      onKeyDown={onKeyDown}
      onBlur={onBlur}
    >
      <div
        ref={content}
        className="ml-swipe-cell__content"
        style={offset ? { transform: `translate3d(${offset}px, 0, 0)` } : undefined}
        onClickCapture={onContentClickCapture}
      >
        {title !== undefined ? (
          <Row
            type={clickable ? 'button' : undefined}
            className={cx('ml-list-item__row', { 'ml-list-item__row--interactive': clickable })}
            onClick={() => clickable && onSelect?.()}
          >
            {shown(leading) && <span className="ml-list-item__leading">{leading}</span>}
            <span className="ml-list-item__text">
              <span className="ml-list-item__title">{title}</span>
              {subtitle && <span className="ml-list-item__subtitle">{subtitle}</span>}
            </span>
            {(meta || badge !== undefined || shown(trailing)) && (
              <span className="ml-list-item__trailing">
                {meta && <span className="ml-list-item__meta">{meta}</span>}
                {badge !== undefined && <span className="ml-list-item__badge">{badge}</span>}
                {trailing}
              </span>
            )}
          </Row>
        ) : (
          children
        )}
        {!disabled && (hasLeft || hasRight) && (
          <button
            ref={moreEl}
            type="button"
            className="ml-swipe-cell__more"
            aria-expanded={!!open}
            aria-label={typeof title === 'string' && title ? loc.swipeCell.moreFor(title) : loc.swipeCell.more}
            onClick={() => (open ? close() : ctl.reveal(defaultSide(), true))}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="5" cy="12" r="2" />
              <circle cx="12" cy="12" r="2" />
              <circle cx="19" cy="12" r="2" />
            </svg>
          </button>
        )}
      </div>
      {hasLeft && (
        <div
          ref={leftEl}
          className="ml-swipe-cell__actions ml-swipe-cell__actions--left"
          role="group"
          aria-label={loc.swipeCell.left}
          style={stretch('left')}
          {...inert(open !== 'left')}
        >
          {shown(left) ? custom(left) : actionButtons('left', leftActions)}
        </div>
      )}
      {hasRight && (
        <div
          ref={rightEl}
          className="ml-swipe-cell__actions ml-swipe-cell__actions--right"
          role="group"
          aria-label={loc.swipeCell.right}
          style={stretch('right')}
          {...inert(open !== 'right')}
        >
          {shown(right) ? custom(right) : actionButtons('right', rightActions)}
        </div>
      )}
    </Tag>
  )
})
