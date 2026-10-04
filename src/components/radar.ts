// MlRadar / Radar: blip geometry, sweep timing and the glow each blip gets as
// the sweep passes. Angles are compass bearings: 0° = up (north), clockwise.
import { motionGate, type MotionState } from './ambient'

export type MlRadarTone = 'gold' | 'tech' | 'bean' | 'success' | 'danger'

export interface MlRadarBlip {
  /** Bearing in degrees, 0 = up, clockwise. Use this with `distance`… */
  angle?: number
  /** 0 (centre) – 1 (outer ring). */
  distance?: number
  /** …or cartesian, -1…1 from the centre, y pointing up. */
  x?: number
  y?: number
  label?: string
  tone?: MlRadarTone
}

/** The SVG grid is drawn in a 200×200 box; the outer ring has this radius. */
export const RADAR_SIZE = 200
export const RADAR_RADIUS = 96
/** Sweep angle of the still frame (SSR, reduced motion). */
export const RADAR_REST_ANGLE = 58
/** Blips never fade below this. */
export const RADAR_GLOW_FLOOR = 0.18

const norm = (deg: number) => ((deg % 360) + 360) % 360
const round = (v: number, d = 2) => Math.round(v * 10 ** d) / 10 ** d

/** Bearing (0–360) and distance (0–1) of a blip, whichever way it was given. */
export function radarPolar(b: MlRadarBlip): { angle: number; distance: number } {
  if (b.angle === undefined && (b.x !== undefined || b.y !== undefined)) {
    const x = b.x ?? 0
    const y = b.y ?? 0
    return { angle: round(norm((Math.atan2(x, y) * 180) / Math.PI)), distance: round(Math.min(1, Math.hypot(x, y)), 4) }
  }
  return { angle: round(norm(b.angle ?? 0)), distance: round(Math.min(1, Math.max(0, b.distance ?? 0)), 4) }
}

/** Where a blip sits, as left / top percentages of the scope. */
export function radarPosition(b: MlRadarBlip): { left: number; top: number } {
  const { angle, distance } = radarPolar(b)
  const rad = (angle * Math.PI) / 180
  const r = (distance * RADAR_RADIUS) / RADAR_SIZE
  return { left: round(50 + Math.sin(rad) * r * 100), top: round(50 - Math.cos(rad) * r * 100) }
}

/**
 * How bright a blip at `angle` is while the sweep points at `sweep`: 1 the
 * moment the beam crosses it, fading over the `trail` that follows to the floor.
 */
export function radarGlow(sweep: number, angle: number, trail = 90, clockwise = true): number {
  const behind = clockwise ? norm(sweep - angle) : norm(angle - sweep)
  const fade = Math.max(30, trail * 2.2)
  if (behind >= fade) return RADAR_GLOW_FLOOR
  const t = behind / fade
  return round(RADAR_GLOW_FLOOR + (1 - RADAR_GLOW_FLOOR) * (1 - t) * (1 - t), 3)
}

/** Sweep bearing after `ms`, turning at `speed` degrees per second. */
export function radarSweepAngle(ms: number, speed: number, start = RADAR_REST_ANGLE): number {
  return norm(start + (ms / 1000) * speed)
}

/** Ring radii in view-box units, inner to outer. */
export function radarRings(n: number): number[] {
  const count = Math.max(1, Math.round(n))
  return Array.from({ length: count }, (_, i) => round((RADAR_RADIUS * (i + 1)) / count))
}

/** Bearing ticks round the rim: long every 30°, short every 10°. */
export function radarTicks(): string {
  const c = RADAR_SIZE / 2
  let d = ''
  for (let deg = 0; deg < 360; deg += 10) {
    const rad = (deg * Math.PI) / 180
    const inner = RADAR_RADIUS - (deg % 30 === 0 ? 6 : 3)
    const p = (r: number) => `${round(c + Math.sin(rad) * r)} ${round(c - Math.cos(rad) * r)}`
    d += `M${p(inner)}L${p(RADAR_RADIUS)}`
  }
  return d
}

/** "045°" */
export const radarBearing = (angle: number) => `${String(Math.round(norm(angle)) % 360).padStart(3, '0')}°`

/** Labels for each ring: explicit ones win, else `range` split evenly with an optional unit. */
export function radarRangeLabels(rings: number, opts: { labels?: readonly string[]; range?: number; unit?: string }): string[] {
  if (opts.labels?.length) return opts.labels.slice(0, rings)
  if (!opts.range) return []
  return radarRings(rings).map((_, i) => {
    const v = round((opts.range! * (i + 1)) / rings, 1)
    return opts.unit ? `${v} ${opts.unit}` : String(v)
  })
}

/* ── Controller ─────────────────────────────────────────── */

export interface RadarController {
  update: (opts: { speed?: number; trail?: number; paused?: boolean }) => void
  destroy: () => void
}

/**
 * Turns the sweep and lights the blips by writing `--_rd-live` on the sweep and
 * on each `.ml-radar-scope__blip` (the framework never renders that variable, so a
 * re-render can't fight the loop). Off screen, hidden tab, paused or reduced
 * motion → the loop stops where it is.
 */
export function mountRadar(scope: HTMLElement, angles: () => number[], initial: { speed: number; trail: number; paused: boolean }): RadarController {
  let opts = { ...initial }
  let motion: MotionState = { running: false, inView: true, visible: true, reduced: false }
  let frame = 0
  let last = 0
  let sweep = RADAR_REST_ANGLE

  const paint = () => {
    const el = scope.querySelector<HTMLElement>('.ml-radar-scope__sweep')
    el?.style.setProperty('--_rd-live', `${round(sweep, 1)}deg`)
    const list = angles()
    scope.querySelectorAll<HTMLElement>('.ml-radar-scope__blip').forEach((b, i) => {
      if (list[i] !== undefined) b.style.setProperty('--_rd-live', String(radarGlow(sweep, list[i], opts.trail, opts.speed >= 0)))
    })
  }

  const live = () => motion.running && !opts.paused && opts.speed !== 0

  function tick(now: number) {
    frame = 0
    if (!live()) {
      last = 0
      return
    }
    if (last) sweep = norm(sweep + (Math.min(100, now - last) / 1000) * opts.speed)
    last = now
    paint()
    frame = requestAnimationFrame(tick)
  }

  function sync() {
    if (live()) {
      if (!frame && typeof requestAnimationFrame !== 'undefined') frame = requestAnimationFrame(tick)
    } else {
      if (frame) cancelAnimationFrame(frame)
      frame = 0
      last = 0
    }
  }

  const stopGate = motionGate(scope, (state) => {
    motion = state
    sync()
  })

  return {
    update(next) {
      opts = { ...opts, ...next }
      if (!live()) paint()
      sync()
    },
    destroy() {
      if (frame) cancelAnimationFrame(frame)
      frame = 0
      stopGate()
    },
  }
}
