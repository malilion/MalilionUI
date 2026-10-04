import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type CSSProperties, type ForwardedRef, type KeyboardEvent, type ReactElement, type ReactNode } from 'react'
import { prefersReducedMotion } from '../composables'
import {
  SWIPE_STACK_FLICK,
  SWIPE_STACK_MS,
  SWIPE_STACK_THRESHOLD,
  attachStackDrag,
  dragRotation,
  flyOut,
  stampStrength,
  swipeDecision,
  type MlSwipeDirection,
} from '../components/swipe-stack'
import { Empty, Icon } from './basic'
import { CuteIcon } from './cute-icon'
import { useLocale } from './locale'
import { cx, len, useControllable } from './utils'

export { swipeDecision, dragRotation, stampStrength, flyOut } from '../components/swipe-stack'
export type { MlSwipeDirection } from '../components/swipe-stack'

export interface SwipeStackProps<T> {
  items: T[]
  /** Draw a card. */
  renderItem: (item: T, index: number) => ReactNode
  /** Cards drawn in the stack. Default 3. */
  depth?: number
  /** Allow swiping up ("super like"). */
  up?: boolean
  /** Share of the card width to drag before letting go throws it. Default 0.3. */
  threshold?: number
  /** Fling speed in px/ms that throws a card. Default 0.5. */
  flickVelocity?: number
  width?: number | string
  height?: number | string
  /** Nope / undo / like buttons. Default true. */
  buttons?: boolean
  likeText?: string
  nopeText?: string
  superText?: string
  itemLabel?: (item: T) => string
  /** Shown when every card is gone. */
  empty?: ReactNode
  disabled?: boolean
  label?: string
  /** Index of the top card. */
  index?: number
  defaultIndex?: number
  onIndexChange?: (index: number) => void
  onSwipe?: (item: T, direction: MlSwipeDirection, index: number) => void
  onUndo?: (item: T, index: number) => void
  onEmpty?: () => void
  className?: string
}

export interface SwipeStackHandle {
  /** Throw the top card; false when there is none. */
  swipe: (direction: MlSwipeDirection) => boolean
  /** Bring the last thrown card back; false when there is nothing to undo. */
  undo: () => boolean
}

const STAMP = { right: 'like', left: 'nope', up: 'super' } as const
type Pose = { x: number; y: number; r: number }

function SwipeStackInner<T>(
  {
    items,
    renderItem,
    depth = 3,
    up = false,
    threshold = SWIPE_STACK_THRESHOLD,
    flickVelocity = SWIPE_STACK_FLICK,
    width = 320,
    height = 420,
    buttons = true,
    likeText,
    nopeText,
    superText,
    itemLabel,
    empty,
    disabled = false,
    label,
    index: indexProp,
    defaultIndex = 0,
    onIndexChange,
    onSwipe,
    onUndo,
    onEmpty,
    className,
  }: SwipeStackProps<T>,
  ref: ForwardedRef<SwipeStackHandle>,
) {
  const loc = useLocale()
  const [index, setIndex] = useControllable(indexProp, defaultIndex, onIndexChange)
  const deck = useRef<HTMLDivElement>(null)
  const [drag, setDrag] = useState({ x: 0, y: 0, active: false })
  const [leaving, setLeaving] = useState<{ item: T; index: number; direction: MlSwipeDirection; from: Pose; to: Pose; id: number } | null>(null)
  const [back, setBack] = useState<{ direction: MlSwipeDirection; id: number } | null>(null)
  const [history, setHistory] = useState<{ index: number; direction: MlSwipeDirection }[]>([])
  const [announce, setAnnounce] = useState('')
  const seq = useRef(0)
  const leaveTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const backTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  const done = index >= items.length
  const visible = items.slice(index, index + Math.max(1, depth)).map((item, k) => ({ item, index: index + k, k }))
  const stampText = (d: MlSwipeDirection) => (d === 'right' ? (likeText ?? loc.swipeStack.stamp.like) : d === 'left' ? (nopeText ?? loc.swipeStack.stamp.nope) : (superText ?? loc.swipeStack.stamp.super))

  function size() {
    const r = deck.current?.getBoundingClientRect()
    return { width: r?.width || (typeof width === 'number' ? width : 320), height: r?.height || (typeof height === 'number' ? height : 420) }
  }

  const strength = drag.active ? stampStrength(drag.x, drag.y, { ...size(), up, threshold }) : { left: 0, right: 0, up: 0 }
  const topStyle = drag.active
    ? {
        '--_ss-x': `${drag.x}px`,
        '--_ss-y': `${drag.y}px`,
        '--_ss-r': `${dragRotation(drag.x, size().width)}deg`,
        '--_ss-like': strength.right,
        '--_ss-nope': strength.left,
        '--_ss-super': strength.up,
      }
    : undefined
  const progress = Math.max(strength.left, strength.right, strength.up)

  // Everything the handlers need, current at call time (pointer listeners outlive renders).
  const live = useRef({ index, items, history, disabled, done, up, threshold, flickVelocity, itemLabel, onSwipe, onUndo, onEmpty, setIndex, loc })
  live.current = { index, items, history, disabled, done, up, threshold, flickVelocity, itemLabel, onSwipe, onUndo, onEmpty, setIndex, loc }

  function commit(direction: MlSwipeDirection, from: Pose = { x: 0, y: 0, r: 0 }) {
    const l = live.current
    if (l.done || l.disabled || (direction === 'up' && !l.up)) return false
    const i = l.index
    const item = l.items[i]
    clearTimeout(leaveTimer.current)
    if (prefersReducedMotion()) setLeaving(null)
    else {
      const { width: w, height: h } = size()
      setLeaving({ item, index: i, direction, from, to: flyOut(direction, w, h, from.y), id: ++seq.current })
      leaveTimer.current = setTimeout(() => setLeaving(null), SWIPE_STACK_MS)
    }
    setBack(null)
    setDrag({ x: 0, y: 0, active: false })
    const history = [...l.history, { index: i, direction }]
    l.history = history
    setHistory(history)
    l.index = i + 1
    l.done = i + 1 >= l.items.length
    l.setIndex(i + 1)
    setAnnounce(l.loc.swipeStack.swiped(direction, l.itemLabel?.(item)))
    l.onSwipe?.(item, direction, i)
    if (i + 1 >= l.items.length) l.onEmpty?.()
    return true
  }

  function undo() {
    const l = live.current
    const last = l.history[l.history.length - 1]
    if (!last || l.disabled) return false
    const history = l.history.slice(0, -1)
    l.history = history
    setHistory(history)
    clearTimeout(leaveTimer.current)
    setLeaving(null)
    l.index = last.index
    l.done = false
    l.setIndex(last.index)
    clearTimeout(backTimer.current)
    if (!prefersReducedMotion()) {
      setBack({ direction: last.direction, id: ++seq.current })
      backTimer.current = setTimeout(() => setBack(null), SWIPE_STACK_MS)
    }
    setAnnounce(l.loc.swipeStack.undone)
    l.onUndo?.(l.items[last.index], last.index)
    return true
  }

  const actions = useRef({ commit, undo })
  actions.current = { commit, undo }
  useImperativeHandle(ref, () => ({ swipe: (d) => actions.current.commit(d), undo: () => actions.current.undo() }), [])

  useEffect(() => {
    const el = deck.current
    if (!el) return
    const detach = attachStackDrag({
      el,
      enabled: () => !live.current.disabled && !live.current.done,
      onStart: () => setDrag({ x: 0, y: 0, active: true }),
      onMove: (x, y) => setDrag({ x, y, active: true }),
      onEnd: (x, y, vx, vy, cancelled) => {
        const l = live.current
        const { width: w, height: h } = size()
        const direction = cancelled ? null : swipeDecision(x, y, vx, vy, { width: w, height: h, up: l.up, threshold: l.threshold, flick: l.flickVelocity })
        if (direction) actions.current.commit(direction, { x, y, r: dragRotation(x, w) })
        else setDrag({ x: 0, y: 0, active: false })
      },
    })
    return () => {
      detach()
      clearTimeout(leaveTimer.current)
      clearTimeout(backTimer.current)
    }
    // size() reads the deck and the latest props through refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function onKeydown(event: KeyboardEvent) {
    if ((event.target as Element | null)?.closest?.('input, textarea, select, [contenteditable]:not([contenteditable="false"])')) return
    let handled = true
    if (event.key === 'ArrowLeft') commit('left')
    else if (event.key === 'ArrowRight') commit('right')
    else if (event.key === 'ArrowUp' && up) commit('up')
    else if (event.key === 'Backspace' || ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z')) undo()
    else handled = false
    if (handled) event.preventDefault()
  }

  return (
    <div
      className={cx('ml-swipe-stack', { 'ml-swipe-stack--disabled': disabled, 'ml-swipe-stack--done': done }, className)}
      style={{ '--_ss-w': len(width), '--_ss-h': len(height) } as CSSProperties}
      role="region"
      aria-label={label ?? loc.swipeStack.label}
      aria-description={loc.swipeStack.hint}
      tabIndex={0}
      onKeyDown={onKeydown}
    >
      <div ref={deck} className="ml-swipe-stack__deck" style={{ '--_ss-p': progress } as CSSProperties}>
        {visible.map((card) => (
          <div
            key={card.index}
            className={cx(
              'ml-swipe-stack__card',
              card.k === 0 && 'ml-swipe-stack__card--top',
              card.k === 0 && drag.active && 'ml-swipe-stack__card--dragging',
              card.k === 0 && back && `ml-swipe-stack__card--back-${back.direction}`,
            )}
            style={{ '--_ss-i': card.k, ...(card.k === 0 ? topStyle : undefined) } as CSSProperties}
            role="group"
            aria-label={loc.swipeStack.card(card.index + 1, items.length)}
            aria-hidden={card.k === 0 ? undefined : 'true'}
            inert={card.k !== 0}
          >
            <div className="ml-swipe-stack__content">{renderItem(card.item, card.index)}</div>
            {card.k === 0 && (
              <>
                <span className="ml-swipe-stack__stamp ml-swipe-stack__stamp--like" aria-hidden="true">
                  {stampText('right')}
                </span>
                <span className="ml-swipe-stack__stamp ml-swipe-stack__stamp--nope" aria-hidden="true">
                  {stampText('left')}
                </span>
                {up && (
                  <span className="ml-swipe-stack__stamp ml-swipe-stack__stamp--super" aria-hidden="true">
                    {stampText('up')}
                  </span>
                )}
              </>
            )}
          </div>
        ))}
        {leaving && (
          <div
            key={`leave-${leaving.id}`}
            className={cx('ml-swipe-stack__card', 'ml-swipe-stack__card--leaving', `ml-swipe-stack__card--leaving-${leaving.direction}`)}
            style={
              {
                '--_ss-x': `${leaving.from.x}px`,
                '--_ss-y': `${leaving.from.y}px`,
                '--_ss-r': `${leaving.from.r}deg`,
                '--_ss-tx': `${leaving.to.x}px`,
                '--_ss-ty': `${leaving.to.y}px`,
                '--_ss-tr': `${leaving.to.r}deg`,
              } as CSSProperties
            }
            aria-hidden="true"
            inert
          >
            <div className="ml-swipe-stack__content">{renderItem(leaving.item, leaving.index)}</div>
            <span className={cx('ml-swipe-stack__stamp', `ml-swipe-stack__stamp--${STAMP[leaving.direction]}`)}>{stampText(leaving.direction)}</span>
          </div>
        )}
        {done && <div className="ml-swipe-stack__empty">{empty ?? <Empty size="sm" title={loc.swipeStack.empty} />}</div>}
      </div>
      {buttons && (
        <div className="ml-swipe-stack__actions">
          <button type="button" className="ml-swipe-stack__btn ml-swipe-stack__btn--nope" aria-label={loc.swipeStack.nope} title={loc.swipeStack.nope} disabled={done || disabled} onClick={() => commit('left')}>
            <Icon name="close" />
          </button>
          <button type="button" className="ml-swipe-stack__btn ml-swipe-stack__btn--undo" aria-label={loc.swipeStack.undo} title={loc.swipeStack.undo} disabled={!history.length || disabled} onClick={() => undo()}>
            <Icon name="rotate" />
          </button>
          {up && (
            <button type="button" className="ml-swipe-stack__btn ml-swipe-stack__btn--super" aria-label={loc.swipeStack.super} title={loc.swipeStack.super} disabled={done || disabled} onClick={() => commit('up')}>
              <CuteIcon name="star" />
            </button>
          )}
          <button type="button" className="ml-swipe-stack__btn ml-swipe-stack__btn--like" aria-label={loc.swipeStack.like} title={loc.swipeStack.like} disabled={done || disabled} onClick={() => commit('right')}>
            <CuteIcon name="heart" />
          </button>
        </div>
      )}
      <p className="ml-visually-hidden" aria-live="polite">
        {announce}
      </p>
    </div>
  )
}

export const SwipeStack = forwardRef(SwipeStackInner) as <T>(props: SwipeStackProps<T> & { ref?: ForwardedRef<SwipeStackHandle> }) => ReactElement
