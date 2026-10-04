// MlSwipeStack / SwipeStack — framework-free: the swipe decision (distance or
// fling), card tilt, stamp strength, fly-out targets and a 2-D pointer drag
// controller. Velocity tracking and click swallowing come from ./gesture.
import { createVelocityTracker, swallowNextClick } from './gesture'

export type MlSwipeDirection = 'left' | 'right' | 'up'

/** Default fling speed (px/ms) that throws a card whatever the distance. */
export const SWIPE_STACK_FLICK = 0.5
/** Default share of the card width (or height, upwards) to drag before letting go throws it. */
export const SWIPE_STACK_THRESHOLD = 0.3
/** How long the throw / return animations take, in ms (kept in sync with swipe-stack.css). */
export const SWIPE_STACK_MS = 320

export interface SwipeDecisionOptions {
  width: number
  height: number
  /** Allow throwing upwards. */
  up?: boolean
  threshold?: number
  flick?: number
}

/**
 * Where a card goes when let go after moving (dx, dy) at (vx, vy) px/ms, or
 * null to spring back. A fling beats distance; a fling against the drag
 * cancels it.
 */
export function swipeDecision(dx: number, dy: number, vx: number, vy: number, o: SwipeDecisionOptions): MlSwipeDirection | null {
  const threshold = o.threshold ?? SWIPE_STACK_THRESHOLD
  const flick = o.flick ?? SWIPE_STACK_FLICK
  if (o.up && -dy > Math.abs(dx) && (-dy > o.height * threshold || vy < -flick)) return 'up'
  const side: MlSwipeDirection = dx >= 0 ? 'right' : 'left'
  const sign = dx >= 0 ? 1 : -1
  if (Math.abs(vx) > flick) {
    if (Math.sign(vx) === sign && dx !== 0) return side
    return null
  }
  return Math.abs(dx) > o.width * threshold ? side : null
}

/** Tilt (deg) for a horizontal drag: up to `max` at a full card width. */
export function dragRotation(dx: number, width: number, max = 15): number {
  if (width <= 0) return 0
  return Math.max(-max, Math.min(max, (dx / width) * max * 1.25))
}

/** 0…1 strength of each stamp for a drag, reaching 1 at the throw threshold. */
export function stampStrength(dx: number, dy: number, o: SwipeDecisionOptions): Record<MlSwipeDirection, number> {
  const threshold = o.threshold ?? SWIPE_STACK_THRESHOLD
  const clamp = (v: number) => Math.max(0, Math.min(1, v))
  const upwards = !!o.up && -dy > Math.abs(dx)
  return {
    right: upwards ? 0 : clamp(dx / (o.width * threshold || 1)),
    left: upwards ? 0 : clamp(-dx / (o.width * threshold || 1)),
    up: upwards ? clamp(-dy / (o.height * threshold || 1)) : 0,
  }
}

/** Where a thrown card ends up (px and deg), well outside the stack. */
export function flyOut(direction: MlSwipeDirection, width: number, height: number, dy = 0): { x: number; y: number; r: number } {
  if (direction === 'up') return { x: 0, y: -(height * 1.6 + 120), r: 0 }
  const sign = direction === 'right' ? 1 : -1
  return { x: sign * (width * 1.6 + 120), y: dy * 1.5, r: sign * 24 }
}

export interface StackDragOptions {
  el: HTMLElement
  enabled: () => boolean
  /** Moved past the slop: a drag, not a click. */
  onStart: () => void
  onMove: (dx: number, dy: number) => void
  /** Let go: travel, velocity (px/ms) and whether the browser cancelled it. */
  onEnd: (dx: number, dy: number, vx: number, vy: number, cancelled: boolean) => void
}

const SLOP = 6
const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now())
const TEXT_ENTRY = 'input, textarea, select, [contenteditable]:not([contenteditable="false"])'

/**
 * Free 2-D drag with pointer events (touch, mouse, pen). The element should
 * have `touch-action: none`. Returns a detach function.
 */
export function attachStackDrag(o: StackDragOptions): () => void {
  const { el } = o
  const tx = createVelocityTracker()
  const ty = createVelocityTracker()
  let s: { x: number; y: number; id: number; dx: number; dy: number; dragging: boolean } | null = null

  function down(event: PointerEvent) {
    if (s || !o.enabled() || (event.pointerType === 'mouse' && event.button !== 0)) return
    if ((event.target as Element | null)?.closest?.(TEXT_ENTRY)) return
    s = { x: event.clientX, y: event.clientY, id: event.pointerId, dx: 0, dy: 0, dragging: false }
    tx.reset()
    ty.reset()
    tx.add(now(), event.clientX)
    ty.add(now(), event.clientY)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', cancel)
  }

  function move(event: PointerEvent) {
    if (!s || event.pointerId !== s.id) return
    s.dx = event.clientX - s.x
    s.dy = event.clientY - s.y
    if (!s.dragging) {
      if (Math.hypot(s.dx, s.dy) < SLOP) return
      s.dragging = true
      o.onStart()
    }
    event.preventDefault()
    window.getSelection?.()?.removeAllRanges()
    tx.add(now(), event.clientX)
    ty.add(now(), event.clientY)
    o.onMove(s.dx, s.dy)
  }

  function stop() {
    s = null
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', up)
    window.removeEventListener('pointercancel', cancel)
  }

  function finish(event: PointerEvent, cancelled: boolean) {
    if (!s || event.pointerId !== s.id) return
    const { dx, dy, dragging, x, y } = s
    tx.add(now(), x + dx)
    ty.add(now(), y + dy)
    stop()
    if (!dragging) return
    if (!cancelled) swallowNextClick()
    o.onEnd(dx, dy, cancelled ? 0 : tx.velocity(), cancelled ? 0 : ty.velocity(), cancelled)
  }
  const up = (event: PointerEvent) => finish(event, false)
  const cancel = (event: PointerEvent) => finish(event, true)

  el.addEventListener('pointerdown', down)
  return () => {
    stop()
    el.removeEventListener('pointerdown', down)
  }
}
