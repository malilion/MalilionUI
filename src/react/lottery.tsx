import { forwardRef, useEffect, useId, useImperativeHandle, useRef, useState, type CSSProperties } from 'react'
import { prefersReducedMotion } from '../composables'
import { pawBurst } from '../pawStamp'
import { PAW_PAD, PAW_TOES } from '../components/paw'
import {
  GACHA_MS,
  GRID_CRUISE_MS,
  GRID_RING,
  gachaCapsules,
  gridBrake,
  gridSchedule,
  lotteryDecide,
  lotteryTone,
  type GachaPhase,
  type MlLotteryDecision,
  type MlLotteryPrize,
} from '../components/lottery'
import { CuteIcon } from './cute-icon'
import { useLocale } from './locale'
import { cx } from './utils'

export { lotteryTone, gridSchedule, gachaCapsules } from '../components/lottery'
export type { MlLotteryPrize, MlLotteryTone, MlLotteryDecision, GachaPhase } from '../components/lottery'

interface DrawProps {
  /**
   * Runs before every press / draw() without an index. Return an index (or a
   * Promise of one, e.g. a server draw) to land there, `false` to cancel, or
   * nothing to pick by weight.
   */
  beforeDraw?: () => MlLotteryDecision
  /** Text on the button. */
  buttonText?: string
  /** Draws left, shown on the button (and 0 disables it). */
  chances?: number
  /** Paw confetti on a win. Default true. */
  confetti?: boolean
  disabled?: boolean
  label?: string
  onStart?: () => void
  onResult?: (prize: MlLotteryPrize, index: number) => void
  onError?: (error: unknown) => void
  className?: string
}

/* ── Grid lottery ─────────────────────────────────────────── */

export interface GridLotteryProps extends DrawProps {
  /** Eight prizes, clockwise from the top-left cell. */
  prizes: MlLotteryPrize[]
  /** Width in px (it shrinks with a narrow container). Default 330. */
  size?: number
  /** ms from press to landing. Default 4200. */
  duration?: number
  /** Full laps before braking. Default 3. */
  turns?: number
}

export interface GridLotteryHandle {
  /** Run the light. With an index it lands there; resolves with the winning index, or -1. */
  draw: (index?: number) => Promise<number>
}

export const GridLottery = forwardRef<GridLotteryHandle, GridLotteryProps>(function GridLottery(
  { prizes, size = 330, duration = 4200, turns = 3, buttonText, chances, beforeDraw, confetti = true, disabled = false, label, onStart, onResult, onError, className },
  ref,
) {
  const loc = useLocale()
  const ring = prizes.slice(0, 8)
  const [active, setActive] = useState(-1)
  const [winner, setWinner] = useState(-1)
  const [running, setRunning] = useState(false)
  const [announce, setAnnounce] = useState('')
  const root = useRef<HTMLDivElement>(null)
  const canDraw = !disabled && !running && ring.length > 0 && chances !== 0

  const live = useRef({ ring, canDraw, active, running, beforeDraw, duration, turns, confetti, onStart, onResult, onError, loc })
  live.current = { ...live.current, ring, canDraw, beforeDraw, duration, turns, confetti, onStart, onResult, onError, loc }
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const finish = useRef<((i: number) => void) | undefined>(undefined)
  useEffect(
    () => () => {
      clearTimeout(timer.current)
      finish.current?.(-1)
    },
    [],
  )

  const setPos = (i: number) => {
    live.current.active = i
    setActive(i)
  }
  const step = () => setPos((live.current.active + 1 + 8) % 8)

  function land(index: number) {
    const l = live.current
    l.running = false
    setRunning(false)
    setWinner(index)
    if (index >= 0) setPos(index)
    const prize = l.ring[index]
    if (prize) {
      setAnnounce(l.loc.lottery.result(prize.label))
      if (l.confetti && !prefersReducedMotion()) {
        const r = root.current?.querySelector(`[data-index="${index}"]`)?.getBoundingClientRect()
        if (r) pawBurst(r.left + r.width / 2, r.top + r.height / 2, { count: 20, spread: 360, power: 160 })
      }
      l.onResult?.(prize, index)
    } else setAnnounce(l.loc.lottery.none)
    finish.current?.(index)
    finish.current = undefined
  }

  function run(delays: number[], target: number) {
    let k = 0
    const next = () => {
      step()
      if (++k >= delays.length) return land(target)
      timer.current = setTimeout(next, delays[k])
    }
    timer.current = setTimeout(next, delays[0])
  }

  function draw(target?: number): Promise<number> {
    const l = live.current
    if (!l.canDraw || l.running) return Promise.resolve(-1)
    let decided: ReturnType<typeof lotteryDecide>
    try {
      decided = lotteryDecide(l.ring, target, l.beforeDraw)
    } catch (error) {
      l.onError?.(error)
      return Promise.resolve(-1)
    }
    if ('sync' in decided && decided.sync < 0) return Promise.resolve(-1)
    const done = new Promise<number>((resolve) => (finish.current = resolve))
    l.running = true
    setRunning(true)
    setWinner(-1)
    setAnnounce(l.loc.lottery.drawing)
    l.onStart?.()
    const reduced = prefersReducedMotion()
    if (l.active < 0) setPos(7)
    if ('sync' in decided) {
      if (reduced) land(decided.sync)
      else run(gridSchedule(live.current.active, decided.sync, l.turns, l.duration), decided.sync)
      return done
    }
    const cruise = () => {
      step()
      timer.current = setTimeout(cruise, GRID_CRUISE_MS)
    }
    if (!reduced) cruise()
    decided.later.then(
      (index) => {
        if (!live.current.running) return
        clearTimeout(timer.current)
        if (index < 0 || reduced) land(index)
        else run(gridBrake(live.current.active, index, live.current.duration * 0.6), index)
      },
      (error) => {
        if (!live.current.running) return
        clearTimeout(timer.current)
        live.current.onError?.(error)
        land(-1)
      },
    )
    return done
  }
  const drawRef = useRef(draw)
  drawRef.current = draw
  useImperativeHandle(ref, () => ({ draw: (i) => drawRef.current(i) }), [])

  return (
    <div
      ref={root}
      className={cx('ml-grid-lottery', { 'ml-grid-lottery--running': running, 'ml-grid-lottery--landed': !running && winner >= 0, 'ml-grid-lottery--disabled': disabled }, className)}
      style={{ '--_size': `${size}px` } as CSSProperties}
      role="group"
      aria-label={label ?? loc.lottery.grid}
    >
      <div className="ml-grid-lottery__board">
        {Array.from({ length: 9 }, (_, cell) => {
          if (cell === 4)
            return (
              <button key={cell} type="button" className="ml-grid-lottery__go" disabled={!canDraw} onClick={() => void draw()}>
                <span className="ml-grid-lottery__go-text">{buttonText ?? loc.lottery.draw}</span>
                {chances !== undefined && <span className="ml-grid-lottery__chances">× {chances}</span>}
              </button>
            )
          const index = GRID_RING.indexOf(cell as (typeof GRID_RING)[number])
          const prize = ring[index]
          return (
            <div
              key={cell}
              data-index={index}
              className={cx('ml-grid-lottery__cell', `ml-grid-lottery__cell--${lotteryTone(ring, index)}`, {
                'ml-grid-lottery__cell--active': active === index,
                'ml-grid-lottery__cell--won': !running && winner === index,
                'ml-grid-lottery__cell--disabled': prize?.disabled,
                'ml-grid-lottery__cell--empty': !prize,
              })}
              role="img"
              aria-label={prize?.label}
            >
              {prize && (
                <>
                  {prize.image ? (
                    <img className="ml-grid-lottery__img" src={prize.image} alt="" />
                  ) : prize.icon ? (
                    <CuteIcon className="ml-grid-lottery__icon" name={prize.icon} />
                  ) : null}
                  <span className="ml-grid-lottery__label">{prize.label}</span>
                </>
              )}
            </div>
          )
        })}
      </div>
      <p className="ml-visually-hidden" aria-live="polite">
        {announce}
      </p>
    </div>
  )
})

/* ── Gacha ────────────────────────────────────────────────── */

export interface GachaProps extends DrawProps {
  prizes: MlLotteryPrize[]
  /** Width in px (it shrinks with a narrow container). Default 280. */
  size?: number
  /** The prize card was put away. */
  onClose?: () => void
}

export interface GachaHandle {
  /** Turn the knob. With an index that capsule comes out; resolves with the winning index, or -1. */
  draw: (index?: number) => Promise<number>
  /** Put the capsule away and get ready for the next turn. */
  reset: () => void
}

const R = 12.2
const TOP = `M${-R} 0A${R} ${R} 0 0 1 ${R} 0Z`
const BOTTOM = `M${-R} 0A${R} ${R} 0 0 0 ${R} 0Z`

export const Gacha = forwardRef<GachaHandle, GachaProps>(function Gacha(
  { prizes, size = 280, buttonText, chances, beforeDraw, confetti = true, disabled = false, label, onStart, onResult, onError, onClose, className },
  ref,
) {
  const loc = useLocale()
  const uid = `ml-gacha-${useId().replace(/:/g, '')}`
  const [phase, setPhaseState] = useState<GachaPhase>('idle')
  const [waiting, setWaiting] = useState(false)
  const [winner, setWinner] = useState(-1)
  const [announce, setAnnounce] = useState('')
  const root = useRef<HTMLDivElement>(null)
  const again = useRef<HTMLButtonElement>(null)
  const canDraw = !disabled && phase === 'idle' && prizes.length > 0 && chances !== 0

  const live = useRef({ phase, prizes, canDraw, beforeDraw, confetti, onStart, onResult, onError, onClose, loc })
  live.current = { ...live.current, prizes, canDraw, beforeDraw, confetti, onStart, onResult, onError, onClose, loc }
  const setPhase = (p: GachaPhase) => {
    live.current.phase = p
    setPhaseState(p)
  }
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const finish = useRef<((i: number) => void) | undefined>(undefined)
  const later = (ms: number, fn: () => void) => (timer.current = setTimeout(fn, ms))
  useEffect(
    () => () => {
      clearTimeout(timer.current)
      finish.current?.(-1)
    },
    [],
  )
  useEffect(() => {
    if (phase === 'open') again.current?.focus()
  }, [phase])

  const capsules = gachaCapsules(prizes.map((_, i) => lotteryTone(prizes, i))).map((c) => ({
    ...c,
    x: +(100 + (c.x - 50) * 1.44).toFixed(1),
    y: +(92 + (c.y - 50) * 1.44).toFixed(1),
  }))
  const prize = prizes[winner]
  const prizeTone = winner >= 0 ? lotteryTone(prizes, winner) : 'gold'

  function opened(index: number) {
    const l = live.current
    setPhase('open')
    const p = l.prizes[index]
    setAnnounce(l.loc.lottery.result(p.label))
    if (l.confetti && !prefersReducedMotion() && root.current) {
      const r = root.current.getBoundingClientRect()
      pawBurst(r.left + r.width / 2, r.top + r.height * 0.4, { count: 22, spread: 360, power: Math.max(150, r.width * 0.6) })
    }
    l.onResult?.(p, index)
    finish.current?.(index)
    finish.current = undefined
  }

  function release(index: number) {
    setWaiting(false)
    if (index < 0) {
      setPhase('idle')
      setAnnounce(live.current.loc.lottery.none)
      finish.current?.(-1)
      finish.current = undefined
      return
    }
    setWinner(index)
    if (prefersReducedMotion()) return opened(index)
    setPhase('dropping')
    later(GACHA_MS.drop, () => {
      setPhase('opening')
      later(GACHA_MS.open, () => opened(index))
    })
  }

  function draw(target?: number): Promise<number> {
    const l = live.current
    if (!l.canDraw || l.phase !== 'idle') return Promise.resolve(-1)
    let decided: ReturnType<typeof lotteryDecide>
    try {
      decided = lotteryDecide(l.prizes, target, l.beforeDraw)
    } catch (error) {
      l.onError?.(error)
      return Promise.resolve(-1)
    }
    if ('sync' in decided && decided.sync < 0) return Promise.resolve(-1)
    const done = new Promise<number>((resolve) => (finish.current = resolve))
    setPhase('turning')
    setWinner(-1)
    setAnnounce(l.loc.lottery.drawing)
    l.onStart?.()
    const turnMs = prefersReducedMotion() ? 0 : GACHA_MS.turn
    if ('sync' in decided) {
      const index = decided.sync
      later(turnMs, () => release(index))
      return done
    }
    const started = Date.now()
    setWaiting(true)
    decided.later.then(
      (index) => {
        if (live.current.phase !== 'turning') return
        later(Math.max(0, turnMs - (Date.now() - started)), () => release(index))
      },
      (error) => {
        if (live.current.phase !== 'turning') return
        live.current.onError?.(error)
        release(-1)
      },
    )
    return done
  }

  function reset() {
    clearTimeout(timer.current)
    if (live.current.phase === 'open') live.current.onClose?.()
    setPhase('idle')
    setWaiting(false)
    setWinner(-1)
  }

  const api = useRef({ draw, reset })
  api.current = { draw, reset }
  useImperativeHandle(ref, () => ({ draw: (i) => api.current.draw(i), reset: () => api.current.reset() }), [])

  return (
    <div
      ref={root}
      className={cx('ml-gacha', `ml-gacha--${phase}`, { 'ml-gacha--waiting': waiting, 'ml-gacha--disabled': !canDraw && phase === 'idle' }, className)}
      style={{ '--_size': `${size}px` } as CSSProperties}
      role="group"
      aria-label={label ?? loc.lottery.gacha}
    >
      <svg className="ml-gacha__svg" viewBox="0 0 200 300" aria-hidden="true">
        <defs>
          <linearGradient id={`${uid}-body`} x1="0" y1="0" x2="1" y2="0">
            <stop className="ml-gacha__stop ml-gacha__stop--a" offset="0" />
            <stop className="ml-gacha__stop ml-gacha__stop--b" offset="0.45" />
            <stop className="ml-gacha__stop ml-gacha__stop--c" offset="1" />
          </linearGradient>
          <radialGradient id={`${uid}-glass`} cx="0.35" cy="0.3" r="0.8">
            <stop className="ml-gacha__glass-stop ml-gacha__glass-stop--a" offset="0" />
            <stop className="ml-gacha__glass-stop ml-gacha__glass-stop--b" offset="1" />
          </radialGradient>
          <clipPath id={`${uid}-dome`}>
            <circle cx="100" cy="92" r="70" />
          </clipPath>
        </defs>
        <rect className="ml-gacha__base" x="34" y="268" width="132" height="14" rx="5" />
        <rect className="ml-gacha__body" x="40" y="150" width="120" height="122" rx="14" fill={`url(#${uid}-body)`} />
        <rect className="ml-gacha__collar" x="50" y="146" width="100" height="14" rx="5" />
        <rect className="ml-gacha__slot" x="134" y="174" width="8" height="22" rx="3" />
        <g className="ml-gacha__crest" transform="translate(56 172) scale(0.9)">
          {PAW_TOES.map((t) => (
            <ellipse key={t.cx} cx={t.cx} cy={t.cy} rx={t.rx} ry={t.ry} transform={`rotate(${t.rotate} ${t.cx} ${t.cy})`} />
          ))}
          <path d={PAW_PAD} />
        </g>
        <rect className="ml-gacha__chute" x="74" y="232" width="52" height="26" rx="8" />
        <g className="ml-gacha__knob" onClick={() => void draw()}>
          <circle className="ml-gacha__knob-ring" cx="100" cy="198" r="22" />
          <rect className="ml-gacha__knob-bar" x="94" y="180" width="12" height="36" rx="6" />
          <circle className="ml-gacha__knob-cap" cx="100" cy="198" r="5" />
        </g>
        <circle className="ml-gacha__dome-back" cx="100" cy="92" r="72" />
        <g className="ml-gacha__pile" clipPath={`url(#${uid}-dome)`}>
          {capsules.map((c, i) => (
            <g
              key={i}
              className={`ml-gacha__capsule ml-gacha__capsule--${c.tone}`}
              style={{ '--_i': i } as CSSProperties}
              transform={`translate(${c.x} ${c.y}) rotate(${c.rotate})`}
            >
              <path className="ml-gacha__capsule-top" d={TOP} />
              <path className="ml-gacha__capsule-bottom" d={BOTTOM} />
            </g>
          ))}
        </g>
        <circle className="ml-gacha__dome" cx="100" cy="92" r="72" fill={`url(#${uid}-glass)`} />
        <path className="ml-gacha__shine" d="M52 66a52 52 0 0 1 34-30" />
        {(phase === 'dropping' || phase === 'opening' || phase === 'open') && (
          <g className={`ml-gacha__drop ml-gacha__capsule--${prizeTone}`}>
            <g className="ml-gacha__drop-body">
              <path className="ml-gacha__capsule-bottom" d={BOTTOM} />
              <path className="ml-gacha__capsule-top ml-gacha__drop-top" d={TOP} />
            </g>
          </g>
        )}
      </svg>
      <button type="button" className="ml-gacha__turn" disabled={!canDraw} onClick={() => void draw()}>
        {buttonText ?? loc.lottery.turn}
        {chances !== undefined && <span className="ml-gacha__chances"> × {chances}</span>}
      </button>
      {phase === 'open' && prize && (
        <div className={`ml-gacha__prize ml-gacha__prize--${prizeTone}`}>
          <div className="ml-gacha__prize-art">
            {prize.image ? <img src={prize.image} alt="" /> : prize.icon ? <CuteIcon name={prize.icon} animate="bounce" /> : null}
          </div>
          <p className="ml-gacha__prize-label">{prize.label}</p>
          <button ref={again} type="button" className="ml-gacha__again" onClick={reset}>
            {loc.lottery.again}
          </button>
        </div>
      )}
      <p className="ml-visually-hidden" aria-live="polite">
        {announce}
      </p>
    </div>
  )
})
