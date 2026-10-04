// MlParticles / Particles: a framework-free constellation simulation (spatial grid
// for neighbour search), a canvas painter and a small controller that owns the
// loop, the pointer and resizing. Vue and React only mount it and pass options.
import { ambientRandom, motionGate, type MotionState } from './ambient'

export type MlParticlesTone = 'gold' | 'tech' | 'bean' | 'steel'
export type MlParticlesShape = 'dot' | 'paw'
export type MlParticlesInteraction = 'repel' | 'attract' | 'none'

export interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  /** Drift velocity it relaxes back to after being pushed (px/s). */
  bx: number
  by: number
  /** Radius, px. */
  r: number
  /** Paw rotation, radians. */
  a: number
  /** Seconds left for a burst spark; undefined for the permanent ones. */
  life?: number
  maxLife?: number
}

export interface ParticleField {
  w: number
  h: number
  particles: Particle[]
  rng: () => number
}

export interface ParticleStepOptions {
  /** Drift speed multiplier. */
  speed?: number
  pointer?: { x: number; y: number } | null
  interaction?: MlParticlesInteraction
  /** Pointer reach, px. */
  radius?: number
}

/** How far past an edge a particle travels before wrapping, px. */
export const PARTICLE_MARGIN = 12
/** At most this many burst sparks alive at once. */
export const PARTICLE_MAX_SPARKS = 64

/** Particles for an area: `density` per 100×100 px, capped at `max` (and at least 2 when there is room). */
export function particleCount(w: number, h: number, density = 1.2, max = 220): number {
  if (w <= 0 || h <= 0 || density <= 0) return 0
  return Math.max(2, Math.min(max, Math.round(((w * h) / 10000) * density)))
}

function spawn(rng: () => number, w: number, h: number): Particle {
  const angle = rng() * Math.PI * 2
  const v = 6 + rng() * 16
  const bx = Math.cos(angle) * v
  const by = Math.sin(angle) * v
  return { x: rng() * w, y: rng() * h, vx: bx, vy: by, bx, by, r: 1 + rng() * 1.6, a: (rng() - 0.5) * 0.9 }
}

/** A fresh field of `count` particles scattered over w×h. Same seed, same field. */
export function particleField(w: number, h: number, count: number, seed = 1): ParticleField {
  const rng = ambientRandom(seed)
  const particles: Particle[] = []
  for (let i = 0; i < count; i++) particles.push(spawn(rng, w, h))
  return { w, h, particles, rng }
}

/** Fit an existing field to a new size: positions scale, then particles are added or dropped to reach `count`. */
export function particleResize(field: ParticleField, w: number, h: number, count: number): ParticleField {
  const sx = field.w > 0 ? w / field.w : 1
  const sy = field.h > 0 ? h / field.h : 1
  for (const p of field.particles) {
    p.x *= sx
    p.y *= sy
  }
  field.w = w
  field.h = h
  const permanent = field.particles.filter((p) => p.life === undefined)
  const sparks = field.particles.filter((p) => p.life !== undefined)
  while (permanent.length < count) permanent.push(spawn(field.rng, w, h))
  permanent.length = Math.min(permanent.length, count)
  field.particles = [...permanent, ...sparks]
  return field
}

/** Advance the simulation by `dt` seconds: drift, pointer push / pull, edge wrap, spark decay. */
export function particleStep(field: ParticleField, dt: number, opts: ParticleStepOptions = {}): void {
  const { speed = 1, pointer = null, interaction = 'repel', radius = 120 } = opts
  const { w, h } = field
  const m = PARTICLE_MARGIN
  const relax = Math.min(1, dt * 1.6)
  const r2 = radius * radius
  let alive = 0
  const ps = field.particles
  for (let i = 0; i < ps.length; i++) {
    const p = ps[i]
    if (p.life !== undefined) {
      p.life -= dt
      if (p.life <= 0) continue
    }
    if (pointer && interaction !== 'none' && p.life === undefined) {
      const dx = p.x - pointer.x
      const dy = p.y - pointer.y
      const d2 = dx * dx + dy * dy
      if (d2 < r2 && d2 > 0.01) {
        const d = Math.sqrt(d2)
        const falloff = 1 - d / radius
        // Repel pushes harder than attract pulls, so attract gathers without collapsing.
        const force = (interaction === 'repel' ? 900 : -380) * falloff * dt
        p.vx += (dx / d) * force
        p.vy += (dy / d) * force
      }
    }
    p.vx += (p.bx - p.vx) * relax
    p.vy += (p.by - p.vy) * relax
    p.x += p.vx * dt * speed
    p.y += p.vy * dt * speed
    if (p.life === undefined) {
      if (p.x < -m) p.x += w + 2 * m
      else if (p.x > w + m) p.x -= w + 2 * m
      if (p.y < -m) p.y += h + 2 * m
      else if (p.y > h + m) p.y -= h + 2 * m
    }
    ps[alive++] = p
  }
  ps.length = alive
}

/** Click burst: shove nearby particles outward and throw short-lived sparks. Returns the sparks added. */
export function particleBurst(field: ParticleField, x: number, y: number, { count = 14, power = 260, radius = 140 } = {}): number {
  const r2 = radius * radius
  for (const p of field.particles) {
    if (p.life !== undefined) continue
    const dx = p.x - x
    const dy = p.y - y
    const d2 = dx * dx + dy * dy
    if (d2 < r2 && d2 > 0.01) {
      const d = Math.sqrt(d2)
      const k = (1 - d / radius) * power
      p.vx += (dx / d) * k
      p.vy += (dy / d) * k
    }
  }
  const sparks = field.particles.reduce((n, p) => n + (p.life === undefined ? 0 : 1), 0)
  const add = Math.max(0, Math.min(count, PARTICLE_MAX_SPARKS - sparks))
  for (let i = 0; i < add; i++) {
    const angle = (i / add) * Math.PI * 2 + field.rng() * 0.5
    const v = power * (0.5 + field.rng() * 0.7)
    const life = 0.7 + field.rng() * 0.6
    field.particles.push({ x, y, vx: Math.cos(angle) * v, vy: Math.sin(angle) * v, bx: 0, by: 0, r: 1.2 + field.rng() * 1.4, a: angle, life, maxLife: life })
  }
  return add
}

/**
 * Pairs of particles closer than `maxDist`, found with a uniform grid (cell =
 * maxDist, so only the 3×3 neighbouring cells need checking: O(n) for an even
 * spread instead of O(n²)). Written into `out` as flat triples [i, j, strength],
 * strength 1 when touching → 0 at maxDist. Sparks are skipped.
 */
export function particleLinks(ps: readonly Particle[], maxDist: number, w: number, h: number, out: number[] = []): number[] {
  out.length = 0
  if (maxDist <= 0 || ps.length < 2) return out
  const cols = Math.max(1, Math.ceil(w / maxDist))
  const rows = Math.max(1, Math.ceil(h / maxDist))
  const head = new Int32Array(cols * rows).fill(-1)
  const next = new Int32Array(ps.length).fill(-1)
  const cx = new Int32Array(ps.length)
  const cy = new Int32Array(ps.length)
  for (let i = 0; i < ps.length; i++) {
    if (ps[i].life !== undefined) continue
    const x = Math.min(cols - 1, Math.max(0, Math.floor(ps[i].x / maxDist)))
    const y = Math.min(rows - 1, Math.max(0, Math.floor(ps[i].y / maxDist)))
    cx[i] = x
    cy[i] = y
    const c = x + y * cols
    next[i] = head[c]
    head[c] = i
  }
  const max2 = maxDist * maxDist
  for (let i = 0; i < ps.length; i++) {
    const a = ps[i]
    if (a.life !== undefined) continue
    for (let dy = -1; dy <= 1; dy++) {
      const y = cy[i] + dy
      if (y < 0 || y >= rows) continue
      for (let dx = -1; dx <= 1; dx++) {
        const x = cx[i] + dx
        if (x < 0 || x >= cols) continue
        for (let j = head[x + y * cols]; j !== -1; j = next[j]) {
          if (j <= i) continue
          const ddx = ps[j].x - a.x
          const ddy = ps[j].y - a.y
          const d2 = ddx * ddx + ddy * ddy
          if (d2 < max2) out.push(i, j, 1 - Math.sqrt(d2) / maxDist)
        }
      }
    }
  }
  return out
}

export interface ParticleColors {
  dot: string
  line: string
  spark: string
}

/** Adds one paw print (pad + four toes) centred on (x, y) to the current path. */
function pawPath(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, a: number) {
  const s = r * 3.4
  const cos = Math.cos(a)
  const sin = Math.sin(a)
  const at = (px: number, py: number): [number, number] => [x + (px * cos - py * sin) * s, y + (px * sin + py * cos) * s]
  const [padX, padY] = at(0, 0.32)
  ctx.moveTo(padX + 0.62 * s, padY)
  ctx.ellipse(padX, padY, 0.62 * s, 0.5 * s, a, 0, Math.PI * 2)
  for (const [tx, ty] of [[-0.66, -0.2], [-0.24, -0.6], [0.24, -0.6], [0.66, -0.2]] as const) {
    const [px, py] = at(tx, ty)
    ctx.moveTo(px + 0.25 * s, py)
    ctx.arc(px, py, 0.25 * s, 0, Math.PI * 2)
  }
}

/** Paint the field. Links are bucketed by strength so the whole frame is a handful of strokes and fills. */
export function particleDraw(
  ctx: CanvasRenderingContext2D,
  field: ParticleField,
  links: readonly number[],
  colors: ParticleColors,
  { shape = 'dot', dpr = 1 }: { shape?: MlParticlesShape; dpr?: number } = {},
): void {
  const ps = field.particles
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, field.w, field.h)
  ctx.lineWidth = 1
  ctx.strokeStyle = colors.line
  const BUCKETS = 4
  for (let b = 0; b < BUCKETS; b++) {
    const lo = b / BUCKETS
    const hi = (b + 1) / BUCKETS
    ctx.beginPath()
    let any = false
    for (let k = 0; k < links.length; k += 3) {
      const s = links[k + 2]
      if (s < lo || s >= hi) continue
      const p = ps[links[k]]
      const q = ps[links[k + 1]]
      ctx.moveTo(p.x, p.y)
      ctx.lineTo(q.x, q.y)
      any = true
    }
    if (any) {
      ctx.globalAlpha = (lo + hi) / 2 * 0.55
      ctx.stroke()
    }
  }
  ctx.globalAlpha = 0.9
  ctx.fillStyle = colors.dot
  ctx.beginPath()
  for (const p of ps) {
    if (p.life !== undefined) continue
    if (shape === 'paw') pawPath(ctx, p.x, p.y, p.r, p.a)
    else {
      ctx.moveTo(p.x + p.r, p.y)
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
    }
  }
  ctx.fill()
  ctx.fillStyle = colors.spark
  for (const p of ps) {
    if (p.life === undefined) continue
    ctx.globalAlpha = Math.max(0, p.life / (p.maxLife ?? 1))
    ctx.beginPath()
    if (shape === 'paw') pawPath(ctx, p.x, p.y, p.r, p.a)
    else ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1
}

/* ── Controller ─────────────────────────────────────────── */

export interface ParticlesOptions {
  density: number
  max: number
  shape: MlParticlesShape
  linkDistance: number
  interaction: MlParticlesInteraction
  burst: boolean
  speed: number
  fps: number
  paused: boolean
  seed: number
}

export interface ParticlesController {
  update: (opts: Partial<ParticlesOptions>) => void
  /** Burst at (x, y) in the element's own pixels. */
  burst: (x: number, y: number) => void
  destroy: () => void
}

const INTERACTIVE = 'a, button, input, select, textarea, label, summary, [role="button"], [tabindex]:not([tabindex="-1"])'

/**
 * Runs a particle field on `canvas`, sized to `root` (which also receives the
 * pointer, so content stacked on top stays interactive). Stops when off screen,
 * the tab is hidden or `paused`; under reduced motion it paints one still frame.
 */
export function mountParticles(root: HTMLElement, canvas: HTMLCanvasElement, initial: ParticlesOptions): ParticlesController {
  let opts = { ...initial }
  const ctx = canvas.getContext?.('2d') as CanvasRenderingContext2D | null
  let field = particleField(0, 0, 0, opts.seed)
  const links: number[] = []
  let colors: ParticleColors = { dot: '#f9c757', line: '#f0ad2f', spark: '#fff4cc' }
  let dpr = 1
  let motion: MotionState = { running: false, inView: true, visible: true, reduced: false }
  let frame = 0
  let last = 0
  let acc = 0
  let pointer: { x: number; y: number } | null = null

  const readColors = () => {
    const cs = getComputedStyle(root)
    const get = (name: string, fallback: string) => cs.getPropertyValue(name).trim() || fallback
    colors = { dot: get('--_pt-dot', colors.dot), line: get('--_pt-line', colors.line), spark: get('--_pt-spark', colors.spark) }
  }

  const paint = () => {
    if (!ctx) return
    particleLinks(field.particles, opts.linkDistance, field.w, field.h, links)
    particleDraw(ctx, field, links, colors, { shape: opts.shape, dpr })
  }

  const live = () => motion.running && !opts.paused

  function tick(now: number) {
    frame = 0
    if (!live()) {
      last = 0
      return
    }
    const elapsed = last ? Math.min(100, now - last) : 0
    last = now
    acc += elapsed
    const minStep = 1000 / Math.max(1, Math.min(120, opts.fps))
    // Within a millisecond of the budget counts, so a 60 Hz display still gets 60 fps.
    if (acc >= minStep - 1 || elapsed === 0) {
      particleStep(field, Math.min(0.05, acc / 1000), { speed: opts.speed, pointer, interaction: opts.interaction })
      acc = 0
      paint()
    }
    schedule()
  }

  function schedule() {
    if (!frame && typeof requestAnimationFrame !== 'undefined') frame = requestAnimationFrame(tick)
  }

  function stop() {
    if (frame) cancelAnimationFrame(frame)
    frame = 0
    last = 0
  }

  function sync() {
    if (live()) schedule()
    else {
      stop()
      paint()
    }
  }

  function resize() {
    const rect = root.getBoundingClientRect()
    const w = Math.max(0, Math.round(rect.width))
    const h = Math.max(0, Math.round(rect.height))
    dpr = Math.min(2, (typeof window !== 'undefined' && window.devicePixelRatio) || 1)
    canvas.width = Math.round(w * dpr)
    canvas.height = Math.round(h * dpr)
    const count = particleCount(w, h, opts.density, opts.max)
    if (field.w === 0 && field.h === 0) field = particleField(w, h, count, opts.seed)
    else particleResize(field, w, h, count)
    readColors()
    paint()
  }

  const local = (e: PointerEvent | MouseEvent) => {
    const rect = root.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }
  const onMove = (e: PointerEvent) => {
    if (opts.interaction === 'none' || e.pointerType === 'touch') return
    pointer = local(e)
  }
  const onLeave = () => (pointer = null)
  const onClick = (e: MouseEvent) => {
    if (!opts.burst) return
    if ((e.target as Element | null)?.closest?.(INTERACTIVE)) return
    const p = local(e)
    controller.burst(p.x, p.y)
  }

  root.addEventListener('pointermove', onMove)
  root.addEventListener('pointerleave', onLeave)
  root.addEventListener('click', onClick)

  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => resize()) : undefined
  ro?.observe(root)
  // Theme switches change the CSS colours; repaint a still frame with the new ones.
  const mo =
    typeof MutationObserver !== 'undefined' && typeof document !== 'undefined'
      ? new MutationObserver(() => {
          readColors()
          if (!live()) paint()
        })
      : undefined
  mo?.observe(document.documentElement, { attributes: true, attributeFilter: ['data-ml-theme', 'class', 'style'] })

  resize()
  const stopGate = motionGate(root, (state) => {
    motion = state
    sync()
  })

  const controller: ParticlesController = {
    update(next) {
      const before = opts
      opts = { ...opts, ...next }
      if (before.density !== opts.density || before.max !== opts.max) resize()
      else if (before.seed !== opts.seed) {
        field = particleField(field.w, field.h, particleCount(field.w, field.h, opts.density, opts.max), opts.seed)
        paint()
      }
      sync()
    },
    burst(x, y) {
      // Sparks only make sense while it moves (not paused, off screen or reduced motion).
      if (!live()) return
      particleBurst(field, x, y)
      schedule()
    },
    destroy() {
      stop()
      stopGate()
      ro?.disconnect()
      mo?.disconnect()
      root.removeEventListener('pointermove', onMove)
      root.removeEventListener('pointerleave', onLeave)
      root.removeEventListener('click', onClick)
    },
  }
  return controller
}
