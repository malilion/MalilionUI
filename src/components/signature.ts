// Signature strokes: smoothing, velocity / pressure based width and SVG export.
// No framework imports — shared by <MlSignaturePad> and the React <SignaturePad>.

export interface SignaturePoint {
  x: number
  y: number
  /** ms timestamp (event.timeStamp); drives the velocity → width mapping. */
  time: number
  /** 0–1 from a pen; when present it sets the width instead of velocity. */
  pressure?: number
}

export interface SignatureStroke {
  points: SignaturePoint[]
  /** Ink colour; omitted = the pad's themed ink, resolved at draw time. */
  color?: string
  /** Line width range in CSS px. */
  minWidth: number
  maxWidth: number
}

/** One quadratic piece of a stroke, drawn with a round-capped line. */
export interface SignatureSegment {
  x0: number
  y0: number
  cx: number
  cy: number
  x1: number
  y1: number
  width: number
  /** A single tap: draw a filled dot of `width` diameter at (x0, y0). */
  dot?: boolean
}

/** How much the previous velocity carries over (0 = none). Higher = calmer width. */
const VELOCITY_FILTER = 0.7
/** Width change damping between consecutive points. */
const WIDTH_SMOOTHING = 0.4

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi)

/** Line width for a pointer speed in px/ms: fast strokes thin out, slow ones swell. */
export function widthForVelocity(velocity: number, minWidth: number, maxWidth: number) {
  return Math.max(maxWidth / (velocity + 1), minWidth)
}

/** Width at each point: from pen pressure when known, else from filtered velocity. */
export function pointWidths(points: readonly SignaturePoint[], minWidth: number, maxWidth: number): number[] {
  const widths: number[] = []
  let velocity = 0
  for (let i = 0; i < points.length; i++) {
    const p = points[i]
    let w: number
    if (p.pressure !== undefined && p.pressure > 0) {
      w = minWidth + (maxWidth - minWidth) * clamp(p.pressure, 0, 1)
    } else if (i === 0) {
      w = (minWidth + maxWidth) / 2
    } else {
      const prev = points[i - 1]
      const dt = Math.max(1, p.time - prev.time)
      const v = Math.hypot(p.x - prev.x, p.y - prev.y) / dt
      velocity = VELOCITY_FILTER * velocity + (1 - VELOCITY_FILTER) * v
      w = widthForVelocity(velocity, minWidth, maxWidth)
    }
    widths.push(i === 0 ? w : (1 - WIDTH_SMOOTHING) * w + WIDTH_SMOOTHING * widths[i - 1])
  }
  return widths
}

/**
 * Smooth a stroke into quadratic segments that run midpoint → midpoint with
 * each sampled point as the control point. Segment `i` only depends on points
 * up to `i + 1`, so while drawing everything but the last (`tail`) segment is
 * final and can be painted incrementally.
 */
export function strokeSegments(stroke: Pick<SignatureStroke, 'points' | 'minWidth' | 'maxWidth'>): SignatureSegment[] {
  const pts = stroke.points
  const n = pts.length
  if (!n) return []
  const w = pointWidths(pts, stroke.minWidth, stroke.maxWidth)
  if (n === 1) {
    const p = pts[0]
    return [{ x0: p.x, y0: p.y, cx: p.x, cy: p.y, x1: p.x, y1: p.y, width: w[0], dot: true }]
  }
  const mid = (i: number) => ({ x: (pts[i].x + pts[i + 1].x) / 2, y: (pts[i].y + pts[i + 1].y) / 2 })
  const midW = (i: number) => (w[i] + w[i + 1]) / 2
  const out: SignatureSegment[] = []
  // First piece: the first point to the first midpoint.
  const m0 = mid(0)
  out.push({ x0: pts[0].x, y0: pts[0].y, cx: pts[0].x, cy: pts[0].y, x1: m0.x, y1: m0.y, width: (w[0] + midW(0)) / 2 })
  for (let i = 1; i < n - 1; i++) {
    const a = mid(i - 1)
    const b = mid(i)
    out.push({ x0: a.x, y0: a.y, cx: pts[i].x, cy: pts[i].y, x1: b.x, y1: b.y, width: (midW(i - 1) + midW(i)) / 2 })
  }
  // Tail: the last midpoint to the last point.
  const last = pts[n - 1]
  const a = mid(n - 2)
  out.push({ x0: a.x, y0: a.y, cx: last.x, cy: last.y, x1: last.x, y1: last.y, width: (midW(n - 2) + w[n - 1]) / 2 })
  return out
}

/** Paint segments onto a 2D context (already scaled to CSS px). */
export function drawSegments(ctx: CanvasRenderingContext2D, segments: readonly SignatureSegment[], color: string) {
  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  for (const s of segments) {
    ctx.beginPath()
    if (s.dot) {
      ctx.arc(s.x0, s.y0, s.width / 2, 0, Math.PI * 2)
      ctx.fill()
      continue
    }
    ctx.moveTo(s.x0, s.y0)
    ctx.quadraticCurveTo(s.cx, s.cy, s.x1, s.y1)
    ctx.lineWidth = s.width
    ctx.stroke()
  }
}

/** Paint whole strokes; strokes without a colour use `ink`. */
export function drawStrokes(ctx: CanvasRenderingContext2D, strokes: readonly SignatureStroke[], ink: string) {
  for (const stroke of strokes) drawSegments(ctx, strokeSegments(stroke), stroke.color || ink)
}

const r2 = (v: number) => Math.round(v * 100) / 100
const esc = (v: string) => v.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

export interface SignatureSvgOptions {
  width: number
  height: number
  /** Ink for strokes without their own colour. */
  ink: string
  /** Fill behind the strokes; omit / 'transparent' for none. */
  background?: string
  /** Data space → output px (the pad may have been resized since drawing). */
  scale?: number
  /** A previously saved signature drawn underneath (data URL). */
  image?: string | null
  /** Natural size of `image`, so it can be placed like on the pad. */
  imageSize?: { width: number; height: number }
}

/** Standalone SVG markup for a set of strokes — crisp at any print size. */
export function strokesToSVG(strokes: readonly SignatureStroke[], o: SignatureSvgOptions): string {
  const parts: string[] = []
  if (o.background && o.background !== 'transparent') {
    parts.push(`<rect width="100%" height="100%" fill="${esc(o.background)}"/>`)
  }
  if (o.image) {
    const h = o.imageSize ? (o.imageSize.height * o.width) / o.imageSize.width : o.height
    parts.push(`<image href="${esc(o.image)}" x="0" y="0" width="${r2(o.width)}" height="${r2(h)}"/>`)
  }
  const scale = o.scale ?? 1
  const body: string[] = []
  for (const stroke of strokes) {
    const color = esc(stroke.color || o.ink)
    const segs = strokeSegments(stroke)
    const items = segs.map((s) =>
      s.dot
        ? `<circle cx="${r2(s.x0)}" cy="${r2(s.y0)}" r="${r2(s.width / 2)}" fill="${color}" stroke="none"/>`
        : `<path d="M${r2(s.x0)} ${r2(s.y0)}Q${r2(s.cx)} ${r2(s.cy)} ${r2(s.x1)} ${r2(s.y1)}" stroke-width="${r2(s.width)}"/>`,
    )
    if (items.length) body.push(`<g stroke="${color}">${items.join('')}</g>`)
  }
  if (body.length) {
    const t = scale !== 1 ? ` transform="scale(${r2(scale * 1000) / 1000})"` : ''
    parts.push(`<g fill="none" stroke-linecap="round" stroke-linejoin="round"${t}>${body.join('')}</g>`)
  }
  const w = r2(o.width)
  const h = r2(o.height)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${parts.join('')}</svg>`
}

/** Deep copy, dropping malformed points — for fromData() input that came over the wire. */
export function cloneStrokes(strokes: readonly SignatureStroke[]): SignatureStroke[] {
  return strokes
    .filter((s) => s && Array.isArray(s.points))
    .map((s) => ({
      ...(s.color ? { color: s.color } : {}),
      minWidth: Number(s.minWidth) || 0.75,
      maxWidth: Number(s.maxWidth) || 3,
      points: s.points
        .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y))
        .map((p) => ({ x: p.x, y: p.y, time: Number(p.time) || 0, ...(p.pressure !== undefined ? { pressure: p.pressure } : {}) })),
    }))
    .filter((s) => s.points.length)
}

/** Skip samples closer than this (CSS px) to the previous one — jitter, not ink. */
export const MIN_POINT_DISTANCE = 0.75

/** Whether a new sample is far enough from the last one to keep. */
export function keepPoint(prev: SignaturePoint | undefined, next: SignaturePoint) {
  return !prev || Math.hypot(next.x - prev.x, next.y - prev.y) >= MIN_POINT_DISTANCE
}
