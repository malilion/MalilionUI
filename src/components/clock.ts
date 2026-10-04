// MlClock / Clock: time-zone maths (Intl.DateTimeFormat parts, no tz database
// shipped), hand angles, dial geometry and the loop that turns the hands.
import { motionGate, type MotionState } from './ambient'

export type MlClockTone = 'gold' | 'steel' | 'tech' | 'bean'
export type MlClockMotion = 'tick' | 'sweep'
export type MlClockNumerals = 'arabic' | 'roman' | 'none'
export type MlClockInput = Date | number | string

export interface ClockTime {
  /** 0–23 */
  h: number
  m: number
  s: number
  ms: number
}

export interface ClockAngles {
  hour: number
  minute: number
  second: number
}

/** Shown before the first client tick of a live clock (SSR): the classic 10:10 pose. */
export const CLOCK_REST: ClockTime = { h: 10, m: 10, s: 30, ms: 0 }
/** How long the tick's spring takes to settle, ms. */
export const CLOCK_TICK_MS = 220

const formatters = new Map<string, Intl.DateTimeFormat | null>()

function formatter(timeZone: string | undefined): Intl.DateTimeFormat | null {
  const key = timeZone ?? ''
  if (!formatters.has(key)) {
    try {
      formatters.set(
        key,
        new Intl.DateTimeFormat('en-US', {
          timeZone,
          hourCycle: 'h23',
          year: 'numeric',
          month: 'numeric',
          day: 'numeric',
          hour: 'numeric',
          minute: 'numeric',
          second: 'numeric',
        }),
      )
    } catch {
      formatters.set(key, null) // Unknown zone: fall back to local time.
    }
  }
  return formatters.get(key)!
}

/** True when the runtime knows this IANA zone. */
export const clockZoneValid = (timeZone: string) => formatter(timeZone) !== null

function zoneParts(date: Date, timeZone: string | undefined) {
  const f = formatter(timeZone)
  if (!f) {
    return { year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate(), h: date.getHours(), m: date.getMinutes(), s: date.getSeconds() }
  }
  const out: Record<string, number> = {}
  for (const p of f.formatToParts(date)) if (p.type !== 'literal') out[p.type] = Number(p.value)
  return { year: out.year, month: out.month, day: out.day, h: out.hour % 24, m: out.minute, s: out.second }
}

/** Accepts a Date, epoch ms or anything Date can parse. */
export function clockToDate(input: MlClockInput): Date {
  return input instanceof Date ? input : new Date(input)
}

/** Wall-clock time of `date` in `timeZone` (IANA, e.g. 'Asia/Taipei'); local time without one. */
export function clockTime(date: Date, timeZone?: string): ClockTime {
  const ms = ((date.getTime() % 1000) + 1000) % 1000
  if (Number.isNaN(date.getTime())) return { ...CLOCK_REST }
  const p = zoneParts(date, timeZone)
  return { h: p.h, m: p.m, s: p.s, ms }
}

/** Minutes `timeZone` is ahead of UTC at `date` (DST-aware): Asia/Taipei → 480. */
export function clockOffset(date: Date, timeZone?: string): number {
  if (Number.isNaN(date.getTime())) return 0
  const p = zoneParts(date, timeZone)
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.h, p.m, p.s)
  return Math.round((asUtc - Math.floor(date.getTime() / 1000) * 1000) / 60000)
}

/** 480 → "UTC+8", -210 → "UTC−3:30", 0 → "UTC". */
export function clockFormatOffset(minutes: number): string {
  if (!minutes) return 'UTC'
  const sign = minutes > 0 ? '+' : '−'
  const abs = Math.abs(minutes)
  const h = Math.floor(abs / 60)
  const m = abs % 60
  return `UTC${sign}${h}${m ? `:${String(m).padStart(2, '0')}` : ''}`
}

/** easeOutBack: a tiny overshoot past the mark, then settle. */
export function clockTickEase(t: number): number {
  if (t <= 0) return 0
  if (t >= 1) return 1
  const c1 = 1.9
  const c3 = c1 + 1
  return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2
}

const round = (v: number) => Math.round(v * 100) / 100

/**
 * Hand angles in degrees (0 = 12 o'clock, clockwise). `sweep` glides the second
 * hand; `tick` jumps once a second with a springy overshoot; `still` jumps
 * without one (reduced motion, frozen clocks).
 */
export function clockAngles(t: ClockTime, motion: MlClockMotion | 'still' = 'still'): ClockAngles {
  const secs = t.s + t.ms / 1000
  let second: number
  if (motion === 'sweep') second = secs * 6
  else if (motion === 'tick') second = (t.s - 1 + clockTickEase(t.ms / CLOCK_TICK_MS)) * 6
  else second = t.s * 6
  return {
    hour: round(((t.h % 12) + t.m / 60 + t.s / 3600) * 30),
    minute: round((t.m + t.s / 60) * 6),
    second: round(second),
  }
}

const pad = (n: number) => String(n).padStart(2, '0')

/** "14:05:09" (or "14:05" without seconds). */
export function clockDigital(t: ClockTime, seconds = true): string {
  return seconds ? `${pad(t.h)}:${pad(t.m)}:${pad(t.s)}` : `${pad(t.h)}:${pad(t.m)}`
}

/* ── Dial geometry (200×200 view box, centre 100,100) ───── */

const C = 100
const polar = (deg: number, r: number) => {
  const rad = (deg * Math.PI) / 180
  return `${round(C + Math.sin(rad) * r)} ${round(C - Math.cos(rad) * r)}`
}

/** Minute ticks (minor) and hour bars (major), as two path strings. */
export function clockMarks(): { minor: string; major: string } {
  let minor = ''
  let major = ''
  for (let i = 0; i < 60; i++) {
    const deg = i * 6
    if (i % 5 === 0) major += `M${polar(deg, 77)}L${polar(deg, 88)}`
    else minor += `M${polar(deg, 84)}L${polar(deg, 88)}`
  }
  return { minor, major }
}

/** Hand outlines, pointing at 12 (they are rotated about the centre). */
export const CLOCK_HANDS = {
  hour: 'M96.6 114 L97.6 56 L100 47 L102.4 56 L103.4 114 Z',
  minute: 'M97.6 116 L98.6 30 L100 20 L101.4 30 L102.4 116 Z',
  second: 'M99.35 130 H100.65 V18 H99.35 Z',
} as const

const ROMAN = ['XII', 'I', 'II', 'III', 'IIII', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI']

/** Numerals with their positions; empty for `none`. */
export function clockNumerals(kind: MlClockNumerals): { text: string; x: number; y: number }[] {
  if (kind === 'none') return []
  return Array.from({ length: 12 }, (_, i) => {
    const rad = (i * 30 * Math.PI) / 180
    const r = kind === 'roman' ? 63 : 64
    return { text: kind === 'roman' ? ROMAN[i] : String(i === 0 ? 12 : i), x: round(C + Math.sin(rad) * r), y: round(C - Math.cos(rad) * r) }
  })
}

/* ── Controller ─────────────────────────────────────────── */

export interface ClockOptions {
  timeZone?: string
  motion: MlClockMotion
  now?: () => MlClockInput
}

export interface ClockController {
  update: (opts: Partial<ClockOptions>) => void
  destroy: () => void
}

/**
 * Turns the hands inside `face` by writing `--_ck-live` on each
 * `.ml-clock__hand--{hour,minute,second}` (never rendered by the framework, so
 * re-renders don't fight it). Ticks sleep with a timeout between seconds; only
 * the overshoot and sweep use animation frames. Reduced motion: still jumps
 * once a second. Off screen / hidden tab: stops, catches up on return.
 * `onTime` fires once per displayed second.
 */
export function mountClock(face: HTMLElement, initial: ClockOptions, onTime: (t: ClockTime) => void): ClockController {
  let opts = { ...initial }
  let motion: MotionState = { running: false, inView: true, visible: true, reduced: false }
  let frame = 0
  let timer: ReturnType<typeof setTimeout> | undefined
  let lastSecond = -1

  const hand = (name: string) => face.querySelector<HTMLElement>(`.ml-clock__hand--${name}`)

  const clear = () => {
    if (frame) cancelAnimationFrame(frame)
    if (timer) clearTimeout(timer)
    frame = 0
    timer = undefined
  }

  function update() {
    frame = 0
    timer = undefined
    const t = clockTime(clockToDate(opts.now ? opts.now() : Date.now()), opts.timeZone)
    const mode = motion.reduced ? 'still' : opts.motion
    const a = clockAngles(t, mode)
    hand('hour')?.style.setProperty('--_ck-live', `${a.hour}deg`)
    hand('minute')?.style.setProperty('--_ck-live', `${a.minute}deg`)
    hand('second')?.style.setProperty('--_ck-live', `${a.second}deg`)
    const key = t.h * 3600 + t.m * 60 + t.s
    if (key !== lastSecond) {
      lastSecond = key
      onTime(t)
    }
    if (!(motion.inView && motion.visible)) return
    if (mode === 'sweep' || (mode === 'tick' && t.ms < CLOCK_TICK_MS)) {
      if (typeof requestAnimationFrame !== 'undefined') frame = requestAnimationFrame(update)
    } else timer = setTimeout(update, Math.max(16, 1000 - t.ms + 4))
  }

  const stopGate = motionGate(face, (state) => {
    motion = state
    clear()
    update()
  })

  return {
    update(next) {
      opts = { ...opts, ...next }
      lastSecond = -1
      clear()
      update()
    },
    destroy() {
      clear()
      stopGate()
      for (const name of ['hour', 'minute', 'second']) hand(name)?.style.removeProperty('--_ck-live')
    },
  }
}
