import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  useSyncExternalStore,
  version,
  type CSSProperties,
  type ElementType,
  type HTMLAttributes,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { pawBurst, pawStamp, type PawBurstOptions } from '../pawStamp'
import type { MlPawTone } from '../types'
import { Loader, useSvgId } from './basic'
import { useLocale } from './locale'
import { cx } from './utils'

/* ── Shared helpers (framework-free copies of composables.ts) ── */

const reducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

function observeInView(
  el: Element,
  onEnter: () => void,
  { once = true, threshold = 0.15, onLeave }: { once?: boolean; threshold?: number; onLeave?: () => void } = {},
) {
  if (typeof IntersectionObserver === 'undefined') {
    onEnter()
    return () => {}
  }
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          onEnter()
          if (once) io.disconnect()
        } else onLeave?.()
      }
    },
    { threshold },
  )
  io.observe(el)
  return () => io.disconnect()
}

/** A stable function that always calls the latest closure. */
function useStableFn<A extends unknown[], R>(fn: (...args: A) => R) {
  const latest = useRef(fn)
  latest.current = fn
  return useCallback((...args: A) => latest.current(...args), [])
}

const noop = () => () => {}
const useClient = () => useSyncExternalStore(noop, () => true, () => false)
// React 19 takes `inert` as a boolean; React 18 only passes it through as a string.
const inertProps = (parseInt(version, 10) >= 19 ? { inert: true } : { inert: '' }) as object

type Wrapper = Omit<HTMLAttributes<HTMLElement>, 'children'> & { as?: ElementType; children?: ReactNode }

/* ── BorderBeam ─────────────────────────────────────────── */

export interface BorderBeamProps extends Wrapper {
  tone?: 'gold' | 'tech' | 'bean' | 'danger'
  /** Seconds per lap. */
  duration?: number
  /** Beam thickness, px. */
  size?: number
  reverse?: boolean
  paused?: boolean
}

export function BorderBeam({ tone = 'gold', duration = 4, size = 2, reverse, paused, as: Tag = 'div', className, style, children, ...rest }: BorderBeamProps) {
  return (
    <Tag
      className={cx('ml-beam', `ml-beam--${tone}`, className, { 'ml-beam--reverse': reverse, 'ml-beam--paused': paused })}
      style={{ '--_dur': `${duration}s`, '--_size': `${size}px`, ...style } as CSSProperties}
      {...rest}
    >
      <span className="ml-beam__ring" aria-hidden="true" />
      {children}
    </Tag>
  )
}

/* ── CountUp ────────────────────────────────────────────── */

export interface CountUpProps {
  value: number
  from?: number
  /** ms */
  duration?: number
  decimals?: number
  /** Thousands separator; '' turns grouping off. */
  separator?: string
  prefix?: string
  suffix?: string
  /** Wait until it scrolls into view before counting. */
  startOnView?: boolean
  onDone?: () => void
  className?: string
}

export interface CountUpHandle {
  restart: () => void
}

// easeOutExpo: fast start, gentle landing — the needle settles.
const easeOutExpo = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t))

export const CountUp = forwardRef<CountUpHandle, CountUpProps>(function CountUp(
  { value, from = 0, duration = 1600, decimals = 0, separator = ',', prefix = '', suffix = '', startOnView = true, onDone, className },
  ref,
) {
  const root = useRef<HTMLSpanElement>(null)
  const [shown, setShown] = useState(from)
  const [running, setRunning] = useState(false)
  const current = useRef(from)
  const frame = useRef(0)
  const started = useRef(false)
  const lastValue = useRef(value)

  const format = (n: number) => {
    const [int, dec] = Math.abs(n).toFixed(decimals).split('.')
    const grouped = separator ? int.replace(/\B(?=(\d{3})+(?!\d))/g, separator) : int
    return `${n < 0 ? '-' : ''}${prefix}${grouped}${dec ? `.${dec}` : ''}${suffix}`
  }
  const show = (n: number) => {
    current.current = n
    setShown(n)
  }

  const run = useStableFn((a: number, b: number) => {
    cancelAnimationFrame(frame.current)
    if (reducedMotion() || duration <= 0 || a === b) {
      show(b)
      onDone?.()
      return
    }
    setRunning(true)
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      show(a + (b - a) * easeOutExpo(t))
      if (t < 1) frame.current = requestAnimationFrame(tick)
      else {
        show(b)
        setRunning(false)
        onDone?.()
      }
    }
    frame.current = requestAnimationFrame(tick)
  })
  const restart = useStableFn(() => run(from, value))

  useEffect(() => {
    const start = () => {
      if (started.current) return
      started.current = true
      restart()
    }
    const stop = startOnView && root.current ? observeInView(root.current, start) : (start(), undefined)
    return () => {
      cancelAnimationFrame(frame.current)
      stop?.()
      started.current = false
    }
  }, [])

  // Later changes count from wherever the number is now.
  useEffect(() => {
    if (lastValue.current === value) return
    lastValue.current = value
    if (started.current) run(current.current, value)
  }, [value])

  useImperativeHandle(ref, () => ({ restart }), [])

  return (
    <span ref={root} className={cx('ml-countup', className, { 'ml-countup--running': running })}>
      <span aria-hidden="true">{format(shown)}</span>
      <span className="ml-visually-hidden">{format(value)}</span>
    </span>
  )
})

/* ── DecryptText ────────────────────────────────────────── */

export interface DecryptTextProps {
  text: string
  /** ms for the whole string to lock in. */
  duration?: number
  charset?: string
  trigger?: 'mount' | 'view' | 'hover'
  as?: ElementType
  onDone?: () => void
  className?: string
}

export interface DecryptTextHandle {
  play: () => void
}

interface Cell {
  char: string
  locked: boolean
}

const lockedCells = (text: string): Cell[] => [...text].map((char) => ({ char, locked: true }))

export const DecryptText = forwardRef<DecryptTextHandle, DecryptTextProps>(function DecryptText(
  { text, duration = 900, charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%&*+<>/\\=?', trigger = 'view', as: Tag = 'span', onDone, className },
  ref,
) {
  const root = useRef<HTMLElement>(null)
  const [cells, setCells] = useState(() => lockedCells(text))
  const [running, setRunning] = useState(false)
  const runningRef = useRef(false)
  const frame = useRef(0)
  const lastText = useRef(text)

  const play = useStableFn(() => {
    cancelAnimationFrame(frame.current)
    const chars = [...text]
    if (reducedMotion() || duration <= 0) {
      setCells(lockedCells(text))
      onDone?.()
      return
    }
    const random = () => charset[Math.floor(Math.random() * charset.length)] ?? ''
    runningRef.current = true
    setRunning(true)
    const start = performance.now()
    let last = 0
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      // Re-roll the scramble ~30 times a second, not every frame, so it reads as glyphs.
      if (now - last > 33 || t === 1) {
        last = now
        const lockedCount = Math.floor(t * chars.length)
        setCells(chars.map((char, i) => (i < lockedCount || /\s/.test(char) ? { char, locked: true } : { char: random(), locked: false })))
      }
      if (t < 1) frame.current = requestAnimationFrame(tick)
      else {
        setCells(lockedCells(text))
        runningRef.current = false
        setRunning(false)
        onDone?.()
      }
    }
    frame.current = requestAnimationFrame(tick)
  })

  useEffect(() => {
    let stop: (() => void) | undefined
    if (trigger === 'mount') play()
    else if (trigger === 'view' && root.current) stop = observeInView(root.current, play)
    return () => {
      cancelAnimationFrame(frame.current)
      runningRef.current = false
      stop?.()
    }
  }, [])

  useEffect(() => {
    if (lastText.current === text) return
    lastText.current = text
    play()
  }, [text])

  useImperativeHandle(ref, () => ({ play }), [])

  const onHover = () => {
    if (trigger === 'hover' && !runningRef.current) play()
  }

  return (
    <Tag ref={root} className={cx('ml-decrypt', className, { 'ml-decrypt--running': running })} aria-label={text} onMouseEnter={onHover} onFocus={onHover}>
      {cells.map((cell, i) => (
        <span key={i} className={cx('ml-decrypt__char', { 'ml-decrypt__char--scrambled': !cell.locked })} aria-hidden="true">
          {cell.char}
        </span>
      ))}
    </Tag>
  )
})

/* ── LionMark ───────────────────────────────────────────── */

function star(n: number, outer: number, inner: number, offsetDeg: number, cx = 32, cy = 32.5) {
  const points: string[] = []
  for (let k = 0; k < n * 2; k++) {
    const r = k % 2 === 0 ? outer : inner
    const a = ((-90 + offsetDeg + (k * 180) / n) * Math.PI) / 180
    points.push(`${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`)
  }
  return points.join(' ')
}
const MANE_BACK = star(16, 31, 21, 11.25)
const MANE_FRONT = star(16, 27.5, 19.5, 0)

export interface LionMarkProps {
  size?: number
  glow?: boolean
  /** Breathing mane and a periodic blink. */
  animated?: boolean
  /** Accessible name. Without it the mark is treated as decoration. */
  title?: string
  className?: string
}

export function LionMark({ size = 64, glow, animated, title, className }: LionMarkProps) {
  const uid = useSvgId('ml-lion')
  const gold = `url(#${uid}-gold)`
  const bronze = `url(#${uid}-bronze)`
  return (
    <svg
      className={cx('ml-lion-mark', className, { 'ml-lion-mark--glow': glow, 'ml-lion-mark--animated': animated })}
      style={{ '--_size': `${size}px` } as CSSProperties}
      viewBox="0 0 64 64"
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <defs>
        <linearGradient id={`${uid}-gold`} x1="0" y1="0" x2="0" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#fff4cc" />
          <stop offset="0.2" stopColor="#ffd56a" />
          <stop offset="0.45" stopColor="#e8a527" />
          <stop offset="0.6" stopColor="#b7780f" />
          <stop offset="0.8" stopColor="#f2bd4a" />
          <stop offset="1" stopColor="#8d5a0c" />
        </linearGradient>
        <linearGradient id={`${uid}-bronze`} x1="0" y1="0" x2="0" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#e9a066" />
          <stop offset="0.5" stopColor="#a85a1e" />
          <stop offset="1" stopColor="#4a2409" />
        </linearGradient>
        <linearGradient id={`${uid}-face`} x1="0" y1="13" x2="0" y2="50" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#2b3341" />
          <stop offset="1" stopColor="#0f131a" />
        </linearGradient>
        <radialGradient id={`${uid}-eye`} cx="0.5" cy="0.5" r="0.6">
          <stop offset="0" stopColor="#e6fffb" />
          <stop offset="0.45" stopColor="#3eeed0" />
          <stop offset="1" stopColor="#0a9f89" />
        </radialGradient>
      </defs>
      {title && <title>{title}</title>}
      <g className="ml-lion-mark__mane">
        <polygon points={MANE_BACK} fill={bronze} />
        <polygon points={MANE_FRONT} fill={gold} />
      </g>
      <polygon points="14.5,9.5 26.5,14.8 18.5,23.5" fill={bronze} stroke={gold} strokeWidth={0.9} strokeLinejoin="bevel" />
      <polygon points="49.5,9.5 37.5,14.8 45.5,23.5" fill={bronze} stroke={gold} strokeWidth={0.9} strokeLinejoin="bevel" />
      <polygon points="17.4,13.2 23.6,16 19.4,20.4" fill="#1a1f29" />
      <polygon points="46.6,13.2 40.4,16 44.6,20.4" fill="#1a1f29" />
      <polygon
        points="32,13 40,15.5 45.5,21 47,29 44.5,38 38.5,46 32,49.5 25.5,46 19.5,38 17,29 18.5,21 24,15.5"
        fill={`url(#${uid}-face)`}
        stroke={gold}
        strokeWidth={1.1}
        strokeLinejoin="bevel"
      />
      <polygon points="32,13 40,15.5 45.5,21 32,25 18.5,21 24,15.5" fill="#fff" opacity={0.06} />
      <polygon points="32,25 45.5,21 47,29 44.5,38 38.5,46 32,49.5" fill="#000" opacity={0.18} />
      <path d="M29.6 17.6 L27.8 19.4 L29.6 21.2 M34.4 17.6 L36.2 19.4 L34.4 21.2" fill="none" stroke="#3eeed0" strokeWidth={0.9} strokeLinecap="square" opacity={0.9} />
      <path d="M20.5 26 L29.5 27.6 M43.5 26 L34.5 27.6" fill="none" stroke={gold} strokeWidth={1.6} strokeLinecap="square" />
      <polygon className="ml-lion-mark__eye" points="21.8,29.6 29,30.6 28,33.2 23.4,32.3" fill={`url(#${uid}-eye)`} />
      <polygon className="ml-lion-mark__eye" points="42.2,29.6 35,30.6 36,33.2 40.6,32.3" fill={`url(#${uid}-eye)`} />
      <polygon points="26.5,37 32,35 37.5,37 38.5,42.5 32,47.6 25.5,42.5" fill="#2a3240" />
      <polygon points="28.4,36.6 35.6,36.6 32,40.6" fill={gold} />
      <path d="M32 40.6 V43 M32 43 L28.4 45.2 M32 43 L35.6 45.2" fill="none" stroke={gold} strokeWidth={1.1} strokeLinecap="square" />
    </svg>
  )
}

/* ── Marquee ────────────────────────────────────────────── */

export interface MarqueeProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /** px per second. */
  speed?: number
  direction?: 'left' | 'right'
  pauseOnHover?: boolean
  paused?: boolean
  /** px between repeats. */
  gap?: number
  /** Fade the content out at both edges. */
  fade?: boolean
  /** Accessible name for the region. */
  label?: string
  children?: ReactNode
}

export function Marquee({ speed = 60, direction = 'left', pauseOnHover = true, paused, gap = 40, fade = true, label, className, style, children, ...rest }: MarqueeProps) {
  const group = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const el = group.current
    if (!el) return
    const measure = () => setWidth(el.offsetWidth)
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  // One lap = one copy's width plus the gap, travelled at `speed`.
  const duration = width ? (width + gap) / Math.max(1, speed) : 20
  return (
    <div
      className={cx('ml-marquee', `ml-marquee--${direction}`, className, { 'ml-marquee--hover-pause': pauseOnHover, 'ml-marquee--paused': paused, 'ml-marquee--fade': fade })}
      role="region"
      aria-label={label}
      style={{ '--_dur': `${duration.toFixed(2)}s`, '--_gap': `${gap}px`, ...style } as CSSProperties}
      {...rest}
    >
      <div className="ml-marquee__track">
        <div ref={group} className="ml-marquee__group">
          {children}
        </div>
        <div className="ml-marquee__group" aria-hidden="true" {...inertProps}>
          {children}
        </div>
      </div>
    </div>
  )
}

/* ── PawBurst ───────────────────────────────────────────── */

export interface PawBurstProps {
  count?: number
  tones?: Exclude<MlPawTone, 'current'>[]
  /** Fan angle in degrees; 360 bursts in every direction. */
  spread?: number
  power?: number
  /** Burst from the pointer or the centre of the trigger. */
  origin?: 'pointer' | 'center'
  disabled?: boolean
  onBurst?: () => void
  className?: string
  children?: ReactNode
}

export interface PawBurstHandle {
  /** Fire a burst from a viewport point (default: the viewport centre). */
  fire: (x?: number, y?: number) => void
}

export const PawBurst = forwardRef<PawBurstHandle, PawBurstProps>(function PawBurst(
  { count = 16, tones, spread = 140, power = 180, origin = 'center', disabled, onBurst, className, children },
  ref,
) {
  const options = (): PawBurstOptions => ({ count, tones, spread, power })
  const fire = useStableFn((x?: number, y?: number) => {
    pawBurst(x ?? window.innerWidth / 2, y ?? window.innerHeight / 2, options())
    onBurst?.()
  })
  useImperativeHandle(ref, () => ({ fire }), [])
  const onClick = (event: ReactMouseEvent<HTMLSpanElement>) => {
    if (disabled) return
    let x = event.clientX
    let y = event.clientY
    // Keyboard clicks report 0,0 — always use the centre for those.
    if (origin === 'center' || (x === 0 && y === 0)) {
      const rect = event.currentTarget.getBoundingClientRect()
      x = rect.left + rect.width / 2
      y = rect.top + rect.height / 2
    }
    pawBurst(x, y, options())
    onBurst?.()
  }
  return (
    <span className={cx('ml-pawburst', className)} onClick={onClick}>
      {children}
    </span>
  )
})

/* ── Phone ──────────────────────────────────────────────── */

export interface PhoneProps {
  /** Screen width in px. */
  width?: number
  time?: string
  /** Accessible name for the mock-up. */
  label?: string
  bottom?: ReactNode
  className?: string
  children?: ReactNode
}

export function Phone({ width = 300, time = '9:41', label, bottom, className, children }: PhoneProps) {
  return (
    <figure className={cx('ml-phone', className)} style={{ '--_w': `${width}px` } as CSSProperties} aria-label={label}>
      <div className="ml-phone__screen">
        <div className="ml-phone__status" aria-hidden="true">
          <span className="ml-phone__time">{time}</span>
          <span className="ml-phone__island" />
          <span className="ml-phone__icons">
            <svg viewBox="0 0 18 12">
              <path d="M1 11h2V8H1zM5 11h2V6H5zM9 11h2V4H9zM13 11h2V1h-2z" fill="currentColor" />
            </svg>
            <svg viewBox="0 0 16 12">
              <path d="M8 11l2-2.5a3 3 0 00-4 0zM3.5 6.2a6.5 6.5 0 019 0l-1.4 1.6a4.4 4.4 0 00-6.2 0zM.8 3.4a10.3 10.3 0 0114.4 0L13.8 5a8.3 8.3 0 00-11.6 0z" fill="currentColor" />
            </svg>
            <svg viewBox="0 0 26 12">
              <rect x="1" y="1" width="21" height="10" rx="3" fill="none" stroke="currentColor" opacity={0.5} />
              <rect x="3" y="3" width="15" height="6" rx="1.5" fill="currentColor" />
              <path d="M23.5 4.5v3" stroke="currentColor" opacity={0.5} />
            </svg>
          </span>
        </div>
        <div className="ml-phone__content">{children}</div>
        {bottom != null && bottom !== false && <div className="ml-phone__bottom">{bottom}</div>}
        <span className="ml-phone__home" aria-hidden="true" />
      </div>
    </figure>
  )
}

/* ── Reveal ─────────────────────────────────────────────── */

export interface RevealProps extends Wrapper {
  effect?: 'fade-up' | 'fade' | 'zoom' | 'slide-left' | 'slide-right' | 'blur' | 'flip'
  /** ms before it starts. */
  delay?: number
  /** ms */
  duration?: number
  /** ms between direct children. */
  stagger?: number
  /** Reveal only the first time it scrolls into view. */
  once?: boolean
  /** Share of the element that must be visible, 0–1. */
  threshold?: number
  onReveal?: () => void
}

export function Reveal({
  effect = 'fade-up',
  delay = 0,
  duration = 700,
  stagger = 0,
  once = true,
  threshold = 0.15,
  onReveal,
  as: Tag = 'div',
  className,
  style,
  children,
  ...rest
}: RevealProps) {
  const root = useRef<HTMLElement>(null)
  // Starts "shown": without JS (SSR, crawlers) the content is simply visible.
  const [state, setState] = useState<'idle' | 'hidden' | 'shown'>('idle')
  const reveal = useStableFn(() => {
    setState('shown')
    onReveal?.()
  })
  useEffect(() => {
    const el = root.current
    if (!el || reducedMotion()) return
    if (stagger) [...el.children].forEach((child, i) => (child as HTMLElement).style.setProperty('--_i', String(i)))
    setState('hidden')
    return observeInView(el, reveal, { once, threshold, onLeave: () => setState('hidden') })
  }, [])
  return (
    <Tag
      ref={root}
      className={cx('ml-reveal', `ml-reveal--${effect}`, className, {
        'ml-reveal--hidden': state === 'hidden',
        'ml-reveal--shown': state === 'shown',
        'ml-reveal--stagger': stagger > 0,
      })}
      style={{ '--_delay': `${delay}ms`, '--_dur': `${duration}ms`, '--_stagger': `${stagger}ms`, ...style } as CSSProperties}
      {...rest}
    >
      {children}
    </Tag>
  )
}

/* ── Spotlight ──────────────────────────────────────────── */

export interface SpotlightProps extends Wrapper {
  tone?: 'gold' | 'tech' | 'bean'
  /** Radius of the light, px. */
  size?: number
  /** Reveal a HUD grid under the light. */
  grid?: boolean
  /** Light up the border nearest the pointer too. */
  border?: boolean
}

export function Spotlight({ tone = 'gold', size = 320, grid = true, border = true, as: Tag = 'div', className, style, children, onPointerMove, onPointerLeave, ...rest }: SpotlightProps) {
  const [pos, setPos] = useState({ x: -9999, y: -9999, on: false })
  return (
    <Tag
      className={cx('ml-spotlight', `ml-spotlight--${tone}`, className, { 'ml-spotlight--on': pos.on, 'ml-spotlight--grid': grid, 'ml-spotlight--border': border })}
      style={{ '--_x': `${pos.x}px`, '--_y': `${pos.y}px`, '--_r': `${size}px`, ...style } as CSSProperties}
      onPointerMove={(event: ReactPointerEvent<HTMLElement>) => {
        const rect = event.currentTarget.getBoundingClientRect()
        setPos({ x: event.clientX - rect.left, y: event.clientY - rect.top, on: true })
        onPointerMove?.(event)
      }}
      onPointerLeave={(event: ReactPointerEvent<HTMLElement>) => {
        setPos((p) => ({ ...p, on: false }))
        onPointerLeave?.(event)
      }}
      {...rest}
    >
      <span className="ml-spotlight__light" aria-hidden="true" />
      {children}
    </Tag>
  )
}

/* ── Tilt ───────────────────────────────────────────────── */

export interface TiltProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /** Largest tilt, in degrees. */
  max?: number
  /** Scale while hovered. */
  scale?: number
  /** Specular glare that follows the pointer. */
  glare?: boolean
  /** px — smaller is more dramatic. */
  perspective?: number
  disabled?: boolean
  /** Content, or a render function given the hover state. */
  children?: ReactNode | ((state: { active: boolean }) => ReactNode)
}

const TILT_REST = { rx: 0, ry: 0, gx: 50, gy: 50, active: false }

export function Tilt({ max = 10, scale = 1.02, glare = true, perspective = 900, disabled, className, style, children, onPointerMove, onPointerLeave, ...rest }: TiltProps) {
  const [state, setState] = useState(TILT_REST)
  const still = reducedMotion()
  return (
    <div
      className={cx('ml-tilt', className, { 'ml-tilt--active': state.active, 'ml-tilt--glare': glare })}
      style={
        {
          '--_rx': `${state.rx.toFixed(2)}deg`,
          '--_ry': `${state.ry.toFixed(2)}deg`,
          '--_gx': `${state.gx.toFixed(1)}%`,
          '--_gy': `${state.gy.toFixed(1)}%`,
          '--_scale': state.active && !still ? scale : 1,
          '--_perspective': `${perspective}px`,
          ...style,
        } as CSSProperties
      }
      onPointerMove={(event) => {
        onPointerMove?.(event)
        if (disabled) return
        const rect = event.currentTarget.getBoundingClientRect()
        const px = (event.clientX - rect.left) / rect.width
        const py = (event.clientY - rect.top) / rect.height
        const s = reducedMotion()
        // Pointer at the right edge tips the right side away from the viewer.
        setState({ rx: s ? 0 : (0.5 - py) * 2 * max, ry: s ? 0 : (px - 0.5) * 2 * max, gx: px * 100, gy: py * 100, active: true })
      }}
      onPointerLeave={(event) => {
        onPointerLeave?.(event)
        setState(TILT_REST)
      }}
      {...rest}
    >
      <div className="ml-tilt__inner">
        {typeof children === 'function' ? children({ active: state.active }) : children}
        {glare && <span className="ml-tilt__glare" aria-hidden="true" />}
      </div>
    </div>
  )
}

/* ── Loading (v-loading) ────────────────────────────────── */

export interface LoadingProps extends Omit<HTMLAttributes<HTMLElement>, 'children'> {
  loading: boolean
  /** Caption under the loader; defaults to the locale's "loading" (screen readers only). */
  text?: string
  variant?: 'reactor' | 'paws'
  /** Cover the whole viewport instead of this element. */
  fullscreen?: boolean
  as?: ElementType
  children?: ReactNode
}

/**
 * React form of `v-loading`: wraps its children and, while `loading`, covers
 * them with the same dimmed glass mask and the lion's spinning mane.
 */
export function Loading({ loading, text, variant = 'reactor', fullscreen, as: Tag = 'div', style, children, ...rest }: LoadingProps) {
  const loc = useLocale()
  const client = useClient()
  const [mounted, setMounted] = useState(loading)
  const [shown, setShown] = useState(false)
  const mask = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (loading) {
      setMounted(true)
      // Next frame so the fade-in transition runs.
      const raf = requestAnimationFrame(() => setShown(true))
      return () => cancelAnimationFrame(raf)
    }
    setShown(false)
    const done = () => setMounted(false)
    const el = mask.current
    el?.addEventListener('transitionend', done, { once: true })
    const timer = setTimeout(done, 400) // in case transitions are off
    return () => {
      el?.removeEventListener('transitionend', done)
      clearTimeout(timer)
    }
  }, [loading])
  const overlay = mounted && (
    <div ref={mask} className={cx('ml-loading', { 'ml-loading--fullscreen': fullscreen, 'ml-loading--in': shown })}>
      <Loader variant={variant} size={fullscreen ? 64 : 44} label={text} srLabel={text ? undefined : loc.common.loading} />
    </div>
  )
  return (
    <Tag style={fullscreen ? style : { position: 'relative', ...style }} aria-busy={loading || undefined} {...rest}>
      {children}
      {fullscreen ? client && overlay && createPortal(overlay, document.body) : overlay}
    </Tag>
  )
}

/* ── usePawStamp (v-paw-stamp) ──────────────────────────── */

/**
 * React form of `v-paw-stamp`: every press on the element leaves a little paw
 * print. Pass true / a tone; false turns it off. Returns a ref callback.
 */
export function usePawStamp(tone: boolean | MlPawTone = true) {
  const latest = useRef(tone)
  latest.current = tone
  const attached = useRef<{ el: HTMLElement; handler: (e: PointerEvent) => void } | null>(null)
  return useCallback((el: HTMLElement | null) => {
    if (attached.current) attached.current.el.removeEventListener('pointerdown', attached.current.handler)
    attached.current = null
    if (!el) return
    const handler = (event: PointerEvent) => {
      const t = latest.current
      if (t === false || (el as HTMLButtonElement).disabled || el.getAttribute('aria-disabled') === 'true') return
      pawStamp(event.clientX, event.clientY, typeof t === 'string' && t !== 'current' ? t : 'gold')
    }
    el.addEventListener('pointerdown', handler)
    attached.current = { el, handler }
  }, [])
}
