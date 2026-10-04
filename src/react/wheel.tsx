import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type CSSProperties } from 'react'
import { icons } from '../components/icons'
import { SETTLE, WHEEL_C, WHEEL_R, WheelSpinner, isThenable, labelSize, pegs, pickWeighted, pointerKick, rimLights, usedTones, wheelSlices, type MlWheelPrize } from '../components/wheel'
import { pawBurst } from '../pawStamp'
import { Paw, useSvgId } from './basic'
import { useLocale } from './locale'
import { cx } from './utils'

export type { MlWheelPrize } from '../components/wheel'
export { pickWeighted as pickWheelPrize } from '../components/wheel'

const reducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

export interface LuckyWheelProps {
  prizes: MlWheelPrize[]
  /** Rendered width in px. */
  size?: number
  /** ms for a full spin. */
  duration?: number
  /** Minimum full turns before landing. */
  turns?: number
  disabled?: boolean
  /** Text on the hub button. */
  spinText?: string
  /** Accessible name for the wheel. */
  label?: string
  /** Paw-print confetti on landing. */
  confetti?: boolean
  /**
   * Runs before every hub press / spin() without an index. Return an index
   * (or a Promise of one, e.g. a server draw) to land there, `false` to
   * cancel, or nothing to pick by weight. The wheel spins while it waits.
   */
  beforeSpin?: () => number | false | void | Promise<number | false | void>
  onStart?: () => void
  onResult?: (prize: MlWheelPrize, index: number) => void
  onError?: (error: unknown) => void
  className?: string
}

export interface LuckyWheelHandle {
  /** Spin; lands on `targetIndex` when given. Resolves with the winning index, or -1 when it didn't spin. */
  spin: (targetIndex?: number) => Promise<number>
}

export const LuckyWheel = forwardRef<LuckyWheelHandle, LuckyWheelProps>(function LuckyWheel(props, ref) {
  const { prizes, size = 320, disabled, spinText = 'GO', label, className } = props
  const t = useLocale()
  const uid = useSvgId('ml-wheel')
  const root = useRef<HTMLDivElement>(null)
  const [rotation, setRotation] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const [fading, setFading] = useState(false)
  const [winner, setWinner] = useState(-1)
  const [announce, setAnnounce] = useState('')

  // Everything the animation callbacks need, always current.
  const latest = useRef({ props, t, winner: -1, spinning: false, resolve: undefined as ((i: number) => void) | undefined })
  latest.current.props = props
  latest.current.t = t

  const spinner = useRef<WheelSpinner>(null as unknown as WheelSpinner)
  if (!spinner.current) {
    spinner.current = new WheelSpinner({
      onAngle: setRotation,
      onLand: () => {
        const L = latest.current
        const index = L.winner
        const p = L.props
        L.spinning = false
        setSpinning(false)
        setFading(false)
        const prize = p.prizes[index]
        if (prize) {
          setAnnounce(L.t.wheel.result(prize.label))
          if ((p.confetti ?? true) && root.current) {
            const r = root.current.getBoundingClientRect()
            pawBurst(r.left + r.width / 2, r.top + r.height / 2, { count: 26, spread: 360, power: Math.max(160, (p.size ?? 320) * 0.7) })
          }
          p.onResult?.(prize, index)
        } else setAnnounce('')
        L.resolve?.(index)
        L.resolve = undefined
      },
    })
  }

  useEffect(
    () => () => {
      spinner.current.stop()
      latest.current.resolve?.(-1)
      latest.current.resolve = undefined
    },
    [],
  )

  const n = prizes.length
  const slices = wheelSlices(prizes, uid)
  const tones = usedTones(slices)
  const lights = rimLights(n)
  const pegDots = pegs(n)
  const fontSize = labelSize(n)
  const kick = spinning && !fading ? pointerKick(rotation, n) : 0
  const canSpin = !disabled && n > 0
  const wheelLabel = t.wheel.summary(label ?? t.wheel.label, prizes.map((p) => p.label))

  const spin = (targetIndex?: number): Promise<number> => {
    const L = latest.current
    const p = L.props
    const count = p.prizes.length
    const dur = p.duration ?? 6000
    const trn = p.turns ?? 6
    if (L.spinning || p.disabled || count === 0) return Promise.resolve(-1)
    const valid = (i: unknown): i is number => typeof i === 'number' && Number.isInteger(i) && i >= 0 && i < count
    const setWin = (i: number) => {
      L.winner = i
      setWinner(i)
    }
    const begin = () => {
      L.spinning = true
      setSpinning(true)
      setWin(-1)
      setAnnounce(L.t.wheel.spinning)
      p.onStart?.()
    }
    const landOn = (i: number) => {
      setWin(i)
      const reduced = reducedMotion()
      setFading(reduced)
      spinner.current.land(i, count, { duration: dur, turns: trn, reduced })
    }
    const done = new Promise<number>((resolve) => (L.resolve = resolve))
    const cancel = () => {
      L.resolve = undefined
      return Promise.resolve(-1)
    }
    if (valid(targetIndex)) {
      begin()
      landOn(targetIndex)
      return done
    }
    let decided: ReturnType<NonNullable<LuckyWheelProps['beforeSpin']>>
    try {
      decided = p.beforeSpin?.()
    } catch (error) {
      p.onError?.(error)
      return cancel()
    }
    if (!isThenable(decided)) {
      if (decided === false) return cancel()
      const index = valid(decided) ? decided : pickWeighted(p.prizes)
      if (index < 0) return cancel()
      begin()
      landOn(index)
      return done
    }
    // Server draw: spin while we wait, then brake onto the answer.
    begin()
    const reduced = reducedMotion()
    if (!reduced) spinner.current.cruise((4 * Math.max(1, trn) * 360) / (dur * (1 - SETTLE)))
    decided.then(
      (answer) => {
        if (!L.spinning) return
        const index = answer === false ? -1 : valid(answer) ? answer : pickWeighted(L.props.prizes)
        setWin(index)
        if (reduced) {
          if (index >= 0) landOn(index)
          else spinner.current.halt()
        } else spinner.current.landFromCruise(index, count, { duration: dur * 0.6 })
      },
      (error) => {
        if (!L.spinning) return
        L.props.onError?.(error)
        setWin(-1)
        if (reduced) spinner.current.halt()
        else spinner.current.landFromCruise(-1, count, { duration: dur * 0.4 })
      },
    )
    return done
  }
  const spinRef = useRef(spin)
  spinRef.current = spin
  useImperativeHandle(ref, () => ({ spin: (i?: number) => spinRef.current(i) }), [])

  const onHub = () => {
    if (latest.current.spinning) return
    void spinRef.current()
  }

  return (
    <div
      ref={root}
      className={cx('ml-lucky-wheel', className, {
        'ml-lucky-wheel--spinning': spinning,
        'ml-lucky-wheel--fade': fading,
        'ml-lucky-wheel--landed': !spinning && winner >= 0,
        'ml-lucky-wheel--disabled': !canSpin,
      })}
      style={{ '--_size': `${size}px` } as CSSProperties}
    >
      <svg className="ml-lucky-wheel__svg" viewBox="0 0 200 200" role="img" aria-label={wheelLabel}>
        <defs>
          {tones.map((g) => (
            <radialGradient key={g.tone} id={`${uid}-${g.tone}`} cx={WHEEL_C} cy={WHEEL_C} r={WHEEL_R} gradientUnits="userSpaceOnUse">
              <stop offset="0.2" stopColor={g.stops[1]} />
              <stop offset="1" stopColor={g.stops[0]} />
            </radialGradient>
          ))}
          <linearGradient id={`${uid}-rim`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff4cc" />
            <stop offset="0.22" stopColor="#ffd56a" />
            <stop offset="0.48" stopColor="#b7780f" />
            <stop offset="0.7" stopColor="#f2bd4a" />
            <stop offset="1" stopColor="#7c4e0b" />
          </linearGradient>
          <radialGradient id={`${uid}-sheen`} cx="0.38" cy="0.26" r="0.75">
            <stop offset="0" stopColor="#fff" stopOpacity="0.34" />
            <stop offset="0.45" stopColor="#fff" stopOpacity="0.06" />
            <stop offset="1" stopColor="#000" stopOpacity="0.22" />
          </radialGradient>
          {slices
            .filter((s) => s.prize.image)
            .map((s) => (
              <clipPath key={`c${s.index}`} id={`${uid}-clip-${s.index}`}>
                <circle cx={s.media.x + s.media.size / 2} cy={s.media.y + s.media.size / 2} r={s.media.size / 2} />
              </clipPath>
            ))}
        </defs>
        <circle className="ml-lucky-wheel__rim" cx="100" cy="100" r="99" fill={`url(#${uid}-rim)`} />
        <circle className="ml-lucky-wheel__rim-groove" cx="100" cy="100" r="87" />
        <g className="ml-lucky-wheel__lights">
          {lights.map((l) => (
            <circle key={l.i} className="ml-lucky-wheel__light" cx={l.x} cy={l.y} r="2.6" style={{ '--_i': l.i } as CSSProperties} />
          ))}
        </g>
        <g className="ml-lucky-wheel__face" transform={`rotate(${rotation.toFixed(2)} 100 100)`}>
          {slices.map((s) => (
            <g
              key={s.index}
              className={cx('ml-lucky-wheel__slice', `ml-lucky-wheel__slice--${s.ink}`, {
                'ml-lucky-wheel__slice--win': !spinning && s.index === winner,
                'ml-lucky-wheel__slice--off': s.prize.disabled,
              })}
            >
              <path className="ml-lucky-wheel__wedge" d={s.d} fill={s.fill} />
              {s.prize.image ? (
                <image
                  className="ml-lucky-wheel__image"
                  href={s.prize.image}
                  x={s.media.x}
                  y={s.media.y}
                  width={s.media.size}
                  height={s.media.size}
                  preserveAspectRatio="xMidYMid slice"
                  clipPath={`url(#${uid}-clip-${s.index})`}
                  transform={`rotate(${s.media.rotate} ${s.media.x + s.media.size / 2} ${s.media.y + s.media.size / 2})`}
                />
              ) : s.prize.icon ? (
                <path
                  className="ml-lucky-wheel__icon"
                  d={icons[s.prize.icon]}
                  transform={`translate(${s.media.x} ${s.media.y}) rotate(${s.media.rotate} ${s.media.size / 2} ${s.media.size / 2}) scale(${s.media.size / 24})`}
                />
              ) : null}
              <text
                className="ml-lucky-wheel__label"
                x={s.label.x}
                y={s.label.y}
                fontSize={fontSize}
                textAnchor="middle"
                dominantBaseline="central"
                transform={`rotate(${s.label.rotate} ${s.label.x} ${s.label.y})`}
              >
                {s.prize.label}
              </text>
            </g>
          ))}
          {pegDots.map((p, i) => (
            <circle key={`p${i}`} className="ml-lucky-wheel__peg" cx={p.x} cy={p.y} r="1.9" />
          ))}
        </g>
        <circle className="ml-lucky-wheel__sheen" cx="100" cy="100" r={WHEEL_R} fill={`url(#${uid}-sheen)`} />
        <g className="ml-lucky-wheel__pointer" transform={`rotate(${kick.toFixed(2)} 100 7.5)`}>
          <path className="ml-lucky-wheel__pointer-body" d="M100 27 L90.5 5.5 Q100 -1 109.5 5.5 Z" fill={`url(#${uid}-rim)`} />
          <circle className="ml-lucky-wheel__pointer-pin" cx="100" cy="7.5" r="2.6" />
        </g>
      </svg>
      <button
        type="button"
        className="ml-lucky-wheel__hub"
        disabled={!canSpin}
        aria-disabled={spinning || undefined}
        aria-label={t.wheel.spin}
        aria-describedby={`${uid}-live`}
        onClick={onHub}
      >
        <Paw className="ml-lucky-wheel__paw" tone="current" />
        <span className="ml-lucky-wheel__go">{spinText}</span>
      </button>
      <span id={`${uid}-live`} className="ml-visually-hidden" aria-live="polite">
        {announce}
      </span>
    </div>
  )
})
