// View maths shared by MlGlobe (Vue) and Globe (React) — framework-free.
// An orthographic globe in a 200×200 view box: land is a dotted Fibonacci
// sphere (the mask lives in ../globe-data, its own chunk), markers and
// great-circle arcs are projected the same way.
import { GLOBE_LAND_BITS, GLOBE_POINT_COUNT } from '../globe-data'

export type MlGlobeTone = 'gold' | 'tech' | 'bean' | 'success' | 'danger'

/** A place on Earth, in degrees: north and east are positive. */
export interface MlGlobePoint {
  lat: number
  lng: number
}

export interface MlGlobeMarker extends MlGlobePoint {
  label?: string
  tone?: MlGlobeTone
  /** Dot radius in view-box units (the globe is 180 across). Default 3. */
  size?: number
  /** A ripple around the dot. Default true. */
  pulse?: boolean
}

export interface MlGlobeArc {
  from: MlGlobePoint
  to: MlGlobePoint
  tone?: MlGlobeTone
  /** How high the arc rises, relative to the globe's radius at its farthest. Default 0.25. */
  lift?: number
}

/** Where the globe is looking: the point at the centre of the disc. */
export type GlobeView = MlGlobePoint

export interface GlobeProjected {
  x: number
  y: number
  /** Depth: 1 facing you, 0 on the rim, negative behind. */
  z: number
  visible: boolean
}

export const GLOBE_SIZE = 200
export const GLOBE_RADIUS = 90
const C = GLOBE_SIZE / 2
const D = Math.PI / 180
const GOLDEN = Math.PI * (3 - Math.sqrt(5))

/** Taiwan, where the lion lives. */
export const GLOBE_HOME: GlobeView = { lat: 23.7, lng: 121 }

const r1 = (v: number) => Math.round(v * 10) / 10

/** Wrap longitude into (-180, 180] and keep latitude off the poles. */
export function globeNormalize(view: GlobeView): GlobeView {
  let lng = ((((view.lng + 180) % 360) + 360) % 360) - 180
  if (lng === -180) lng = 180
  return { lat: Math.max(-85, Math.min(85, view.lat)), lng }
}

/** Unit vector of a lat / lng (y up, z towards lng 0 on the equator). */
export function globeVector(p: MlGlobePoint): [number, number, number] {
  const lat = p.lat * D
  const lng = p.lng * D
  return [Math.cos(lat) * Math.sin(lng), Math.sin(lat), Math.cos(lat) * Math.cos(lng)]
}

/** Rotation that brings `view` to the front, as a function on unit vectors. */
function rotator(view: GlobeView) {
  const a = -view.lng * D
  const b = view.lat * D
  const ca = Math.cos(a)
  const sa = Math.sin(a)
  const cb = Math.cos(b)
  const sb = Math.sin(b)
  return (x: number, y: number, z: number): [number, number, number] => {
    const x1 = x * ca + z * sa
    const z1 = -x * sa + z * ca
    return [x1, y * cb - z1 * sb, y * sb + z1 * cb]
  }
}

/** Screen position (view-box units) of a point on — or `height` above — the globe. */
export function globeProject(p: MlGlobePoint, view: GlobeView, height = 1): GlobeProjected {
  const [x, y, z] = rotator(view)(...globeVector(p))
  return { x: r1(C + GLOBE_RADIUS * x * height), y: r1(C - GLOBE_RADIUS * y * height), z, visible: z > 0 }
}

let landCache: Float32Array | undefined

/** The land dots as xyz triples on the unit sphere (decoded once). */
export function globeLand(): Float32Array {
  if (landCache) return landCache
  const bin = atob(GLOBE_LAND_BITS)
  const pts: number[] = []
  for (let i = 0; i < GLOBE_POINT_COUNT; i++) {
    if (!((bin.charCodeAt(i >> 3) >> (i & 7)) & 1)) continue
    const y = 1 - ((i + 0.5) * 2) / GLOBE_POINT_COUNT
    const r = Math.sqrt(1 - y * y)
    const t = GOLDEN * i
    pts.push(r * Math.sin(t), y, r * Math.cos(t))
  }
  return (landCache = new Float32Array(pts))
}

/**
 * The visible land as three path strings of zero-length segments (drawn as
 * dots by a round line cap): facing you, turning away, and at the rim.
 */
export function globeDots(view: GlobeView): [string, string, string] {
  const land = globeLand()
  const rot = rotator(view)
  const out: [string[], string[], string[]] = [[], [], []]
  for (let i = 0; i < land.length; i += 3) {
    const [x, y, z] = rot(land[i], land[i + 1], land[i + 2])
    if (z <= 0.02) continue
    out[z > 0.55 ? 0 : z > 0.22 ? 1 : 2].push(`M${r1(C + GLOBE_RADIUS * x)} ${r1(C - GLOBE_RADIUS * y)}h0`)
  }
  return [out[0].join(''), out[1].join(''), out[2].join('')]
}

/** Parallels and meridians every `step` degrees, front half only. */
export function globeGraticule(view: GlobeView, step = 30): string {
  const rot = rotator(view)
  const parts: string[] = []
  const trace = (points: MlGlobePoint[]) => {
    let pen = false
    for (const p of points) {
      const [x, y, z] = rot(...globeVector(p))
      if (z <= 0) {
        pen = false
        continue
      }
      parts.push(`${pen ? 'L' : 'M'}${r1(C + GLOBE_RADIUS * x)} ${r1(C - GLOBE_RADIUS * y)}`)
      pen = true
    }
  }
  const range = (from: number, to: number, by: number) => Array.from({ length: Math.round((to - from) / by) + 1 }, (_, i) => from + i * by)
  for (let lat = -90 + step; lat < 90; lat += step) trace(range(-180, 180, 4).map((lng) => ({ lat, lng })))
  for (let lng = -180; lng < 180; lng += step) trace(range(-90, 90, 4).map((lat) => ({ lat, lng })))
  return parts.join('')
}

/** Great-circle distance in degrees. */
export function globeDistance(a: MlGlobePoint, b: MlGlobePoint): number {
  const [ax, ay, az] = globeVector(a)
  const [bx, by, bz] = globeVector(b)
  return Math.acos(Math.max(-1, Math.min(1, ax * bx + ay * by + az * bz))) / D
}

/**
 * A great-circle arc that rises off the surface, as a path of the parts you
 * can see (in front of the globe, or beyond its rim). Empty when hidden.
 */
export function globeArcPath(arc: MlGlobeArc, view: GlobeView, samples = 48): string {
  const a = globeVector(arc.from)
  const b = globeVector(arc.to)
  const dot = Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]))
  const w = Math.acos(dot)
  if (w < 1e-4) return ''
  const sw = Math.sin(w)
  const lift = (arc.lift ?? 0.25) * Math.min(1, w / (Math.PI / 2))
  const rot = rotator(view)
  const parts: string[] = []
  let pen = false
  for (let i = 0; i <= samples; i++) {
    const t = i / samples
    // Antipodes have no single great circle; nudge through the north.
    const ka = sw < 1e-6 ? Math.cos(t * Math.PI) : Math.sin((1 - t) * w) / sw
    const kb = sw < 1e-6 ? 0 : Math.sin(t * w) / sw
    const h = 1 + lift * Math.sin(t * Math.PI)
    let px = ka * a[0] + kb * b[0]
    let py = ka * a[1] + kb * b[1] + (sw < 1e-6 ? Math.sin(t * Math.PI) : 0)
    let pz = ka * a[2] + kb * b[2]
    const len = Math.hypot(px, py, pz) || 1
    px = (px / len) * h
    py = (py / len) * h
    pz = (pz / len) * h
    const [x, y, z] = rot(px, py, pz)
    if (z < 0 && x * x + y * y < 1) {
      pen = false
      continue
    }
    parts.push(`${pen ? 'L' : 'M'}${r1(C + GLOBE_RADIUS * x)} ${r1(C - GLOBE_RADIUS * y)}`)
    pen = true
  }
  return parts.join('')
}

/** Ease between two views the short way round; t in 0–1. */
export function globeLerpView(from: GlobeView, to: GlobeView, t: number): GlobeView {
  const dLng = ((((to.lng - from.lng + 180) % 360) + 360) % 360) - 180
  return globeNormalize({ lat: from.lat + (to.lat - from.lat) * t, lng: from.lng + dLng * t })
}

/** 25.03°N, 121.56°E */
export function globeFormatPoint(p: MlGlobePoint): string {
  const f = (v: number) => (Math.round(Math.abs(v) * 100) / 100).toString()
  return `${f(p.lat)}°${p.lat < 0 ? 'S' : 'N'}, ${f(p.lng)}°${p.lng < 0 ? 'W' : 'E'}`
}

/** Degrees of rotation per pixel dragged, for a globe drawn `width` px wide. */
export const globeDragScale = (width: number) => 180 / (Math.PI * Math.max(1, (width * GLOBE_RADIUS) / GLOBE_SIZE))

export const globeEase = (t: number) => 1 - Math.pow(1 - t, 3)
