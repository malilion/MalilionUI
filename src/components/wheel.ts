// MlLuckyWheel maths and motion — framework-free, shared by the Vue and React
// components. Angles are degrees, measured clockwise from 12 o'clock; the
// wheel's rotation is clockwise-positive and the pointer sits at the top.
import { chartStops } from './charts'
import type { IconName } from './icons'
import type { MlChartTone } from '../types'

export interface MlWheelPrize {
  label: string
  /** A built-in icon drawn in the slice. */
  icon?: IconName
  /** Image URL drawn in the slice (clipped to a circle); wins over `icon`. */
  image?: string
  /** Metal finish for the slice. */
  tone?: MlChartTone
  /** Any CSS colour; wins over `tone`. */
  color?: string
  /** Relative odds for spin() without an index. Default 1; 0 never wins. */
  weight?: number
  /** Greyed out and never picked by weight (an explicit spin(i) still lands on it). */
  disabled?: boolean
}

/* ── Geometry ─────────────────────────────────────────────── */

export const WHEEL_C = 100
/** Radius of the prize face inside the 200×200 viewBox. */
export const WHEEL_R = 82

export const mod = (a: number, n: number) => ((a % n) + n) % n

/** Point at `deg` (clockwise from 12 o'clock) and radius `r` around the centre. */
export function wheelPolar(deg: number, r: number, c = WHEEL_C) {
  const a = ((deg - 90) * Math.PI) / 180
  return { x: c + Math.cos(a) * r, y: c + Math.sin(a) * r }
}

const f2 = (n: number) => n.toFixed(2)

/** Wedge path for slice `index` of `count`, spanning [index·seg, (index+1)·seg]. */
export function slicePath(index: number, count: number, r = WHEEL_R) {
  if (count <= 1) {
    return `M${WHEEL_C} ${WHEEL_C - r}A${r} ${r} 0 1 1 ${WHEEL_C - 0.01} ${WHEEL_C - r}Z`
  }
  const seg = 360 / count
  const a = wheelPolar(index * seg, r)
  const b = wheelPolar((index + 1) * seg, r)
  return `M${WHEEL_C} ${WHEEL_C}L${f2(a.x)} ${f2(a.y)}A${r} ${r} 0 ${seg > 180 ? 1 : 0} 1 ${f2(b.x)} ${f2(b.y)}Z`
}

/** Which slice sits under the top pointer when the wheel is rotated by `rotation`. */
export function indexAtPointer(rotation: number, count: number) {
  if (count <= 0) return -1
  const seg = 360 / count
  return Math.min(count - 1, Math.floor(mod(-rotation, 360) / seg))
}

/**
 * The rotation to stop at so slice `index` ends under the pointer, at least
 * `turns` full turns past `from`. `offset` (0–1) is where inside the slice the
 * pointer lands; keep it away from the edges so the result is unambiguous.
 */
export function landingRotation(from: number, index: number, count: number, turns: number, offset = 0.5) {
  const seg = 360 / count
  const wheelAngle = (index + offset) * seg
  const base = from + Math.max(0, turns) * 360
  return base + mod(-wheelAngle - base, 360)
}

/** A random spot inside a slice that leaves room for the overshoot and the pegs. */
export const landingOffset = (random: () => number = Math.random) => 0.32 + random() * 0.44

/** How far (deg) the wheel overshoots before settling back: a fraction of a slice. */
export const overshootFor = (count: number) => Math.min(7, (360 / Math.max(1, count)) * 0.16)

/**
 * Pointer kick (deg, negative = flicked left) as a peg passes under it: a
 * sharp hit right after a slice boundary crosses the top, easing back.
 */
export function pointerKick(rotation: number, count: number, max = 24) {
  if (count <= 1) return 0
  const seg = 360 / count
  // Distance (in slices) the wheel has turned since the last peg passed the top.
  const since = mod(rotation, seg) / seg
  const window = 0.2
  return since < window ? -max * (1 - since / window) : 0
}

/* ── Picking ──────────────────────────────────────────────── */

export const prizeWeight = (p: MlWheelPrize) => (p.disabled ? 0 : Math.max(0, Number.isFinite(p.weight) ? (p.weight as number) : 1))

/** Pick an index by weight; disabled / zero-weight prizes never win. -1 when nothing can. */
export function pickWeighted(prizes: readonly MlWheelPrize[], random: () => number = Math.random) {
  const weights = prizes.map(prizeWeight)
  const total = weights.reduce((s, w) => s + w, 0)
  if (total <= 0) return -1
  let r = random() * total
  for (let i = 0; i < weights.length; i++) {
    if (weights[i] <= 0) continue
    if (r < weights[i]) return i
    r -= weights[i]
  }
  // Floating-point leftovers: the last prize that can win.
  for (let i = weights.length - 1; i >= 0; i--) if (weights[i] > 0) return i
  return -1
}

/** Win chance per prize, 0–1. */
export function prizeOdds(prizes: readonly MlWheelPrize[]) {
  const weights = prizes.map(prizeWeight)
  const total = weights.reduce((s, w) => s + w, 0)
  return weights.map((w) => (total ? w / total : 0))
}

/** A Promise or any other thenable (e.g. from another realm or library). */
export const isThenable = (v: unknown): v is PromiseLike<number | false | void> =>
  !!v && (typeof v === 'object' || typeof v === 'function') && typeof (v as PromiseLike<unknown>).then === 'function'

/* ── Colour ───────────────────────────────────────────────── */

const DEFAULT_TONES: MlChartTone[] = ['gold', 'steel', 'bean', 'tech']

/** The tone a slice uses when it has no colour of its own; neighbours never match. */
export function sliceTone(prizes: readonly MlWheelPrize[], index: number): MlChartTone {
  const own = prizes[index]?.tone
  if (own) return own
  const tone = DEFAULT_TONES[index % DEFAULT_TONES.length]
  const n = prizes.length
  // Wrapping around: the last slice must not repeat the first one.
  if (n > 1 && index === n - 1 && !prizes[0]?.tone && !prizes[0]?.color && tone === DEFAULT_TONES[0]) return 'success'
  return tone
}

/** Relative luminance of a #rgb / #rrggbb colour, or undefined for anything else. */
export function luminance(color: string) {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color.trim())
  if (!m) return undefined
  const hex = m[1].length === 3 ? [...m[1]].map((c) => c + c).join('') : m[1]
  const [r, g, b] = [0, 2, 4].map((i) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export interface WheelSlice {
  index: number
  prize: MlWheelPrize
  d: string
  /** fill attribute: a gradient url for tones, the raw colour otherwise. */
  fill: string
  /** Gradient id this slice needs (tones only). */
  tone?: MlChartTone
  /** 'dark' text on light slices, 'light' text on dark ones. */
  ink: 'dark' | 'light'
  /** Slice centre angle. */
  mid: number
  label: { x: number; y: number; rotate: number }
  media: { x: number; y: number; size: number; rotate: number }
}

/** Everything the template needs to draw the slices. `uid` prefixes gradient ids. */
export function wheelSlices(prizes: readonly MlWheelPrize[], uid: string): WheelSlice[] {
  const n = prizes.length
  const seg = 360 / Math.max(1, n)
  return prizes.map((prize, index) => {
    const mid = (index + 0.5) * seg
    const tone = prize.color ? undefined : sliceTone(prizes, index)
    const lum = prize.color ? luminance(prize.color) : undefined
    const ink = lum !== undefined && lum < 0.36 ? 'light' : 'dark'
    const hasMedia = !!(prize.image || prize.icon)
    const lp = wheelPolar(mid, hasMedia ? WHEEL_R * 0.74 : WHEEL_R * 0.62)
    const size = Math.min(20, Math.max(10, seg * 0.42))
    const mp = wheelPolar(mid, WHEEL_R * 0.53)
    return {
      index,
      prize,
      d: slicePath(index, n),
      fill: prize.color ?? `url(#${uid}-${tone})`,
      tone,
      ink,
      mid,
      label: { x: +f2(lp.x), y: +f2(lp.y), rotate: +f2(mid) },
      media: { x: +f2(mp.x - size / 2), y: +f2(mp.y - size / 2), size: +f2(size), rotate: +f2(mid) },
    }
  })
}

/** Gradient stops for the tones actually used, outer → inner. */
export function usedTones(slices: readonly WheelSlice[]) {
  const seen = new Set<MlChartTone>()
  for (const s of slices) if (s.tone) seen.add(s.tone)
  return [...seen].map((tone) => ({ tone, stops: chartStops[tone] }))
}

/** Label font size (viewBox units) that fits `count` slices. */
export const labelSize = (count: number) => (count > 12 ? 6.5 : count > 8 ? 7.5 : count > 5 ? 9 : 10.5)

/** Rim bulbs: two per slice, at least 16, at most 36. */
export function rimLights(count: number, r = 93) {
  const n = Math.min(36, Math.max(16, count * 2))
  return Array.from({ length: n }, (_, i) => {
    const p = wheelPolar((i * 360) / n, r)
    return { x: +f2(p.x), y: +f2(p.y), i }
  })
}

/** Pegs on the face, one per slice boundary. */
export function pegs(count: number, r = WHEEL_R - 3) {
  if (count <= 1) return []
  return Array.from({ length: count }, (_, i) => {
    const p = wheelPolar((i * 360) / count, r)
    return { x: +f2(p.x), y: +f2(p.y) }
  })
}

/* ── Motion ───────────────────────────────────────────────── */

/** Share of the spin spent settling back from the overshoot. */
export const SETTLE = 0.14
/** Reduced motion: a short fade instead of the spin. */
export const FADE_MS = 360
/** Async draws: time to wind up to cruising speed. */
export const RAMP_MS = 450

const easeOutQuart = (t: number) => 1 - (1 - t) ** 4
const easeInOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2

/**
 * A deceleration from `from`: a long ease-out that runs `overshoot` degrees
 * past `from + distance` in `main` ms, then settles back in `settle` ms.
 * Starting velocity is 4·(distance + overshoot) / main deg/ms.
 */
export function decelAngle(elapsed: number, from: number, distance: number, overshoot: number, main: number, settle: number) {
  if (elapsed <= 0) return from
  if (elapsed < main) return from + (distance + overshoot) * easeOutQuart(elapsed / main)
  if (elapsed < main + settle) return from + distance + overshoot * (1 - easeInOutSine((elapsed - main) / settle))
  return from + distance
}

/** Rotation over a whole spin from rest: fast start, long ease-out, small overshoot and settle. */
export function spinAngle(elapsed: number, from: number, to: number, duration: number, overshoot: number) {
  const settle = duration * SETTLE
  return decelAngle(elapsed, from, to - from, overshoot, duration - settle, settle)
}

/** Async cruise: ease up to `speed` deg/ms over RAMP_MS, then hold it. */
export function cruiseAngle(elapsed: number, from: number, speed: number) {
  if (elapsed <= 0) return from
  if (elapsed < RAMP_MS) return from + (speed * elapsed * elapsed) / (2 * RAMP_MS)
  return from + speed * (elapsed - RAMP_MS / 2)
}

export interface SpinnerOptions {
  /** Called with the cumulative rotation on every frame. */
  onAngle: (rotation: number) => void
  /** Called once the wheel has stopped on the target. */
  onLand: (rotation: number) => void
}

/**
 * Drives one spin at a time with requestAnimationFrame. `land()` spins from
 * rest; `cruise()` + `landFromCruise()` spin while a server decides.
 */
export class WheelSpinner {
  rotation = 0
  private frame = 0
  private timer: ReturnType<typeof setTimeout> | undefined
  private cruiseStart = 0
  private cruiseFrom = 0
  private speed = 0
  private opts: SpinnerOptions

  constructor(opts: SpinnerOptions, rotation = 0) {
    this.opts = opts
    this.rotation = rotation
  }

  private set(r: number) {
    this.rotation = r
    this.opts.onAngle(r)
  }

  private finish(r: number) {
    // Keep the number small; rotate(x) and rotate(x mod 360) look the same.
    this.set(mod(r, 360))
    this.opts.onLand(this.rotation)
  }

  /** Run `angleAt(elapsed)` until `total` ms. */
  private run(total: number, angleAt: (elapsed: number) => number, done?: () => void) {
    this.stop()
    const start = performance.now()
    const tick = (now: number) => {
      const elapsed = now - start
      if (elapsed >= total) {
        this.frame = 0
        this.set(angleAt(total))
        done?.()
        return
      }
      this.set(angleAt(elapsed))
      this.frame = requestAnimationFrame(tick)
    }
    this.frame = requestAnimationFrame(tick)
  }

  /** Spin from rest and stop with `index` under the pointer. */
  land(index: number, count: number, { duration, turns, reduced, random = Math.random }: { duration: number; turns: number; reduced?: boolean; random?: () => number }) {
    const from = this.rotation
    const to = landingRotation(from, index, count, turns, landingOffset(random))
    if (reduced || duration <= 0) {
      this.stop()
      this.set(to)
      this.timer = setTimeout(() => this.finish(to), reduced ? FADE_MS : 0)
      return
    }
    const overshoot = overshootFor(count)
    this.run(duration, (e) => spinAngle(e, from, to, duration, overshoot), () => this.finish(to))
  }

  /** Start spinning at a steady `speed` (deg/ms) until landFromCruise(). */
  cruise(speed: number) {
    this.stop()
    this.speed = speed
    this.cruiseFrom = this.rotation
    this.cruiseStart = performance.now()
    const tick = (now: number) => {
      this.set(cruiseAngle(now - this.cruiseStart, this.cruiseFrom, speed))
      this.frame = requestAnimationFrame(tick)
    }
    this.frame = requestAnimationFrame(tick)
  }

  /**
   * Slow down from cruising and stop on `index` (or anywhere, with -1), taking
   * about `duration` ms. Velocity is continuous, so there is no visible jolt.
   */
  landFromCruise(index: number, count: number, { duration, random = Math.random }: { duration: number; random?: () => number }) {
    const now = performance.now() - this.cruiseStart
    // Still winding up? Keep cruising until full speed, then brake.
    const handoff = Math.max(now, RAMP_MS)
    const cruiseFrom = this.cruiseFrom
    const v = this.speed
    const from = cruiseAngle(handoff, cruiseFrom, v)
    const overshoot = index >= 0 ? overshootFor(count) : 0
    const main = duration * (1 - SETTLE)
    // The distance a quartic ease-out covers when it starts at speed v.
    const natural = Math.max(0, (v * main) / 4 - overshoot)
    let to = from + natural
    if (index >= 0) {
      const first = landingRotation(from, index, count, 0, landingOffset(random))
      to = first + Math.max(0, Math.round((from + natural - first) / 360)) * 360
    }
    const distance = to - from
    const brake = (4 * (distance + overshoot)) / v
    const settle = overshoot ? duration * SETTLE : 0
    const wait = handoff - now
    this.run(wait + brake + settle, (e) => (e < wait ? cruiseAngle(now + e, cruiseFrom, v) : decelAngle(e - wait, from, distance, overshoot, brake, settle)), () => this.finish(to))
  }

  /** Stop where the wheel is and report it as landed (no animation). */
  halt() {
    this.stop()
    this.timer = setTimeout(() => this.finish(this.rotation), 0)
  }

  /** Cancel whatever is running (the wheel stays where it is). */
  stop() {
    if (this.frame) cancelAnimationFrame(this.frame)
    this.frame = 0
    if (this.timer) clearTimeout(this.timer)
    this.timer = undefined
  }
}
