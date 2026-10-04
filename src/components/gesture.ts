// Framework-free gesture helpers shared by MlPullRefresh / MlSwipeCell and their
// React twins: the math (direction lock, rubber-band resistance, velocity, snap)
// plus two small DOM controllers that turn pointer / touch input into numbers.
// Nothing here imports Vue or React.

/* ── Math ─────────────────────────────────────────────── */

export type GestureAxis = 'x' | 'y'

/** Pixels of travel before a gesture commits to an axis. */
export const LOCK_DISTANCE = 8

/**
 * Decide whether a drag is horizontal or vertical once it has travelled
 * `threshold` px on either axis; `null` while it is still undecided.
 */
export function lockDirection(dx: number, dy: number, threshold = LOCK_DISTANCE): GestureAxis | null {
  const ax = Math.abs(dx)
  const ay = Math.abs(dy)
  if (Math.max(ax, ay) < threshold) return null
  return ax > ay ? 'x' : 'y'
}

/**
 * iOS-style rubber band: grows ~linearly at first, then flattens out and never
 * passes `dimension`. `x` is the raw overshoot (≥ 0).
 */
export function rubberband(x: number, dimension: number, constant = 0.55): number {
  if (x <= 0 || dimension <= 0) return 0
  return (1 - 1 / ((x * constant) / dimension + 1)) * dimension
}

/**
 * How far the pull-to-refresh content follows a finger that moved `raw` px.
 * The threshold is reached at 1.5 × threshold of travel, and the head can
 * never be pulled further than 3 × threshold.
 */
export function pullResistance(raw: number, threshold: number): number {
  return rubberband(raw, threshold * 3, 1)
}

/** 0…1 progress towards the release threshold. */
export function pullProgress(distance: number, threshold: number): number {
  if (threshold <= 0) return distance > 0 ? 1 : 0
  return Math.min(1, Math.max(0, distance / threshold))
}

export interface VelocityTracker {
  /** Record a position at a time (ms). */
  add(time: number, value: number): void
  /** px/ms over the last `window` ms; 0 with fewer than two samples or under 10 ms of them. */
  velocity(): number
  reset(): void
}

/** Velocity from the recent samples only, so a pause before release reads as ~0. */
export function createVelocityTracker(window = 100): VelocityTracker {
  let samples: { t: number; v: number }[] = []
  return {
    add(t, v) {
      samples.push({ t, v })
      while (samples.length > 2 && t - samples[0].t > window) samples.shift()
    },
    velocity() {
      if (samples.length < 2) return 0
      const first = samples[0]
      const last = samples[samples.length - 1]
      const dt = last.t - first.t
      // Too short a span to tell a flick from noise (synthetic or coalesced events).
      return dt >= 10 ? (last.v - first.v) / dt : 0
    },
    reset() {
      samples = []
    },
  }
}

export type SwipeSide = 'left' | 'right'

export interface SwipeLimits {
  /** Width of the left actions (revealed by dragging right). 0 = none. */
  left: number
  /** Width of the right actions (revealed by dragging left). 0 = none. */
  right: number
  /** Full swipe allowed: the row may travel past the actions up to `width`. */
  full?: boolean
  /** Row width, the full-swipe travel limit. */
  width?: number
}

/**
 * Where the row sits for a raw drag offset (positive = dragged right).
 * Sides without actions do not move; past the actions it rubber-bands, or —
 * with full swipe — follows the finger up to the row width.
 */
export function swipeOffset(raw: number, { left, right, full, width = 0 }: SwipeLimits): number {
  const size = raw > 0 ? left : right
  const sign = raw > 0 ? 1 : -1
  const abs = Math.abs(raw)
  if (!size || !abs) return 0
  if (abs <= size) return raw
  if (full) return sign * Math.min(abs, Math.max(width, size))
  return sign * (size + rubberband(abs - size, size))
}

/** Travel (px) past which letting go triggers the outermost action. */
export function fullSwipeDistance(rowWidth: number, actionsWidth: number): number {
  return Math.max(actionsWidth + 48, rowWidth * 0.6)
}

/** Velocity (px/ms) that counts as a flick. */
export const FLICK_VELOCITY = 0.3

/**
 * Which side should be open after letting go at `offset` moving at
 * `velocity` (px/ms, positive = rightwards). A flick wins over position;
 * otherwise it stays open once past half the actions' width.
 */
export function swipeSnap(offset: number, velocity: number, { left, right }: SwipeLimits, flick = FLICK_VELOCITY): SwipeSide | null {
  if (offset > 0 && left) {
    if (velocity > flick) return 'left'
    if (velocity < -flick) return null
    return offset > left / 2 ? 'left' : null
  }
  if (offset < 0 && right) {
    if (velocity < -flick) return 'right'
    if (velocity > flick) return null
    return -offset > right / 2 ? 'right' : null
  }
  return null
}

/** Resting offset of a side. */
export const sideOffset = (side: SwipeSide | null, { left, right }: SwipeLimits) => (side === 'left' ? left : side === 'right' ? -right : 0)

/* ── Swipe groups: one open cell per group ───────────────── */

const openCells = new Map<string, { close: () => void }>()

/** A cell is opening: close whichever cell of the group was open before. */
export function claimSwipeGroup(group: string, cell: { close: () => void }) {
  const prev = openCells.get(group)
  openCells.set(group, cell)
  if (prev && prev !== cell) prev.close()
}

/** A cell closed (or unmounted): forget it if it is the group's open one. */
export function releaseSwipeGroup(group: string, cell: { close: () => void }) {
  if (openCells.get(group) === cell) openCells.delete(group)
}

/* ── DOM helpers ──────────────────────────────────────── */

/** A scroll container on the vertical axis (whether or not it overflows right now). */
const scrollsY = (el: Element) => /(auto|scroll|overlay)/.test(getComputedStyle(el).overflowY)

/** The element that scrolls `el` vertically, or the document scroller. */
export function scrollParent(el: Element): HTMLElement {
  for (let node = el.parentElement; node; node = node.parentElement) {
    if (node === document.body || node === document.documentElement) break
    if (scrollsY(node)) return node
  }
  return (document.scrollingElement ?? document.documentElement) as HTMLElement
}

/**
 * True when nothing between `target` and the root's own scroll container is
 * scrolled down — the scrollers inside `root` and the one around it. Scrollers
 * further out (a page scrolled to show a phone mock-up) do not matter.
 */
export function isAtTop(target: Element, root: Element): boolean {
  for (let node: Element | null = target; node && node !== root; node = node.parentElement) {
    if (node.scrollTop > 0) return false
  }
  return scrollParent(root).scrollTop <= 0
}

/** Drag ended on something clickable: eat the click its pointerup would fire. */
export function swallowNextClick() {
  const swallow = (event: MouseEvent) => {
    event.stopPropagation()
    event.preventDefault()
  }
  window.addEventListener('click', swallow, { capture: true, once: true })
  setTimeout(() => window.removeEventListener('click', swallow, { capture: true }), 0)
}

const TEXT_ENTRY = 'input, textarea, select, [contenteditable]:not([contenteditable="false"])'

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now())

/* ── Pull gesture ─────────────────────────────────────── */

export interface PullGestureOptions {
  /** The pull-to-refresh root; listeners go here. */
  root: HTMLElement
  /** False while disabled or refreshing. */
  enabled: () => boolean
  /** The drag committed to pulling down from the top. */
  onStart: () => void
  /** Raw finger travel (px, ≥ 0). */
  onMove: (raw: number) => void
  /** Let go (or the browser cancelled the gesture). */
  onEnd: (raw: number, cancelled: boolean) => void
}

/**
 * Pull-down detection. Touch uses touch events, so the first downward
 * `touchmove` at the top can be cancelled before the browser scrolls or starts
 * its own pull-to-refresh (iOS ignores `touch-action: pan-down`); mouse and pen
 * use pointer events. Returns a detach function.
 */
export function attachPullGesture(o: PullGestureOptions): () => void {
  const { root } = o
  let s: { x: number; y: number; axis: GestureAxis | null; engaged: boolean; dy: number; scroller: HTMLElement; overscroll: string } | null = null

  function begin(x: number, y: number, target: EventTarget | null) {
    if (!o.enabled() || !(target instanceof Element)) return false
    if (target.closest(TEXT_ENTRY) || target.closest('.ml-pull-refresh__button')) return false
    if (!isAtTop(target, root)) return false
    const scroller = scrollParent(root)
    s = { x, y, axis: null, engaged: false, dy: 0, scroller, overscroll: '' }
    return true
  }

  /** Returns true when the event should be cancelled (we own the gesture). */
  function move(x: number, y: number, touch: boolean): boolean {
    if (!s) return false
    const dx = x - s.x
    const dy = y - s.y
    s.dy = dy
    if (!s.axis) {
      s.axis = lockDirection(dx, dy)
      if (!s.axis) return touch && dy > 0 && dy >= Math.abs(dx)
      if (s.axis === 'x' || dy < 0) {
        s = null
        return false
      }
      s.engaged = true
      // Only while pulling: keep the browser's own pull-to-refresh / bounce out.
      s.overscroll = s.scroller.style.overscrollBehaviorY
      s.scroller.style.overscrollBehaviorY = 'contain'
      o.onStart()
    }
    if (!s.engaged) return false
    o.onMove(Math.max(0, dy))
    return true
  }

  function end(cancelled: boolean, mouse: boolean) {
    const state = s
    s = null
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', onPointerUp)
    window.removeEventListener('pointercancel', onPointerCancel)
    if (!state?.engaged) return
    state.scroller.style.overscrollBehaviorY = state.overscroll
    if (mouse) swallowNextClick()
    o.onEnd(Math.max(0, state.dy), cancelled)
  }

  function onPointerDown(event: PointerEvent) {
    if (event.pointerType === 'touch' || event.button !== 0) return
    if (!begin(event.clientX, event.clientY, event.target)) return
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerCancel)
  }
  function onPointerMove(event: PointerEvent) {
    if (move(event.clientX, event.clientY, false)) {
      event.preventDefault()
      window.getSelection?.()?.removeAllRanges()
    }
  }
  const onPointerUp = () => end(false, true)
  const onPointerCancel = () => end(true, true)

  function onTouchStart(event: TouchEvent) {
    if (event.touches.length !== 1) return void (s && end(true, false))
    const t = event.touches[0]
    begin(t.clientX, t.clientY, event.target)
  }
  function onTouchMove(event: TouchEvent) {
    const t = event.touches[0]
    if (t && move(t.clientX, t.clientY, true) && event.cancelable) event.preventDefault()
  }
  const onTouchEnd = () => end(false, false)
  const onTouchCancel = () => end(true, false)

  root.addEventListener('pointerdown', onPointerDown)
  root.addEventListener('touchstart', onTouchStart, { passive: true })
  root.addEventListener('touchmove', onTouchMove, { passive: false })
  root.addEventListener('touchend', onTouchEnd)
  root.addEventListener('touchcancel', onTouchCancel)
  return () => {
    if (s) end(true, false)
    root.removeEventListener('pointerdown', onPointerDown)
    root.removeEventListener('touchstart', onTouchStart)
    root.removeEventListener('touchmove', onTouchMove)
    root.removeEventListener('touchend', onTouchEnd)
    root.removeEventListener('touchcancel', onTouchCancel)
  }
}

/* ── Swipe gesture ────────────────────────────────────── */

export interface SwipeGestureOptions {
  /** The sliding content; it should have `touch-action: pan-y`. */
  el: HTMLElement
  enabled: () => boolean
  /** The drag committed to horizontal. */
  onStart: () => void
  /** Raw horizontal travel since the press (px, positive = right). */
  onMove: (dx: number) => void
  /** Let go: travel, velocity (px/ms) and whether the browser cancelled it. */
  onEnd: (dx: number, velocity: number, cancelled: boolean) => void
}

/**
 * Horizontal swipe detection with pointer events (touch, mouse, pen). Vertical
 * drags are left alone so the list still scrolls. Returns a detach function.
 */
export function attachSwipeGesture(o: SwipeGestureOptions): () => void {
  const { el } = o
  const tracker = createVelocityTracker()
  let s: { x: number; y: number; id: number; axis: GestureAxis | null; dx: number } | null = null

  function onPointerDown(event: PointerEvent) {
    if (s || !o.enabled() || (event.pointerType === 'mouse' && event.button !== 0)) return
    if ((event.target as Element | null)?.closest?.(TEXT_ENTRY)) return
    s = { x: event.clientX, y: event.clientY, id: event.pointerId, axis: null, dx: 0 }
    tracker.reset()
    tracker.add(now(), event.clientX)
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerCancel)
  }

  function onPointerMove(event: PointerEvent) {
    if (!s || event.pointerId !== s.id) return
    const dx = event.clientX - s.x
    const dy = event.clientY - s.y
    if (!s.axis) {
      s.axis = lockDirection(dx, dy)
      if (!s.axis) return
      if (s.axis === 'y') return stop()
      o.onStart()
    }
    event.preventDefault()
    window.getSelection?.()?.removeAllRanges()
    s.dx = dx
    tracker.add(now(), event.clientX)
    o.onMove(dx)
  }

  function stop() {
    s = null
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', onPointerUp)
    window.removeEventListener('pointercancel', onPointerCancel)
  }

  function finish(event: PointerEvent, cancelled: boolean) {
    if (!s || event.pointerId !== s.id) return
    const { axis, dx } = s
    // A pause before letting go should read as no velocity.
    tracker.add(now(), s.x + dx)
    stop()
    if (axis !== 'x') return
    if (!cancelled) swallowNextClick()
    o.onEnd(dx, cancelled ? 0 : tracker.velocity(), cancelled)
  }
  const onPointerUp = (event: PointerEvent) => finish(event, false)
  const onPointerCancel = (event: PointerEvent) => finish(event, true)

  el.addEventListener('pointerdown', onPointerDown)
  return () => {
    stop()
    el.removeEventListener('pointerdown', onPointerDown)
  }
}
