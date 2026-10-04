// Bottom-sheet physics shared by the Vue (<MlBottomSheet>) and React (<BottomSheet>)
// versions: snap-point parsing, rubber banding, velocity-aware release and the
// pointer / touch gesture. No framework imports.

/** A snap point: px number, `'320px'` or a share of the container, `'60%'`. */
export type SheetSnapPoint = number | string

/** Snap point → px for a container `containerHeight` tall (clamped to it). */
export function parseSnapPoint(point: SheetSnapPoint, containerHeight: number): number {
  let px: number
  if (typeof point === 'number') px = point
  else {
    const value = parseFloat(point)
    px = point.trim().endsWith('%') ? (value / 100) * containerHeight : value
  }
  if (!Number.isFinite(px)) px = 0
  return Math.max(0, Math.min(containerHeight, Math.round(px)))
}

/** Every snap point in px, in the order given (callers pass them low → high). */
export function resolveSnapPoints(points: readonly SheetSnapPoint[], containerHeight: number): number[] {
  return points.map((p) => parseSnapPoint(p, containerHeight))
}

/** The CSS length a snap point stands for, before the container is measured (SSR, first render). */
export function snapPointCss(point: SheetSnapPoint): string {
  return typeof point === 'number' ? `${point}px` : point
}

/**
 * iOS-style rubber band: the further past the limit, the less it moves.
 * `distance` past the edge → visible overshoot, never more than `dimension`.
 */
export function rubberBand(distance: number, dimension: number, constant = 0.55): number {
  if (distance <= 0 || dimension <= 0) return 0
  return (1 - 1 / ((distance * constant) / dimension + 1)) * dimension
}

export interface SheetPosition {
  /** Panel height (only meaningful with snap points). */
  height: number
  /** translateY of the panel: positive = pushed down, negative = pulled past the top snap. */
  offset: number
  /** How shown the sheet is, 0 … 1 (drives the backdrop). */
  progress: number
}

/**
 * Where to draw the sheet for a raw (finger-following) height: between the
 * lowest and highest snap it follows the finger; past the top it rubber-bands;
 * below the lowest it slides away if dismissible, or rubber-bands if not.
 */
export function sheetPosition(raw: number, snaps: readonly number[], dismissible: boolean, dimension: number): SheetPosition {
  const min = snaps.length ? Math.min(...snaps) : 0
  const max = snaps.length ? Math.max(...snaps) : 0
  if (raw > max) return { height: max, offset: -rubberBand(raw - max, dimension), progress: 1 }
  if (raw < min) {
    const offset = dismissible ? Math.min(min, min - raw) : rubberBand(min - raw, dimension)
    return { height: min, offset, progress: min > 0 ? Math.max(0, Math.min(1, (min - offset) / min)) : 0 }
  }
  return { height: raw, offset: 0, progress: 1 }
}

export interface SheetReleaseOptions {
  /** Raw height when the finger lifted. */
  height: number
  /** px / ms, positive = moving up (growing). */
  velocity: number
  /** Snap heights in px, ascending. */
  snaps: readonly number[]
  dismissible: boolean
  /** Speed that counts as a flick (px / ms). */
  flick?: number
  /** How far ahead (ms) the release velocity carries the sheet. */
  projection?: number
}

/**
 * Snap index to settle on after a drag, or -1 to close. The sheet coasts to the
 * snap nearest its projected position; a flick always moves at least one snap
 * in its direction (and a downward flick from the lowest snap dismisses).
 */
export function releaseSnap({ height, velocity, snaps, dismissible, flick = 0.5, projection = 180 }: SheetReleaseOptions): number {
  if (!snaps.length) return dismissible ? -1 : 0
  const candidates = dismissible ? [0, ...snaps] : [...snaps]
  const projected = height + velocity * projection
  let best = 0
  for (let i = 1; i < candidates.length; i++) {
    if (Math.abs(candidates[i] - projected) < Math.abs(candidates[best] - projected)) best = i
  }
  if (Math.abs(velocity) >= flick) {
    if (velocity > 0 && candidates[best] <= height) {
      const up = candidates.findIndex((c) => c > height + 1)
      best = up === -1 ? candidates.length - 1 : up
    } else if (velocity < 0 && candidates[best] >= height) {
      let down = -1
      for (let i = candidates.length - 1; i >= 0; i--) {
        if (candidates[i] < height - 1) {
          down = i
          break
        }
      }
      best = down === -1 ? 0 : down
    }
  }
  return dismissible ? best - 1 : best
}

/** Index of the snap closest to `height`. */
export function nearestSnap(height: number, snaps: readonly number[]): number {
  let best = 0
  for (let i = 1; i < snaps.length; i++) if (Math.abs(snaps[i] - height) < Math.abs(snaps[best] - height)) best = i
  return best
}

/** Release velocity from the last ~100 ms of samples. */
export class VelocityTracker {
  private samples: { t: number; v: number }[] = []
  constructor(private window = 100) {}
  reset() {
    this.samples = []
  }
  add(value: number, time: number) {
    this.samples.push({ t: time, v: value })
    while (this.samples.length > 2 && time - this.samples[0].t > this.window) this.samples.shift()
  }
  /** Units per ms (0 with fewer than two samples or a stale last sample). */
  velocity(now = this.samples[this.samples.length - 1]?.t ?? 0): number {
    const s = this.samples
    if (s.length < 2) return 0
    const last = s[s.length - 1]
    if (now - last.t > this.window) return 0
    const first = s[0]
    const dt = last.t - first.t
    return dt > 0 ? (last.v - first.v) / dt : 0
  }
}

/* ── Gesture ─────────────────────────────────────────── */

export interface SheetGestureHost {
  /** Rest snap heights in px, ascending (one entry for a content-sized sheet). */
  snaps(): number[]
  /** Current rest index. */
  index(): number
  /** Height the sheet rests at right now. */
  restHeight(): number
  /** The scrolling content area: drags starting there wait for it to be scrolled to the top. */
  body(): HTMLElement | null
  /** False → no dragging at all. */
  enabled(): boolean
  /** Finger-following raw height while dragging. */
  move(raw: number): void
  /** Drag started (true) / ended (false). */
  dragging(on: boolean): void
  /** Settle on a snap index, or -1 to dismiss. */
  release(index: number, raw: number): void
  dismissible(): boolean
}

const SLOP = 6
const NO_DRAG = 'input, textarea, select, [contenteditable=""], [contenteditable="true"], [data-sheet-no-drag]'

/** True when nothing between `target` and `body` is scrolled down. */
function atTop(target: Element | null, body: HTMLElement): boolean {
  for (let el: Element | null = target; el && el !== body.parentElement; el = el.parentElement) {
    if ((el as HTMLElement).scrollTop > 0) return false
    if (el === body) break
  }
  return true
}

/**
 * Wires the drag gesture onto a sheet panel. Mouse and pen use pointer events;
 * touch uses touch events, so a drag can claim the gesture (preventDefault on
 * the first touchmove) before the browser starts scrolling the content.
 * Returns the cleanup function.
 */
export function bindSheetGesture(panel: HTMLElement, host: SheetGestureHost): () => void {
  const tracker = new VelocityTracker()
  let pending: { y: number; startH: number; zone: 'grip' | 'body'; target: Element | null; pointerId?: number } | null = null
  let active = false
  let raw = 0
  let startY = 0
  let suppressClick = false

  function begin(y: number, target: Element | null, pointerType: string): boolean {
    if (!host.enabled() || (target && target.closest(NO_DRAG))) return false
    const body = host.body()
    const zone = body && target && body.contains(target) ? 'body' : 'grip'
    // A mouse drag inside the content is text selection, not a sheet drag.
    if (zone === 'body' && pointerType === 'mouse') return false
    pending = { y, startH: host.restHeight(), zone, target }
    active = false
    tracker.reset()
    return true
  }

  /** Returns true while the sheet owns the gesture. */
  function moveTo(y: number, time: number): boolean {
    if (!pending) return false
    if (!active) {
      const dy = y - pending.y
      if (Math.abs(dy) < SLOP) return false
      if (pending.zone === 'body') {
        const body = host.body()
        const pullDown = dy > 0 && !!body && atTop(pending.target, body)
        const pushUp = dy < 0 && host.index() < host.snaps().length - 1
        if (!pullDown && !pushUp) {
          pending = null
          return false
        }
      }
      active = true
      startY = y
      host.dragging(true)
    }
    raw = pending.startH - (y - startY)
    tracker.add(raw, time)
    host.move(raw)
    return true
  }

  function finish(cancelled = false) {
    if (!pending) return
    const wasActive = active
    pending = null
    active = false
    if (!wasActive) return
    host.dragging(false)
    suppressClick = true
    setTimeout(() => (suppressClick = false), 0)
    const snaps = host.snaps()
    const target = cancelled
      ? host.index()
      : releaseSnap({ height: raw, velocity: tracker.velocity(now()), snaps, dismissible: host.dismissible() })
    host.release(target, raw)
  }

  const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now())

  /* Mouse / pen */
  function onPointerDown(e: PointerEvent) {
    if (e.pointerType === 'touch' || e.button !== 0) return
    if (!begin(e.clientY, e.target as Element, e.pointerType)) return
    pending!.pointerId = e.pointerId
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerCancel)
  }
  function onPointerMove(e: PointerEvent) {
    if (!pending || e.pointerId !== pending.pointerId) return
    if (moveTo(e.clientY, e.timeStamp || now())) e.preventDefault()
  }
  function stopPointer() {
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', onPointerUp)
    window.removeEventListener('pointercancel', onPointerCancel)
  }
  function onPointerUp(e: PointerEvent) {
    if (pending && e.pointerId !== pending.pointerId) return
    stopPointer()
    finish()
  }
  function onPointerCancel() {
    stopPointer()
    finish(true)
  }

  /* Touch */
  let touchId: number | null = null
  function onTouchStart(e: TouchEvent) {
    if (e.touches.length !== 1) {
      finish(true)
      touchId = null
      return
    }
    const t = e.changedTouches[0]
    if (begin(t.clientY, e.target as Element, 'touch')) touchId = t.identifier
  }
  function touchOf(e: TouchEvent) {
    for (const t of e.changedTouches) if (t.identifier === touchId) return t
    return null
  }
  function onTouchMove(e: TouchEvent) {
    const t = touchOf(e)
    if (!t) return
    if (moveTo(t.clientY, e.timeStamp || now()) && e.cancelable) e.preventDefault()
  }
  function onTouchEnd(e: TouchEvent) {
    if (!touchOf(e)) return
    touchId = null
    finish(e.type === 'touchcancel')
  }

  // A click right after a drag (e.g. on a header button) isn't a click.
  function onClick(e: MouseEvent) {
    if (!suppressClick) return
    e.preventDefault()
    e.stopPropagation()
  }

  panel.addEventListener('pointerdown', onPointerDown)
  panel.addEventListener('touchstart', onTouchStart, { passive: true })
  panel.addEventListener('touchmove', onTouchMove, { passive: false })
  panel.addEventListener('touchend', onTouchEnd)
  panel.addEventListener('touchcancel', onTouchEnd)
  panel.addEventListener('click', onClick, true)
  return () => {
    stopPointer()
    panel.removeEventListener('pointerdown', onPointerDown)
    panel.removeEventListener('touchstart', onTouchStart)
    panel.removeEventListener('touchmove', onTouchMove)
    panel.removeEventListener('touchend', onTouchEnd)
    panel.removeEventListener('touchcancel', onTouchEnd)
    panel.removeEventListener('click', onClick, true)
  }
}

/** Snap index after a key press on the handle, or null for keys it ignores. */
export function snapKey(key: string, index: number, count: number): number | null {
  const last = count - 1
  switch (key) {
    case 'ArrowUp':
    case 'ArrowRight':
    case 'PageUp':
      return Math.min(last, index + 1)
    case 'ArrowDown':
    case 'ArrowLeft':
    case 'PageDown':
      return Math.max(0, index - 1)
    case 'Home':
      return 0
    case 'End':
      return last
    case 'Enter':
    case ' ':
      return index >= last ? 0 : index + 1
    default:
      return null
  }
}

/**
 * Make every <body> child except `keep` inert (modal sheets), returning the
 * undo. Elements that were already inert are left alone.
 */
export function inertSiblings(keep: Element): () => void {
  if (typeof document === 'undefined') return () => {}
  let top: Element = keep
  while (top.parentElement && top.parentElement !== document.body) top = top.parentElement
  if (top.parentElement !== document.body) return () => {}
  const changed: Element[] = []
  for (const el of document.body.children) {
    if (el === top || el.hasAttribute('inert') || el.tagName === 'SCRIPT' || el.tagName === 'STYLE') continue
    el.setAttribute('inert', '')
    changed.push(el)
  }
  return () => changed.forEach((el) => el.removeAttribute('inert'))
}
