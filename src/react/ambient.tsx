import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ElementType,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import { motionGate } from '../components/ambient'
import { auroraPalette, auroraVars, type MlAuroraPalette } from '../components/aurora'
import {
  mountParticles,
  type MlParticlesInteraction,
  type MlParticlesShape,
  type MlParticlesTone,
  type ParticlesController,
} from '../components/particles'
import {
  RADAR_REST_ANGLE,
  RADAR_SIZE,
  mountRadar,
  radarBearing,
  radarGlow,
  radarPolar,
  radarPosition,
  radarRangeLabels,
  radarRings,
  radarTicks,
  type MlRadarBlip,
  type MlRadarTone,
  type RadarController,
} from '../components/radar'
import {
  CLOCK_HANDS,
  CLOCK_REST,
  clockAngles,
  clockDigital,
  clockFormatOffset,
  clockMarks,
  clockNumerals,
  clockOffset,
  clockTime,
  clockToDate,
  mountClock,
  type ClockController,
  type ClockTime,
  type MlClockInput,
  type MlClockMotion,
  type MlClockNumerals,
  type MlClockTone,
} from '../components/clock'
import { LionMark } from './fx'
import { useLocale } from './locale'
import { cx } from './utils'

export { AURORA_PALETTES } from '../components/aurora'
export type { MlAuroraPalette } from '../components/aurora'
export { particleCount, particleField, particleStep, particleLinks, particleBurst } from '../components/particles'
export type { MlParticlesInteraction, MlParticlesShape, MlParticlesTone, Particle, ParticleField } from '../components/particles'
export { radarPolar, radarPosition, radarGlow, radarBearing } from '../components/radar'
export type { MlRadarBlip, MlRadarTone } from '../components/radar'
export { clockTime, clockAngles, clockOffset, clockFormatOffset, clockDigital } from '../components/clock'
export type { ClockTime, ClockAngles, MlClockInput, MlClockMotion, MlClockNumerals, MlClockTone } from '../components/clock'

type Wrapper = Omit<HTMLAttributes<HTMLElement>, 'children'> & { as?: ElementType; children?: ReactNode }

const hasContent = (children: ReactNode) => children !== undefined && children !== null && children !== false
// useLayoutEffect warns during SSR; nothing to measure there anyway.
const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

/* ── Aurora ─────────────────────────────────────────────── */

export interface AuroraProps extends Wrapper {
  /** Brand palette, or your own colours (cycled over the four lights). Default 'pride'. */
  palette?: MlAuroraPalette | string[]
  /** 0–1: how strongly the lights show. Default 0.7. */
  intensity?: number
  /** Speed multiplier. Default 1. */
  speed?: number
  /** Film grain over the light. Default true. */
  grain?: boolean
  /** HUD scanlines over the light. */
  scanlines?: boolean
  /** Hold the lights still. */
  paused?: boolean
}

export function Aurora({
  palette = 'pride',
  intensity = 0.7,
  speed = 1,
  grain = true,
  scanlines = false,
  paused = false,
  as: Tag = 'div',
  className,
  style,
  children,
  ...rest
}: AuroraProps) {
  const root = useRef<HTMLElement>(null)
  const [running, setRunning] = useState(true)
  useEffect(() => (root.current ? motionGate(root.current, (s) => setRunning(s.inView && s.visible)) : undefined), [])
  const vars = auroraVars({ intensity, speed, colors: Array.isArray(palette) ? palette : undefined })
  return (
    <Tag
      ref={root}
      className={cx('ml-aurora', `ml-aurora--${auroraPalette(palette)}`, className, {
        'ml-aurora--grain': grain,
        'ml-aurora--scanlines': scanlines,
        'ml-aurora--paused': paused || !running,
      })}
      style={{ ...vars, ...style } as CSSProperties}
      {...rest}
    >
      <div className="ml-aurora__sky" aria-hidden="true">
        <span className="ml-aurora__blob ml-aurora__blob--1" />
        <span className="ml-aurora__blob ml-aurora__blob--2" />
        <span className="ml-aurora__blob ml-aurora__blob--3" />
        <span className="ml-aurora__blob ml-aurora__blob--4" />
      </div>
      {hasContent(children) && <div className="ml-aurora__content">{children}</div>}
    </Tag>
  )
}

/* ── Particles ──────────────────────────────────────────── */

export interface ParticlesProps extends Wrapper {
  tone?: MlParticlesTone
  /** Particles per 100×100 px. Default 1.2. */
  density?: number
  /** Upper bound on the particle count. Default 220. */
  max?: number
  /** Dots, or tiny paw prints. Default 'dot'. */
  shape?: MlParticlesShape
  /** Particles closer than this (px) are linked; 0 turns lines off. Default 110. */
  linkDistance?: number
  /** What the pointer does to nearby particles. Default 'repel'. */
  interaction?: MlParticlesInteraction
  /** Click (outside links / buttons) to burst. Default true. */
  burst?: boolean
  /** Drift speed multiplier. Default 1. */
  speed?: number
  /** Frame-rate cap. Default 60. */
  fps?: number
  paused?: boolean
  /** Same seed, same starting layout. Default 7. */
  seed?: number
}

export interface ParticlesHandle {
  /** Burst at (x, y), in px from the element's top-left corner. */
  burst: (x: number, y: number) => void
}

export const Particles = forwardRef<ParticlesHandle, ParticlesProps>(function Particles(
  {
    tone = 'gold',
    density = 1.2,
    max = 220,
    shape = 'dot',
    linkDistance = 110,
    interaction = 'repel',
    burst = true,
    speed = 1,
    fps = 60,
    paused = false,
    seed = 7,
    as: Tag = 'div',
    className,
    children,
    ...rest
  },
  ref,
) {
  const root = useRef<HTMLElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const ctl = useRef<ParticlesController | undefined>(undefined)
  const options = { density, max, shape, linkDistance, interaction, burst, speed, fps, paused, seed }
  const latest = useRef(options)
  latest.current = options

  useEffect(() => {
    if (!root.current || !canvas.current) return
    const c = mountParticles(root.current, canvas.current, latest.current)
    ctl.current = c
    return () => {
      c.destroy()
      ctl.current = undefined
    }
  }, [])
  useEffect(() => {
    ctl.current?.update(latest.current)
  }, [density, max, shape, linkDistance, interaction, burst, speed, fps, paused, seed])
  useImperativeHandle(ref, () => ({ burst: (x, y) => ctl.current?.burst(x, y) }), [])

  return (
    <Tag ref={root} className={cx('ml-particles', `ml-particles--${tone}`, className, { 'ml-particles--burst': burst })} {...rest}>
      <canvas ref={canvas} className="ml-particles__canvas" aria-hidden="true" />
      {hasContent(children) && <div className="ml-particles__content">{children}</div>}
    </Tag>
  )
})

/* ── Radar ──────────────────────────────────────────────── */

export interface RadarProps {
  blips?: MlRadarBlip[]
  /** Default 'tech'. */
  tone?: MlRadarTone
  /** Width in px. Default 280. */
  size?: number
  /** Degrees per second; negative turns anticlockwise. Default 90. */
  speed?: number
  /** Trail behind the beam, degrees. Default 90. */
  trail?: number
  /** Range rings. Default 4. */
  rings?: number
  /** Outer-ring range: labels the rings and reads distances in this unit. */
  range?: number
  unit?: string
  /** Explicit ring labels, inner to outer (wins over range). */
  rangeLabels?: string[]
  paused?: boolean
  label?: string
  onSelect?: (blip: MlRadarBlip, index: number) => void
  className?: string
}

const NO_BLIPS: MlRadarBlip[] = []
const RC = RADAR_SIZE / 2
const RADAR_TICKS = radarTicks()

export function Radar({
  blips = NO_BLIPS,
  tone = 'tech',
  size = 280,
  speed = 90,
  trail = 90,
  rings = 4,
  range,
  unit,
  rangeLabels,
  paused = false,
  label,
  onSelect,
  className,
}: RadarProps) {
  const loc = useLocale()
  const [active, setActive] = useState<number | null>(null)
  const ringRadii = useMemo(() => radarRings(rings), [rings])
  const ranges = radarRangeLabels(ringRadii.length, { labels: rangeLabels, range, unit }).map((text, i) => ({ text, y: RC - ringRadii[i] + 3 }))
  const items = blips.map((b, i) => {
    const { angle, distance } = radarPolar(b)
    const pos = radarPosition(b)
    const dist = range ? `${Math.round(distance * range * 10) / 10}${unit ? ` ${unit}` : ''}` : `${Math.round(distance * 100)}%`
    return {
      b,
      i,
      angle,
      tone: b.tone ?? tone,
      style: { left: `${pos.left}%`, top: `${pos.top}%`, '--_rd-glow': String(radarGlow(RADAR_REST_ANGLE, angle, trail, speed >= 0)) } as CSSProperties,
      text: loc.radar.blip(b.label, radarBearing(angle), dist),
    }
  })
  const angles = useRef<number[]>([])
  angles.current = items.map((it) => it.angle)
  const shownActive = active !== null && active < blips.length ? active : null

  const scope = useRef<HTMLDivElement>(null)
  const ctl = useRef<RadarController | undefined>(undefined)
  useEffect(() => {
    if (!scope.current) return
    const c = mountRadar(scope.current, () => angles.current, { speed, trail, paused })
    ctl.current = c
    return () => {
      c.destroy()
      ctl.current = undefined
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const firstRun = useRef(true)
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false
      return
    }
    ctl.current?.update({ speed, trail, paused })
  }, [speed, trail, paused, blips])

  function select(i: number) {
    setActive(i)
    const b = blips[i]
    if (b) onSelect?.(b, i)
  }

  function onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape' && shownActive !== null) {
      setActive(null)
      event.preventDefault()
    }
  }

  return (
    <figure
      className={cx('ml-radar-scope', `ml-radar-scope--${tone}`, className, { 'ml-radar-scope--paused': paused, 'ml-radar-scope--ccw': speed < 0 })}
      style={{ '--_rd-size': `${size}px`, '--_rd-trail': `${trail}deg` } as CSSProperties}
    >
      <div ref={scope} className="ml-radar-scope__screen" role="group" aria-label={label ?? loc.radar.summary(blips.length)} onKeyDown={onKeyDown}>
        <svg className="ml-radar-scope__grid" viewBox={`0 0 ${RADAR_SIZE} ${RADAR_SIZE}`} aria-hidden="true">
          {ringRadii.map((r, i) => (
            <circle key={i} className="ml-radar-scope__ring" cx={RC} cy={RC} r={r} />
          ))}
          <path className="ml-radar-scope__cross" d={`M${RC} ${RC - 96}V${RC + 96}M${RC - 96} ${RC}H${RC + 96}`} />
          <path className="ml-radar-scope__ticks" d={RADAR_TICKS} />
          {ranges.map((r, i) => (
            <text key={`r${i}`} className="ml-radar-scope__range" x={RC + 3} y={r.y}>
              {r.text}
            </text>
          ))}
        </svg>
        <div className="ml-radar-scope__sweep" style={{ '--_rd-a': `${RADAR_REST_ANGLE}deg` } as CSSProperties} aria-hidden="true" />
        {items.map((it) => (
          <button
            key={it.i}
            type="button"
            className={cx('ml-radar-scope__blip', `ml-radar-scope__blip--${it.tone}`, { 'ml-radar-scope__blip--active': shownActive === it.i })}
            style={it.style}
            aria-label={it.text}
            aria-pressed={shownActive === it.i}
            onClick={() => select(it.i)}
          >
            {it.b.label && (
              <span className="ml-radar-scope__tip" aria-hidden="true">
                {it.b.label}
              </span>
            )}
          </button>
        ))}
      </div>
    </figure>
  )
}

/* ── Clock ──────────────────────────────────────────────── */

export interface ClockProps {
  /** Freeze the clock at this moment (SSR, screenshots, tests). */
  time?: MlClockInput
  /** Where "now" comes from for a live clock (e.g. server-synced time). */
  now?: () => MlClockInput
  /** IANA zone, e.g. 'Asia/Taipei'. Default: the visitor's own. */
  timeZone?: string
  /** Place name under the dial and in the accessible name. */
  label?: string
  /** Digital readout under the dial. */
  digital?: boolean
  /** UTC offset under the dial. */
  offset?: boolean
  /** Second hand (and seconds in the readout). Default true. */
  seconds?: boolean
  /** Default 'tick'. */
  motion?: MlClockMotion
  /** Default 'arabic'. */
  numerals?: MlClockNumerals
  /** The lion crest on the dial. Default true. */
  crest?: boolean
  /** Default 'gold'. */
  tone?: MlClockTone
  /** Width in px. Default 200. */
  size?: number
  className?: string
}

const CLOCK_MARKS = clockMarks()

export function Clock({
  time,
  now,
  timeZone,
  label,
  digital = false,
  offset = false,
  seconds = true,
  motion = 'tick',
  numerals = 'arabic',
  crest = true,
  tone = 'gold',
  size = 200,
  className,
}: ClockProps) {
  const loc = useLocale()
  const [live, setLive] = useState<ClockTime | null>(null)
  const [liveOffset, setLiveOffset] = useState<number | null>(null)
  const frozen = time === undefined ? null : clockToDate(time)
  const shown = frozen ? clockTime(frozen, timeZone) : live
  const angles = clockAngles(frozen ? shown! : CLOCK_REST, motion === 'sweep' && frozen ? 'sweep' : 'still')
  const ariaLabel = shown ? loc.clock.time(label, shown.h, shown.m) : (label ?? loc.clock.label)
  const readout = shown ? clockDigital(shown, seconds) : seconds ? '--:--:--' : '--:--'
  const offsetMin = frozen ? clockOffset(frozen, timeZone) : liveOffset
  const offsetText = offsetMin === null ? '' : clockFormatOffset(offsetMin)

  const latest = useRef({ digital, offset, now, timeZone })
  latest.current = { digital, offset, now, timeZone }
  const face = useRef<HTMLDivElement>(null)
  const ctl = useRef<ClockController | undefined>(undefined)
  const isLive = time === undefined

  useIsoLayoutEffect(() => {
    if (!isLive || !face.current) return
    const onTime = (t: ClockTime) => {
      const l = latest.current
      setLive((prev) => (l.digital || !prev || prev.m !== t.m || prev.h !== t.h ? t : prev))
      if (l.offset) setLiveOffset(clockOffset(clockToDate(l.now ? l.now() : Date.now()), l.timeZone))
    }
    const c = mountClock(face.current, { timeZone, motion, now }, onTime)
    ctl.current = c
    return () => {
      c.destroy()
      ctl.current = undefined
      setLive(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLive])
  const first = useRef(true)
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    ctl.current?.update({ timeZone, motion, now })
  }, [timeZone, motion, now, digital, offset])

  return (
    <figure className={cx('ml-clock', `ml-clock--${tone}`, `ml-clock--${motion}`, className)} style={{ '--_ck-size': `${size}px` } as CSSProperties}>
      <div ref={face} className="ml-clock__face" role="img" aria-label={ariaLabel}>
        <div className="ml-clock__dial" aria-hidden="true" />
        {crest && (
          <div className="ml-clock__crest" aria-hidden="true">
            <LionMark size={32} />
          </div>
        )}
        <svg className="ml-clock__svg" viewBox="0 0 200 200" aria-hidden="true">
          <path className="ml-clock__marks ml-clock__marks--minor" d={CLOCK_MARKS.minor} />
          <path className="ml-clock__marks ml-clock__marks--major" d={CLOCK_MARKS.major} />
          {clockNumerals(numerals).map((n) => (
            <text key={n.text} className="ml-clock__numeral" x={n.x} y={n.y}>
              {n.text}
            </text>
          ))}
          <g className="ml-clock__hand ml-clock__hand--hour" style={{ '--_ck-a': `${angles.hour}deg` } as CSSProperties}>
            <path d={CLOCK_HANDS.hour} />
          </g>
          <g className="ml-clock__hand ml-clock__hand--minute" style={{ '--_ck-a': `${angles.minute}deg` } as CSSProperties}>
            <path d={CLOCK_HANDS.minute} />
          </g>
          {seconds && (
            <g className="ml-clock__hand ml-clock__hand--second" style={{ '--_ck-a': `${angles.second}deg` } as CSSProperties}>
              <path d={CLOCK_HANDS.second} />
              <circle cx="100" cy="122" r="4" />
            </g>
          )}
          <circle className="ml-clock__cap" cx="100" cy="100" r="5.5" />
          <circle className="ml-clock__pin" cx="100" cy="100" r="1.8" />
        </svg>
      </div>
      {(label || digital || offset) && (
        <figcaption className="ml-clock__caption" aria-hidden="true">
          {label && <span className="ml-clock__label">{label}</span>}
          {digital && (
            <time className="ml-clock__digital" dateTime={shown ? readout : undefined}>
              {readout}
            </time>
          )}
          {offset && <span className="ml-clock__offset">{offsetText}</span>}
        </figcaption>
      )}
    </figure>
  )
}
