// Shared by the grid lottery (九宮格) and the gacha machine (扭蛋機), Vue and
// React alike — framework-free. Prizes reuse the wheel's weighted pick.
import type { CuteIconName } from './cute-icons'
import { isThenable, pickWeighted } from './wheel'

export type MlLotteryTone = 'gold' | 'tech' | 'bean' | 'steel' | 'success'

export interface MlLotteryPrize {
  label: string
  /** A cute icon drawn on the prize. */
  icon?: CuteIconName
  /** Image URL; wins over `icon`. */
  image?: string
  tone?: MlLotteryTone
  /** Relative odds for a draw without an index. Default 1; 0 never wins. */
  weight?: number
  /** Greyed out and never picked by weight (an explicit draw(i) still lands on it). */
  disabled?: boolean
}

/** What `beforeDraw` may answer: an index, `false` to cancel, nothing to pick by weight — or a Promise of one. */
export type MlLotteryDecision = number | false | void | Promise<number | false | void>

const TONES: MlLotteryTone[] = ['gold', 'bean', 'tech', 'steel']

/** The prize's own tone, or one from a rotating set. */
export const lotteryTone = (prizes: readonly MlLotteryPrize[], i: number): MlLotteryTone => prizes[i]?.tone ?? TONES[i % TONES.length]

const valid = (prizes: readonly MlLotteryPrize[], i: unknown): i is number =>
  typeof i === 'number' && Number.isInteger(i) && i >= 0 && i < prizes.length

/**
 * Settle which prize wins. `sync` is known at once (-1 = cancelled / nothing
 * can win); otherwise `later` resolves with the index (or -1) — the machine
 * should start moving right away and brake onto it.
 */
export function lotteryDecide(
  prizes: readonly MlLotteryPrize[],
  target: number | undefined,
  beforeDraw: (() => MlLotteryDecision) | undefined,
): { sync: number } | { later: Promise<number> } {
  if (valid(prizes, target)) return { sync: target }
  const decided = beforeDraw?.()
  if (isThenable(decided)) {
    return {
      later: Promise.resolve(decided).then((answer) => (answer === false ? -1 : valid(prizes, answer) ? answer : pickWeighted(prizes))),
    }
  }
  if (decided === false) return { sync: -1 }
  return { sync: valid(prizes, decided) ? decided : pickWeighted(prizes) }
}

/* ── Grid lottery ─────────────────────────────────────────── */

/** Cells of the 3 × 3 grid in the order the light runs (clockwise from top-left); 4 is the button. */
export const GRID_RING = [0, 1, 2, 5, 8, 7, 6, 3] as const

/** The grid cell (0–8) a ring position sits in. */
export const gridCell = (ringIndex: number) => GRID_RING[((ringIndex % 8) + 8) % 8]

/**
 * Delays (ms) for each step of the running light from ring position `from`
 * to `to`: a quick start, a fast middle and a long brake, about `duration` in all.
 */
export function gridSchedule(from: number, to: number, turns: number, duration: number): number[] {
  const steps = Math.max(1, Math.round(turns)) * 8 + ((((to - from) % 8) + 8) % 8 || 8)
  const raw = Array.from({ length: steps }, (_, k) => {
    const t = (k + 1) / steps
    const start = Math.max(0, 1 - k / 3) * 0.6
    return 0.25 + start + Math.pow(t, 4) * 5
  })
  const total = raw.reduce((s, v) => s + v, 0)
  return raw.map((v) => Math.max(16, Math.round((v / total) * duration)))
}

/** Steps to coast from a cruising light onto `to`: at least one more lap. */
export function gridBrake(from: number, to: number, duration: number): number[] {
  return gridSchedule(from, to, 1, duration)
}

/** Fast, even steps while waiting for a server answer. */
export const GRID_CRUISE_MS = 70

/* ── Gacha machine ────────────────────────────────────────── */

export interface GachaCapsule {
  x: number
  y: number
  /** Turn of the capsule's seam, degrees. */
  rotate: number
  tone: MlLotteryTone
}

/**
 * Capsules piled in the dome (a 100 × 100 box, circle of radius 44 at 50, 50):
 * rows from the bottom up, nudged by a seeded wobble so it looks hand-filled.
 */
export function gachaCapsules(tones: readonly MlLotteryTone[], count = 14, seed = 3): GachaCapsule[] {
  let a = seed >>> 0
  const rand = () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), a | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const out: GachaCapsule[] = []
  const r = 8.5
  for (let row = 0; out.length < count && row < 6; row++) {
    const y = 84 - row * 14.5
    const half = Math.sqrt(Math.max(0, 40 * 40 - (y - 50) * (y - 50))) - r
    const n = Math.max(1, Math.floor((half * 2) / (r * 2.05)) + 1)
    for (let i = 0; i < n && out.length < count; i++) {
      const x = n === 1 ? 50 : 50 - half + (i * half * 2) / (n - 1)
      out.push({
        x: +(x + (rand() - 0.5) * 3).toFixed(1),
        y: +(y + (rand() - 0.5) * 3).toFixed(1),
        rotate: Math.round(rand() * 180 - 90),
        tone: tones.length ? tones[out.length % tones.length] : TONES[out.length % TONES.length],
      })
    }
  }
  return out
}

/** How long each gacha phase lasts (ms). */
export const GACHA_MS = { turn: 1100, drop: 750, open: 650 } as const

export type GachaPhase = 'idle' | 'turning' | 'dropping' | 'opening' | 'open'
