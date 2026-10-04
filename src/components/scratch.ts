// Scratch-card canvas work shared by MlScratchCard (Vue) and ScratchCard (React).
// The cover is painted on a canvas in CSS pixels (scaled for the screen's
// pixel ratio); scratching erases it with round strokes.
import { PAW_PAD, PAW_TOES } from './paw'

export type MlScratchTone = 'gold' | 'steel' | 'bean' | 'tech'

/** Metal stops per tone: highlight, body, shadow, ink for the text. */
const METALS: Record<MlScratchTone, [string, string, string, string, string]> = {
  gold: ['#fff4cc', '#f2bd4a', '#d48f17', '#a96c0e', '#4f320a'],
  steel: ['#fbfcfe', '#c6cdd7', '#9ea7b5', '#5a6372', '#1c2029'],
  bean: ['#ffe3ea', '#ffb3c3', '#f27f9b', '#c94d6c', '#4a1424'],
  tech: ['#d9fff8', '#7af6e2', '#14cfb2', '#0a8f7b', '#06302a'],
}

/** Paint the scratch-off coating: brushed metal, a sheen, scattered paws and the hint text. */
export function scratchPaint(canvas: HTMLCanvasElement, width: number, height: number, tone: MlScratchTone, text: string, ratio = 1): CanvasRenderingContext2D | null {
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  canvas.width = Math.round(width * ratio)
  canvas.height = Math.round(height * ratio)
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
  const [hi, body, mid, low, ink] = METALS[tone]
  ctx.globalCompositeOperation = 'source-over'

  const g = ctx.createLinearGradient(0, 0, width * 0.35, height)
  g.addColorStop(0, hi)
  g.addColorStop(0.28, body)
  g.addColorStop(0.55, mid)
  g.addColorStop(0.72, low)
  g.addColorStop(1, body)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, width, height)

  // Brushed lines.
  ctx.globalAlpha = 0.12
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 1
  for (let y = 2; y < height; y += 3) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(width, y + ((y * 7) % 5) - 2)
    ctx.stroke()
  }

  // A diagonal sheen.
  ctx.globalAlpha = 0.35
  const sheen = ctx.createLinearGradient(0, 0, width, height)
  sheen.addColorStop(0.35, 'rgba(255,255,255,0)')
  sheen.addColorStop(0.5, 'rgba(255,255,255,0.9)')
  sheen.addColorStop(0.65, 'rgba(255,255,255,0)')
  ctx.fillStyle = sheen
  ctx.fillRect(0, 0, width, height)

  // Paw prints, in a loose grid.
  ctx.globalAlpha = 0.16
  ctx.fillStyle = ink
  const step = 46
  for (let y = 10, row = 0; y < height; y += step, row++) {
    for (let x = row % 2 ? 30 : 8; x < width; x += step * 1.4) paw(ctx, x, y, 0.9, ((x + y) % 50) - 25)
  }

  // The hint.
  ctx.globalAlpha = 1
  ctx.fillStyle = ink
  ctx.font = `700 ${Math.max(14, Math.min(26, height * 0.17))}px 'Malilion Display', 'Chakra Petch', 'Noto Sans TC', sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.shadowColor = 'rgba(255,255,255,0.6)'
  ctx.shadowOffsetY = 1
  ctx.fillText(text, width / 2, height / 2)
  ctx.shadowColor = 'transparent'

  // From now on, drawing erases.
  ctx.globalCompositeOperation = 'destination-out'
  return ctx
}

function paw(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, rotate: number) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate((rotate * Math.PI) / 180)
  ctx.scale(scale, scale)
  for (const t of PAW_TOES) {
    ctx.beginPath()
    ctx.ellipse(t.cx, t.cy, t.rx, t.ry, (t.rotate * Math.PI) / 180, 0, Math.PI * 2)
    ctx.fill()
  }
  if (typeof Path2D !== 'undefined') ctx.fill(new Path2D(PAW_PAD))
  ctx.restore()
}

/** Erase a round-capped stroke between two points (CSS pixels). */
export function scratchStroke(ctx: CanvasRenderingContext2D, from: { x: number; y: number }, to: { x: number; y: number }, brush: number) {
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.lineWidth = brush
  ctx.beginPath()
  ctx.moveTo(from.x, from.y)
  ctx.lineTo(to.x + 0.01, to.y)
  ctx.stroke()
}

/** Share of the coating scratched away, 0–1, sampled on a coarse grid. */
export function scratchCleared(ctx: CanvasRenderingContext2D, step = 8): number {
  const { width, height } = ctx.canvas
  if (!width || !height) return 0
  const data = ctx.getImageData(0, 0, width, height).data
  const stride = Math.max(1, Math.round(step * (width / Math.max(1, ctx.canvas.clientWidth || width))))
  let total = 0
  let clear = 0
  for (let y = Math.floor(stride / 2); y < height; y += stride) {
    for (let x = Math.floor(stride / 2); x < width; x += stride) {
      total++
      if (data[(y * width + x) * 4 + 3] < 128) clear++
    }
  }
  return total ? clear / total : 0
}
