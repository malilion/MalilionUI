import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react'
import { observeInView, prefersReducedMotion } from '../composables'
import {
  GLOBE_HOME,
  GLOBE_SIZE,
  globeArcPath,
  globeDots,
  globeDragScale,
  globeEase,
  globeFormatPoint,
  globeGraticule,
  globeLerpView,
  globeNormalize,
  globeProject,
  type GlobeView,
  type MlGlobeArc,
  type MlGlobeMarker,
  type MlGlobePoint,
  type MlGlobeTone,
} from '../components/globe'
import { useLocale } from './locale'
import { cx } from './utils'

export { GLOBE_HOME, globeArcPath, globeDistance, globeFormatPoint, globeProject } from '../components/globe'
export type { MlGlobeArc, MlGlobeMarker, MlGlobePoint, MlGlobeTone, GlobeView, GlobeProjected } from '../components/globe'

export interface GlobeProps {
  /** Places to pin. */
  markers?: MlGlobeMarker[]
  /** Great-circle routes, drawn as rising arcs with a travelling glint. */
  arcs?: MlGlobeArc[]
  /** The point facing you at first (and after Home). Changing it flies there. Default: Taiwan. */
  center?: MlGlobePoint
  tone?: MlGlobeTone
  /** Width in px (it never overflows its container). Default 360. */
  size?: number
  /** Spin on its own (not while dragged, hovered on a marker, or with reduced motion). Default true. */
  autoRotate?: boolean
  /** Degrees per second when spinning on its own; negative turns the other way. Default 8. */
  speed?: number
  /** Drag to turn it. Default true. */
  draggable?: boolean
  /** Parallels and meridians every 30°. Default true. */
  graticule?: boolean
  /** Marker names drawn next to the dots. */
  labels?: boolean
  /** Glowing halo around the globe. Default true. */
  atmosphere?: boolean
  /** Clicking a marker (or Enter) turns it to the front. Default true. */
  flyToMarker?: boolean
  label?: string
  onSelect?: (marker: MlGlobeMarker, index: number) => void
  className?: string
}

export interface GlobeHandle {
  flyTo: (point: MlGlobePoint, ms?: number) => void
}

const NO_MARKERS: MlGlobeMarker[] = []
const NO_ARCS: MlGlobeArc[] = []

export const Globe = forwardRef<GlobeHandle, GlobeProps>(function Globe(
  {
    markers = NO_MARKERS,
    arcs = NO_ARCS,
    center,
    tone = 'gold',
    size = 360,
    autoRotate = true,
    speed = 8,
    draggable = true,
    graticule = true,
    labels = false,
    atmosphere = true,
    flyToMarker = true,
    label,
    onSelect,
    className,
  },
  ref,
) {
  const loc = useLocale()
  const home = () => globeNormalize(center ?? GLOBE_HOME)
  const [view, setView] = useState<GlobeView>(home)
  const [hovered, setHovered] = useState<number | null>(null)
  const [focused, setFocused] = useState<number | null>(null)
  const [dragging, setDragging] = useState(false)
  const svg = useRef<SVGSVGElement>(null)

  // Everything the animation loop reads, kept fresh each render.
  const live = useRef({ view, autoRotate, speed, hovered, focused, dragging })
  live.current = { ...live.current, autoRotate, speed, hovered, focused, dragging }
  const motion = useRef({
    frame: 0,
    last: 0,
    inView: true,
    velocity: { lat: 0, lng: 0 },
    flight: null as { from: GlobeView; to: GlobeView; t0: number; ms: number } | null,
  })

  const put = (v: GlobeView) => {
    live.current.view = v
    setView(v)
  }

  const spinning = () => {
    const l = live.current
    return l.autoRotate && motion.current.inView && l.hovered === null && l.focused === null && !prefersReducedMotion()
  }

  function tick(now: number) {
    const m = motion.current
    m.frame = 0
    const dt = m.last ? Math.min(0.05, (now - m.last) / 1000) : 0
    m.last = now
    const v = live.current.view
    let moving = false
    if (m.flight) {
      const t = Math.min(1, (now - m.flight.t0) / m.flight.ms)
      put(globeLerpView(m.flight.from, m.flight.to, globeEase(t)))
      if (t >= 1) m.flight = null
      moving = true
    } else if (!live.current.dragging) {
      if (Math.abs(m.velocity.lat) + Math.abs(m.velocity.lng) > 0.5) {
        put(globeNormalize({ lat: v.lat + m.velocity.lat * dt, lng: v.lng + m.velocity.lng * dt }))
        const k = Math.exp(-dt * 3.5)
        m.velocity = { lat: m.velocity.lat * k, lng: m.velocity.lng * k }
        moving = true
      } else if (spinning()) {
        put(globeNormalize({ lat: v.lat, lng: v.lng + live.current.speed * dt }))
        moving = true
      }
    }
    if (moving) schedule()
    else m.last = 0
  }
  const tickRef = useRef(tick)
  tickRef.current = tick

  function schedule() {
    const m = motion.current
    if (!m.frame && typeof requestAnimationFrame !== 'undefined') m.frame = requestAnimationFrame((t) => tickRef.current(t))
  }

  function flyTo(point: MlGlobePoint, ms = 900) {
    const m = motion.current
    const to = globeNormalize(point)
    m.velocity = { lat: 0, lng: 0 }
    if (prefersReducedMotion()) {
      m.flight = null
      put(to)
      return
    }
    m.flight = { from: live.current.view, to, t0: performance.now(), ms }
    schedule()
  }
  const flyRef = useRef(flyTo)
  flyRef.current = flyTo
  useImperativeHandle(ref, () => ({ flyTo: (p, ms) => flyRef.current(p, ms) }), [])

  const first = useRef(true)
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    flyRef.current(globeNormalize(center ?? GLOBE_HOME))
  }, [center?.lat, center?.lng])

  // Resume spinning when a pause ends or the settings change.
  useEffect(schedule, [autoRotate, speed, hovered, focused, dragging])

  useEffect(() => {
    const m = motion.current
    const stop = svg.current
      ? observeInView(
          svg.current,
          () => {
            m.inView = true
            schedule()
          },
          { once: false, threshold: 0, onLeave: () => (m.inView = false) },
        )
      : undefined
    return () => {
      stop?.()
      if (m.frame) cancelAnimationFrame(m.frame)
      m.frame = 0
      stopListening()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ── Drag ── */
  const pointer = useRef<{ id: number; x: number; y: number; t: number; scale: number } | null>(null)
  const listeners = useRef<{ move: (e: PointerEvent) => void; up: (e: PointerEvent) => void } | null>(null)

  function stopListening() {
    const l = listeners.current
    if (l) {
      window.removeEventListener('pointermove', l.move)
      window.removeEventListener('pointerup', l.up)
      window.removeEventListener('pointercancel', l.up)
    }
    listeners.current = null
    pointer.current = null
  }

  function onPointerDown(event: ReactPointerEvent) {
    if (!draggable || event.button !== 0 || !svg.current) return
    const m = motion.current
    pointer.current = { id: event.pointerId, x: event.clientX, y: event.clientY, t: performance.now(), scale: globeDragScale(svg.current.getBoundingClientRect().width) }
    m.velocity = { lat: 0, lng: 0 }
    m.flight = null
    const move = (e: PointerEvent) => {
      const p = pointer.current
      if (!p || e.pointerId !== p.id) return
      const dx = e.clientX - p.x
      const dy = e.clientY - p.y
      if (!live.current.dragging && Math.hypot(dx, dy) < 3) return
      live.current.dragging = true
      setDragging(true)
      e.preventDefault()
      const now = performance.now()
      const dt = Math.max(1, now - p.t) / 1000
      const d = { lat: dy * p.scale, lng: -dx * p.scale }
      const v = live.current.view
      put(globeNormalize({ lat: v.lat + d.lat, lng: v.lng + d.lng }))
      m.velocity = { lat: d.lat / dt, lng: d.lng / dt }
      pointer.current = { ...p, x: e.clientX, y: e.clientY, t: now }
    }
    const up = (e: PointerEvent) => {
      const p = pointer.current
      if (!p || e.pointerId !== p.id) return
      if (performance.now() - p.t > 80) m.velocity = { lat: 0, lng: 0 }
      stopListening()
      // Let the click that ends a drag fall through without selecting a marker.
      setTimeout(() => {
        live.current.dragging = false
        setDragging(false)
      })
      schedule()
    }
    listeners.current = { move, up }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
  }

  function onKeyDown(event: KeyboardEvent) {
    const step = event.shiftKey ? 30 : 10
    const moves: Record<string, [number, number]> = { ArrowUp: [-step, 0], ArrowDown: [step, 0], ArrowLeft: [0, step], ArrowRight: [0, -step] }
    const v = live.current.view
    if (moves[event.key]) {
      const [lat, lng] = moves[event.key]
      flyTo({ lat: v.lat + lat, lng: v.lng + lng }, 280)
    } else if (event.key === 'Home') flyTo(home())
    else return
    event.preventDefault()
  }

  function select(i: number) {
    if (live.current.dragging) return
    const m = markers[i]
    if (!m) return
    if (flyToMarker) flyTo(m)
    onSelect?.(m, i)
  }

  const dots = globeDots(view)
  const grid = graticule ? globeGraticule(view) : ''
  const routes = arcs.map((a) => ({ d: globeArcPath(a, view), tone: a.tone ?? tone }))
  const pins = markers.map((m, i) => ({
    m,
    i,
    ...globeProject(m, view),
    tone: m.tone ?? tone,
    r: m.size ?? 3,
    text: m.label ? loc.globe.marker(m.label, globeFormatPoint(m)) : globeFormatPoint(m),
  }))
  const summary = `${label ?? loc.globe.summary(markers.length)}. ${loc.globe.hint}`
  const tipIndex = hovered ?? focused
  const tipPin = tipIndex === null ? undefined : pins[tipIndex]
  const tip = tipPin && tipPin.visible && tipPin.m.label ? { text: tipPin.m.label, left: (tipPin.x / GLOBE_SIZE) * 100, top: (tipPin.y / GLOBE_SIZE) * 100 } : null

  return (
    <figure
      className={cx('ml-globe', `ml-globe--${tone}`, { 'ml-globe--dragging': dragging, 'ml-globe--draggable': draggable, 'ml-globe--atmosphere': atmosphere }, className)}
      style={{ '--_size': `${size}px` } as CSSProperties}
    >
      <div className="ml-globe__stage">
        <div className="ml-globe__sphere" aria-hidden="true" />
        <svg
          ref={svg}
          className="ml-globe__svg"
          viewBox={`0 0 ${GLOBE_SIZE} ${GLOBE_SIZE}`}
          role="group"
          aria-label={summary}
          tabIndex={0}
          onPointerDown={onPointerDown}
          onKeyDown={onKeyDown}
        >
          {graticule && <path className="ml-globe__grid" d={grid} aria-hidden="true" />}
          <path className="ml-globe__land ml-globe__land--rim" d={dots[2]} aria-hidden="true" />
          <path className="ml-globe__land ml-globe__land--side" d={dots[1]} aria-hidden="true" />
          <path className="ml-globe__land" d={dots[0]} aria-hidden="true" />
          {routes.length > 0 && (
            <g className="ml-globe__arcs" aria-hidden="true">
              {routes.map((r, i) => (
                <g key={i} className={`ml-globe__arc ml-globe__arc--${r.tone}`}>
                  <path className="ml-globe__arc-track" d={r.d} />
                  <path className="ml-globe__arc-glint" d={r.d} pathLength={1} style={{ animationDelay: `${(i * -0.7).toFixed(1)}s` }} />
                </g>
              ))}
            </g>
          )}
          {pins.map((p) => (
            <g
              key={p.i}
              className={cx('ml-globe__marker', `ml-globe__marker--${p.tone}`, {
                'ml-globe__marker--back': !p.visible,
                'ml-globe__marker--active': hovered === p.i || focused === p.i,
              })}
              transform={`translate(${p.x} ${p.y})`}
              role="button"
              tabIndex={p.visible ? 0 : -1}
              aria-label={p.text}
              aria-hidden={p.visible ? undefined : true}
              onClick={() => select(p.i)}
              onKeyDown={(e) => {
                if (e.key !== 'Enter' && e.key !== ' ') return
                e.preventDefault()
                e.stopPropagation()
                select(p.i)
              }}
              onPointerEnter={() => setHovered(p.i)}
              onPointerLeave={() => setHovered((h) => (h === p.i ? null : h))}
              onFocus={() => setFocused(p.i)}
              onBlur={() => setFocused((f) => (f === p.i ? null : f))}
            >
              {p.m.pulse !== false && <circle className="ml-globe__pulse" r={p.r} />}
              <circle className="ml-globe__hit" r={Math.max(7, p.r + 4)} />
              <circle className="ml-globe__dot" r={p.r} />
              {labels && p.m.label && (
                <text className="ml-globe__label" x={p.r + 3} y="0">
                  {p.m.label}
                </text>
              )}
            </g>
          ))}
        </svg>
        {tip && !labels && (
          <div className="ml-globe__tip" style={{ left: `${tip.left.toFixed(2)}%`, top: `${tip.top.toFixed(2)}%` }} aria-hidden="true">
            {tip.text}
          </div>
        )}
      </div>
    </figure>
  )
})
