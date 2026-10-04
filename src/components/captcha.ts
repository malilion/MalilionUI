// Slider captcha maths shared by MlSliderCaptcha (Vue) and SliderCaptcha (React).
// The picture is W × H view-box units; a jigsaw-shaped piece is cut out at
// the gap and slides in from the left along the same row.
import { puzzleEdgePath, puzzleRandom } from './puzzle'

export type MlCaptchaTone = 'gold' | 'tech' | 'bean' | 'steel'
export type CaptchaState = 'idle' | 'dragging' | 'checking' | 'success' | 'fail'

/** Where the gap is, in view-box units: the left / top of the piece's square body. */
export interface MlCaptchaTarget {
  x: number
  y: number
}

/** What a finished attempt reports (and what `verify` gets to judge). */
export interface MlCaptchaAttempt {
  /** Where the piece was let go (view-box units, its body's left edge). */
  x: number
  /** The gap it was aiming for. */
  target: MlCaptchaTarget
  /** ms from grabbing the handle to letting go. */
  duration: number
  /** [ms since start, x] samples of the drag — handy for spotting bots server-side. */
  track: [number, number][]
}

/** Side of the piece's square body. */
export const CAPTCHA_PIECE = 44
/** Where the piece starts, and the gap's lowest x. */
export const CAPTCHA_START = 6
const TAB = 0.3

/** The outline of the piece with its body's top-left at (x, y): a knob out the top and right, a socket on the left. */
export function captchaPiecePath(x: number, y: number, s = CAPTCHA_PIECE): string {
  return (
    `M${x} ${y}` +
    puzzleEdgePath(x, y, x + s, y, 1, s) +
    puzzleEdgePath(x + s, y, x + s, y + s, 1, s) +
    `L${x} ${y + s}` +
    puzzleEdgePath(x, y + s, x, y, -1, s) +
    'z'
  )
}

/** A gap that's at least a piece away from the start, with room for the knobs. */
export function captchaTarget(width: number, height: number, random: () => number, s = CAPTCHA_PIECE): MlCaptchaTarget {
  const tab = Math.ceil(s * TAB) + 2
  const minX = CAPTCHA_START + s * 1.6
  const maxX = width - s - tab
  const minY = tab
  const maxY = height - s - 4
  return {
    x: Math.round(minX + random() * Math.max(0, maxX - minX)),
    y: Math.round(minY + random() * Math.max(0, maxY - minY)),
  }
}

/** The farthest the piece can travel (its body's left edge). */
export const captchaMax = (width: number, s = CAPTCHA_PIECE) => width - s - Math.ceil(s * TAB) - 2

/** Close enough? */
export const captchaHit = (x: number, target: MlCaptchaTarget, tolerance: number) => Math.abs(x - target.x) <= tolerance

/** Bokeh dots and paw prints for the built-in picture, from a seed. */
export function captchaArt(width: number, height: number, seed: number) {
  const random = puzzleRandom(seed * 31 + 5)
  const dots = Array.from({ length: 9 }, () => ({
    cx: Math.round(random() * width),
    cy: Math.round(random() * height),
    r: Math.round(10 + random() * 34),
    o: +(0.08 + random() * 0.2).toFixed(2),
  }))
  const paws = Array.from({ length: 5 }, () => ({
    x: Math.round(random() * (width - 30)),
    y: Math.round(random() * (height - 30)),
    s: +(0.9 + random() * 1.1).toFixed(2),
    r: Math.round(random() * 70 - 35),
    o: +(0.25 + random() * 0.3).toFixed(2),
  }))
  return { dots, paws }
}

/** A fresh seed per refresh (Math.random in the browser, fixed when a seed is given). */
export const captchaSeed = (seed: number | undefined, round: number) => (seed === undefined ? Math.floor(Math.random() * 1e9) : seed + round * 7919)

export { puzzleRandom as captchaRandom }
