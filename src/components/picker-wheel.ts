// MlPickerView — framework-free wheel physics, column resolution, date / time
// column builders and the DOM controller that drives one wheel. Shared by the
// Vue component and the React twin, so both scroll, snap and speak the same.
//
// Positions are measured in *items*: 0 means the first option sits in the
// centre band, 2.5 means halfway between the third and fourth. The wheel never
// uses native scrolling; one transform on the track is written per frame.

export type MlPickerValue = string | number

export interface MlPickerOption {
  label: string
  value: MlPickerValue
  disabled?: boolean
  /** Cascading mode (`options`): the next column when this option is picked. */
  children?: MlPickerOption[]
}

/** `columns` may be fixed, or computed from the values being picked (dates). */
export type MlPickerColumns = MlPickerOption[][] | ((values: MlPickerValue[]) => MlPickerOption[][])

/** How a column came to rest: dragged / flung / tapped, mouse wheel, or keys. */
export type PickerSource = 'pointer' | 'wheel' | 'keyboard'

/* ── Geometry ─────────────────────────────────────────────── */

/** Visible rows are always odd (one centre row), at least 3. */
export function normalizeVisibleCount(n: number) {
  const v = Math.max(3, Math.round(Number.isFinite(n) ? n : 5))
  return v % 2 ? v : v + 1
}

export interface WheelGeometry {
  /** Visible rows. */
  count: number
  itemHeight: number
  /** Cylinder radius in px — the wheel is exactly `count × itemHeight` tall. */
  radius: number
  /** Degrees between neighbouring rows. */
  step: number
  /** Rows further than this (in items) from the centre face away and are hidden. */
  reach: number
}

export function wheelGeometry(itemHeight: number, visibleCount: number): WheelGeometry {
  const count = normalizeVisibleCount(visibleCount)
  const h = Math.max(16, itemHeight)
  const radius = (count * h) / 2
  // Neighbouring rows are one chord (≈ one item height) apart on the cylinder.
  const step = (2 * Math.asin(h / (2 * radius)) * 180) / Math.PI
  return { count, itemHeight: h, radius, step, reach: 90 / step }
}

/** Is row `i` on the back of the wheel when `pos` is centred? */
export const rowHidden = (i: number, pos: number, geo: WheelGeometry) => Math.abs(i - pos) >= geo.reach

/** Static transform that places row `i` on the cylinder. */
export const rowTransform = (i: number, geo: WheelGeometry) => `rotateX(${(-i * geo.step).toFixed(3)}deg) translateZ(${geo.radius.toFixed(2)}px)`

/** Track transform for position `pos`. */
export const trackTransform = (pos: number, geo: WheelGeometry) => `translateZ(${(-geo.radius).toFixed(2)}px) rotateX(${(pos * geo.step).toFixed(3)}deg)`

/** The row under a tap `dy` px below the wheel's centre (negative = above). */
export function rowAtOffset(dy: number, pos: number, geo: WheelGeometry) {
  const s = Math.max(-1, Math.min(1, dy / geo.radius))
  return Math.round(pos + (Math.asin(s) * 180) / Math.PI / geo.step)
}

/* ── Physics ──────────────────────────────────────────────── */

/** Momentum time constant (ms): a fling travels `velocity × MOMENTUM_TAU` items. */
export const MOMENTUM_TAU = 280
/** A fling's ease-out lasts `MOMENTUM_POWER × distance / speed` — about 1.1 s, clamped. */
export const MOMENTUM_POWER = 4
/** Spring time constant for the rubber-band bounce at an end (ms). */
export const BOUNCE_TAU = 130
/** Time constant for snapping into place / keyboard moves (ms). */
export const SNAP_TAU = 70
/** Fastest fling, in items per ms. */
export const MAX_SPEED = 0.2
/** Furthest a fling may overshoot the first / last row before bouncing back (items). */
export const MAX_OVERSHOOT = 0.9
/** Velocity is measured over the last this-many ms of a drag. */
export const VELOCITY_WINDOW = 100

/**
 * iOS-style rubber band: dragging `over` items past an end moves the wheel
 * less and less, approaching `dim` items.
 */
export function rubberband(over: number, dim: number) {
  if (over <= 0) return 0
  return (1 - 1 / ((over * 0.55) / dim + 1)) * dim
}

/** Raw drag position → displayed position, rubber-banded past [0, max]. */
export function rubberClamp(pos: number, max: number, dim: number) {
  if (pos < 0) return -rubberband(-pos, dim)
  if (pos > max) return max + rubberband(pos - max, dim)
  return pos
}

/**
 * The enabled row nearest `index` (rounded, clamped). Ties go in `prefer`'s
 * direction (+1 down / −1 up; 0 = down). −1 when every row is disabled.
 */
export function nearestEnabled(index: number, count: number, isDisabled: (i: number) => boolean, prefer = 0) {
  if (count <= 0) return -1
  const i0 = Math.min(count - 1, Math.max(0, Math.round(index)))
  if (!isDisabled(i0)) return i0
  for (let d = 1; d < count; d++) {
    const order = prefer < 0 ? [i0 - d, i0 + d] : [i0 + d, i0 - d]
    for (const i of order) if (i >= 0 && i < count && !isDisabled(i)) return i
  }
  return -1
}

/** The next enabled row `delta` rows away, stopping at the ends. */
export function stepEnabled(from: number, delta: number, count: number, isDisabled: (i: number) => boolean) {
  if (count <= 0) return -1
  const dir = delta < 0 ? -1 : 1
  let target = Math.min(count - 1, Math.max(0, from + delta))
  while (target >= 0 && target < count && isDisabled(target)) target += dir
  if (target < 0 || target >= count) return nearestEnabled(from + delta, count, isDisabled, -dir)
  return target
}

/** Where a fling released at `pos` with `velocity` (items/ms) comes to rest. */
export function momentumTarget(pos: number, velocity: number, count: number, isDisabled: (i: number) => boolean, tau = MOMENTUM_TAU) {
  return nearestEnabled(pos + velocity * tau, count, isDisabled, Math.sign(velocity))
}

/**
 * A critically damped glide from `from` (moving at `velocity`) onto `target`.
 * With `tau` = MOMENTUM_TAU and a target at the fling's natural end it is a
 * pure exponential deceleration; when the target is nearer (an end of the
 * list) the leftover speed carries the wheel past it and it springs back —
 * the rubber-band bounce — capped at `maxOvershoot` items.
 */
export interface Glide {
  target: number
  tau: number
  a: number
  b: number
}

export function makeGlide(from: number, velocity: number, target: number, tau: number, maxOvershoot = MAX_OVERSHOOT): Glide {
  const w = 1 / tau
  const a = from - target
  const cap = maxOvershoot * w * Math.E
  const b = Math.max(-cap, Math.min(cap, velocity + w * a))
  return { target, tau, a, b }
}

/** Position and velocity `t` ms into a glide. */
export function glideAt(g: Glide, t: number) {
  const w = 1 / g.tau
  const e = Math.exp(-w * t)
  return { pos: g.target + (g.a + g.b * t) * e, velocity: (g.b - w * (g.a + g.b * t)) * e }
}

/** A glide is over once it is within half a pixel of the target and barely moving. */
export const glideDone = (pos: number, velocity: number, target: number) => Math.abs(pos - target) < 0.008 && Math.abs(velocity) < 0.0006

/**
 * The motion after a release: an in-range fling is an ease-out
 * (`1 − (1 − u)^MOMENTUM_POWER`) that starts at the finger's speed and ends
 * exactly on the target row after a fixed time; a fling that runs past an end,
 * or anything else, is a spring (see makeGlide) so it can overshoot and bounce.
 */
export type Motion = ({ kind: 'spring' } & Glide) | { kind: 'ease'; target: number; from: number; duration: number }

export function makeMotion(from: number, velocity: number, target: number, tau: number, maxOvershoot = MAX_OVERSHOOT): Motion {
  return { kind: 'spring', ...makeGlide(from, velocity, target, tau, maxOvershoot) }
}

/** A fling released at `from` with `velocity` toward `target` within [0, max]. */
export function makeMomentum(from: number, velocity: number, target: number, max: number): Motion {
  const projected = from + velocity * MOMENTUM_TAU
  // Flung past an end: keep the speed, overshoot, spring back.
  if (projected < -0.5 || projected > max + 0.5) return makeMotion(from, velocity, target, BOUNCE_TAU)
  const d = target - from
  if (Math.abs(d) < 1e-6) return makeMotion(from, velocity, target, SNAP_TAU * 1.4)
  const same = Math.sign(d) === Math.sign(velocity) && Math.abs(velocity) > 1e-4
  const duration = same ? Math.min(2400, Math.max(260, (MOMENTUM_POWER * Math.abs(d)) / Math.abs(velocity))) : 320
  return { kind: 'ease', target, from, duration }
}

/** Position, velocity and whether `t` ms into a motion it has come to rest. */
export function motionAt(m: Motion, t: number) {
  if (m.kind === 'ease') {
    const u = Math.min(1, Math.max(0, t / m.duration))
    const k = MOMENTUM_POWER
    const d = m.target - m.from
    return { pos: m.from + d * (1 - (1 - u) ** k), velocity: u >= 1 ? 0 : ((k * d) / m.duration) * (1 - u) ** (k - 1), done: u >= 1 }
  }
  const s = glideAt(m, t)
  return { ...s, done: glideDone(s.pos, s.velocity, m.target) }
}

/** Release velocity (items/ms) from recent drag samples, newest last. */
export function releaseVelocity(samples: readonly { t: number; pos: number }[], now: number) {
  const recent = samples.filter((s) => now - s.t <= VELOCITY_WINDOW)
  if (recent.length < 2) return 0
  const first = recent[0]
  const last = recent[recent.length - 1]
  // The finger stopped before letting go: no fling.
  if (now - last.t > 60) return 0
  const dt = last.t - first.t
  if (dt <= 0) return 0
  const v = (last.pos - first.pos) / dt
  return Math.max(-MAX_SPEED, Math.min(MAX_SPEED, v))
}

/* ── Columns ──────────────────────────────────────────────── */

export interface PickerResolved {
  columns: MlPickerOption[][]
  /** Selected row per column (−1: empty column or everything disabled). */
  indexes: number[]
  values: MlPickerValue[]
  selected: (MlPickerOption | undefined)[]
}

function pickIndex(list: MlPickerOption[], value: MlPickerValue | undefined, hint: number | undefined) {
  let i = value === undefined ? -1 : list.findIndex((o) => o.value === value)
  if (i < 0 && typeof value === 'number') {
    // A number that isn't offered (day 31 in February, minute 33 with a 5-minute step): the closest one.
    let best = Infinity
    list.forEach((o, k) => {
      const d = typeof o.value === 'number' ? Math.abs(o.value - value) : Infinity
      if (d < best) {
        best = d
        i = k
      }
    })
  }
  if (i < 0) i = hint ?? 0
  return nearestEnabled(i, list.length, (k) => !!list[k]?.disabled)
}

function resolveOnce(columns: MlPickerOption[][], values: readonly MlPickerValue[], hints?: readonly number[]): PickerResolved {
  const out: PickerResolved = { columns, indexes: [], values: [], selected: [] }
  columns.forEach((list, c) => {
    const i = pickIndex(list, values[c], hints?.[c])
    out.indexes.push(i)
    out.selected.push(list[i])
    out.values.push(list[i]?.value ?? (values[c] as MlPickerValue))
  })
  return out
}

/**
 * What the wheels show for `values`. Independent `columns`: a missing number
 * takes the closest number offered (31 → Feb lands on 28/29), any other
 * missing value keeps its column's previous row (`hints`, clamped), and a
 * disabled one moves to the nearest enabled row.
 * Cascading `options`: each column is the children of the previous pick; a
 * missing value starts its column at the first enabled row.
 */
export function resolvePicker(source: { columns?: MlPickerColumns; options?: MlPickerOption[] }, values: readonly MlPickerValue[], hints?: readonly number[]): PickerResolved {
  if (source.options) {
    const out: PickerResolved = { columns: [], indexes: [], values: [], selected: [] }
    let list: MlPickerOption[] | undefined = source.options
    for (let c = 0; list && list.length; c++) {
      const i = pickIndex(list, values[c], undefined)
      out.columns.push(list)
      out.indexes.push(i)
      if (i < 0) break
      out.values.push(list[i].value)
      out.selected.push(list[i])
      list = list[i].children
    }
    return out
  }
  const make = source.columns ?? []
  if (typeof make !== 'function') return resolveOnce(make, values, hints)
  // Computed columns depend on the values; settle in a few rounds (Feb 31 → Feb 29).
  let current = [...values]
  let resolved = resolveOnce(make(current), current, hints)
  for (let round = 0; round < 3; round++) {
    if (resolved.values.every((v, i) => v === current[i]) && resolved.values.length === current.length) break
    current = resolved.values
    resolved = resolveOnce(make(current), current, resolved.indexes)
  }
  return resolved
}

/**
 * Values after the user picks row `index` of column `column`. In cascading
 * mode the later columns reset to their first enabled row.
 */
export function pickValues(source: { columns?: MlPickerColumns; options?: MlPickerOption[] }, current: PickerResolved, column: number, index: number) {
  const option = current.columns[column]?.[index]
  if (!option) return current
  const next = [...current.values]
  next[column] = option.value
  if (source.options) return resolvePicker(source, next.slice(0, column + 1))
  return resolvePicker(source, next, current.indexes)
}

export const sameValues = (a: readonly unknown[], b: readonly unknown[]) => a.length === b.length && a.every((v, i) => v === b[i])

/* ── Date & time presets ──────────────────────────────────── */

export const isLeapYear = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0

/** Days in month `m` (1–12) of year `y`. */
export const daysInMonth = (y: number, m: number) => new Date(y, m, 0).getDate()

const pad2 = (n: number) => String(n).padStart(2, '0')

export interface PickerDateOptions {
  /** Earliest pickable day. Default: 1 January ten years ago. */
  min?: Date
  /** Latest pickable day. Default: 31 December ten years ahead. */
  max?: Date
  /** `year-month` drops the day column. */
  type?: 'date' | 'year-month'
  /** Row labels; defaults to "2026" / "01" / "01". */
  format?: { year?: (y: number) => string; month?: (m: number) => string; day?: (d: number) => string }
}

function bounds(options: PickerDateOptions) {
  const now = new Date()
  const min = options.min ?? new Date(now.getFullYear() - 10, 0, 1)
  const max = options.max ?? new Date(now.getFullYear() + 10, 11, 31)
  return min <= max ? { min, max } : { min: max, max: min }
}

const dayNumber = (y: number, m: number, d: number) => y * 10000 + m * 100 + d
const dateNumber = (date: Date) => dayNumber(date.getFullYear(), date.getMonth() + 1, date.getDate())

/**
 * 年 / 月 / 日 columns for `values` = [year, month (1–12), day]. Pass the
 * returned function as `columns`: the day column follows the month (28–31,
 * Feb 29 in leap years) and rows outside [min, max] are disabled.
 */
export function datePickerColumns(options: PickerDateOptions = {}) {
  const fmtY = options.format?.year ?? ((y: number) => String(y))
  const fmtM = options.format?.month ?? pad2
  const fmtD = options.format?.day ?? pad2
  return (values: MlPickerValue[]): MlPickerOption[][] => {
    const { min, max } = bounds(options)
    const lo = dateNumber(min)
    const hi = dateNumber(max)
    const minY = min.getFullYear()
    const maxY = max.getFullYear()
    const y = Math.min(maxY, Math.max(minY, Number(values[0]) || new Date().getFullYear()))
    const m = Math.min(12, Math.max(1, Number(values[1]) || 1))
    const years: MlPickerOption[] = []
    for (let n = minY; n <= maxY; n++) years.push({ label: fmtY(n), value: n })
    const months: MlPickerOption[] = []
    for (let n = 1; n <= 12; n++) {
      const off = dayNumber(y, n, daysInMonth(y, n)) < lo || dayNumber(y, n, 1) > hi
      months.push(off ? { label: fmtM(n), value: n, disabled: true } : { label: fmtM(n), value: n })
    }
    if (options.type === 'year-month') return [years, months]
    const days: MlPickerOption[] = []
    for (let n = 1, last = daysInMonth(y, m); n <= last; n++) {
      const key = dayNumber(y, m, n)
      days.push(key < lo || key > hi ? { label: fmtD(n), value: n, disabled: true } : { label: fmtD(n), value: n })
    }
    return [years, months, days]
  }
}

/** Date → [year, month (1–12), day]. */
export const dateToPickerValue = (date: Date): number[] => [date.getFullYear(), date.getMonth() + 1, date.getDate()]

/** [year, month, day?] → Date (the day is clamped to the month). */
export function pickerValueToDate(values: readonly MlPickerValue[]) {
  const y = Number(values[0])
  const m = Number(values[1] ?? 1)
  const d = Math.min(Number(values[2] ?? 1), daysInMonth(y, m))
  return new Date(y, m - 1, d)
}

export interface PickerTimeOptions {
  minuteStep?: number
  /** Add a seconds column. */
  seconds?: boolean
  secondStep?: number
  /** Row labels; defaults to zero-padded numbers. */
  format?: { hour?: (h: number) => string; minute?: (m: number) => string; second?: (s: number) => string }
}

/** 時 / 分 (/ 秒) columns; values are numbers. */
export function timePickerColumns(options: PickerTimeOptions = {}): MlPickerOption[][] {
  const list = (end: number, step: number, fmt: (n: number) => string) => {
    const out: MlPickerOption[] = []
    for (let n = 0; n < end; n += Math.max(1, Math.round(step))) out.push({ label: fmt(n), value: n })
    return out
  }
  const cols = [list(24, 1, options.format?.hour ?? pad2), list(60, options.minuteStep ?? 1, options.format?.minute ?? pad2)]
  if (options.seconds) cols.push(list(60, options.secondStep ?? 1, options.format?.second ?? pad2))
  return cols
}

/* ── Type-ahead ───────────────────────────────────────────── */

/**
 * The row type-ahead jumps to: the next enabled label starting with `query`
 * after `from` (wrapping). Repeating one letter cycles through its matches.
 */
export function typeAheadMatch(labels: readonly string[], query: string, from: number, isDisabled: (i: number) => boolean) {
  const q = query.toLocaleLowerCase()
  if (!q) return -1
  const same = [...q].every((ch) => ch === q[0])
  const needle = same && q.length > 1 ? q[0] : q
  // A longer query keeps the current row if it still matches.
  const start = same ? from + 1 : from
  const n = labels.length
  for (let k = 0; k < n; k++) {
    const i = (((start + k) % n) + n) % n
    if (!isDisabled(i) && labels[i].trim().toLocaleLowerCase().startsWith(needle)) return i
  }
  return -1
}

/* ── DOM controller ───────────────────────────────────────── */

export interface PickerColumnConfig {
  itemHeight: number
  visibleCount: number
  labels: readonly string[]
  isDisabled: (i: number) => boolean
  disabled?: boolean
}

export const TRACK_CLASS = 'ml-picker-view__track'
export const SELECTED_CLASS = 'ml-picker-view__item--selected'

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now())
const reducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/**
 * Drives one wheel column: pointer drag / fling / tap, mouse wheel, keyboard
 * and type-ahead, momentum with snapping and rubber-banded ends, all on
 * requestAnimationFrame. The framework renders the rows; this only writes the
 * track's transform plus each row's visibility and "centre" class.
 */
export class PickerColumn {
  pos = 0
  /** The row the framework last committed (v-model). */
  committed = 0
  readonly el: HTMLElement
  private cfg: PickerColumnConfig
  private geo: WheelGeometry
  private onSelect: (index: number, source: PickerSource) => void
  private frame = 0
  private glide: Motion | null = null
  private glideStart = 0
  private glideSource: PickerSource = 'pointer'
  private drag: { id: number; y: number; startY: number; raw: number; start: number; samples: { t: number; pos: number }[]; moved: boolean } | null = null
  private wheelRaw: number | null = null
  private wheelDir = 0
  private wheelTimer: ReturnType<typeof setTimeout> | undefined
  private typed = ''
  private typedTimer: ReturnType<typeof setTimeout> | undefined
  private shown: [number, number] = [0, -1]
  private centre = -1
  private paintQueued = false

  constructor(el: HTMLElement, cfg: PickerColumnConfig, committed: number, onSelect: (index: number, source: PickerSource) => void) {
    this.el = el
    this.cfg = cfg
    this.geo = wheelGeometry(cfg.itemHeight, cfg.visibleCount)
    this.onSelect = onSelect
    this.committed = committed
    this.pos = Math.max(0, committed)
    el.addEventListener('pointerdown', this.onPointerDown)
    el.addEventListener('pointermove', this.onPointerMove)
    el.addEventListener('pointerup', this.onPointerUp)
    el.addEventListener('pointercancel', this.onPointerCancel)
    el.addEventListener('lostpointercapture', this.onPointerCancel)
    el.addEventListener('wheel', this.onWheel, { passive: false })
    el.addEventListener('keydown', this.onKeydown)
    this.paintAll()
  }

  private get count() {
    return this.cfg.labels.length
  }

  private get max() {
    return Math.max(0, this.count - 1)
  }

  private get items() {
    return (this.el.querySelector(`.${TRACK_CLASS}`)?.children ?? []) as HTMLCollectionOf<HTMLElement> | never[]
  }

  /** New rows, sizes or disabled state (call after the framework re-rendered). */
  update(cfg: PickerColumnConfig) {
    this.cfg = cfg
    this.geo = wheelGeometry(cfg.itemHeight, cfg.visibleCount)
    if (this.pos > this.max + 1) this.pos = this.max
    this.paintAll()
  }

  /** The framework's value moved to `index` (v-model, cascade reset, heal). */
  sync(index: number, animate: boolean) {
    this.committed = index
    if (index < 0 || this.drag) return this.paintAll()
    if (this.glide && this.glide.target === index) return this.paintAll()
    if (!this.glide && Math.abs(this.pos - index) < 1e-3) return this.paintAll()
    if (animate && !reducedMotion()) {
      this.paintAll()
      this.startGlide(index, 0, SNAP_TAU * 1.6, 'keyboard', false)
    } else {
      this.halt()
      this.pos = index
      this.paintAll()
    }
  }

  /** Jump any running glide to its end and settle now (e.g. before 確定). */
  finish() {
    if (this.drag) {
      this.drag = null
      this.startGlide(nearestEnabled(this.pos, this.count, this.cfg.isDisabled), 0, SNAP_TAU, 'pointer')
    }
    if (this.wheelRaw !== null) this.settleWheel()
    if (this.glide) {
      const { target } = this.glide
      const source = this.glideSource
      this.halt()
      this.pos = target
      this.paint()
      this.settle(target, source)
    }
  }

  destroy() {
    this.halt()
    clearTimeout(this.typedTimer)
    const el = this.el
    el.removeEventListener('pointerdown', this.onPointerDown)
    el.removeEventListener('pointermove', this.onPointerMove)
    el.removeEventListener('pointerup', this.onPointerUp)
    el.removeEventListener('pointercancel', this.onPointerCancel)
    el.removeEventListener('lostpointercapture', this.onPointerCancel)
    el.removeEventListener('wheel', this.onWheel)
    el.removeEventListener('keydown', this.onKeydown)
  }

  /* ── painting ── */

  private schedulePaint() {
    if (this.paintQueued || this.glide) return
    this.paintQueued = true
    this.frame = requestAnimationFrame(() => {
      this.paintQueued = false
      this.frame = 0
      this.paint()
    })
  }

  private setRow(el: HTMLElement | undefined, i: number) {
    if (!el) return
    const hide = rowHidden(i, this.pos, this.geo)
    if ((el.style.visibility === 'hidden') !== hide) el.style.visibility = hide ? 'hidden' : ''
  }

  /** Every row: after the framework patched the DOM. */
  private paintAll() {
    const items = this.items
    const track = this.el.querySelector<HTMLElement>(`.${TRACK_CLASS}`)
    if (track) track.style.transform = trackTransform(this.pos, this.geo)
    const centre = Math.round(this.pos)
    for (let i = 0; i < items.length; i++) {
      this.setRow(items[i], i)
      items[i].classList.toggle(SELECTED_CLASS, i === centre)
    }
    this.centre = centre
    this.shown = this.range()
  }

  private range(): [number, number] {
    const r = this.geo.reach
    return [Math.ceil(this.pos - r), Math.floor(this.pos + r)]
  }

  /** One frame: the track transform plus the rows entering / leaving view. */
  private paint() {
    const track = this.el.querySelector<HTMLElement>(`.${TRACK_CLASS}`)
    if (track) track.style.transform = trackTransform(this.pos, this.geo)
    const items = this.items
    const [lo, hi] = this.range()
    const from = Math.max(0, Math.min(lo, this.shown[0]) - 1)
    const to = Math.min(items.length - 1, Math.max(hi, this.shown[1]) + 1)
    for (let i = from; i <= to; i++) this.setRow(items[i], i)
    this.shown = [lo, hi]
    const centre = Math.min(this.max, Math.max(0, Math.round(this.pos)))
    if (centre !== this.centre) {
      items[this.centre]?.classList.remove(SELECTED_CLASS)
      items[centre]?.classList.add(SELECTED_CLASS)
      this.centre = centre
    }
  }

  /* ── motion ── */

  private halt() {
    if (this.frame) cancelAnimationFrame(this.frame)
    this.frame = 0
    this.paintQueued = false
    this.glide = null
    clearTimeout(this.wheelTimer)
    this.wheelRaw = null
  }

  private startGlide(target: number, velocity: number, tau: number, source: PickerSource, overshoot = true) {
    if (this.frame) cancelAnimationFrame(this.frame)
    this.paintQueued = false
    if (target < 0) {
      this.glide = null
      return
    }
    this.run(makeMotion(this.pos, velocity, target, tau, overshoot ? MAX_OVERSHOOT : 0.05), source)
  }

  private run(motion: Motion, source: PickerSource) {
    if (this.frame) cancelAnimationFrame(this.frame)
    this.paintQueued = false
    this.glide = motion
    this.glideStart = now()
    this.glideSource = source
    const tick = () => {
      const g = this.glide
      if (!g) return
      const s = motionAt(g, now() - this.glideStart)
      if (s.done || now() - this.glideStart > 6000) {
        this.glide = null
        this.frame = 0
        this.pos = g.target
        this.paint()
        this.settle(g.target, source)
        return
      }
      this.pos = s.pos
      this.paint()
      this.frame = requestAnimationFrame(tick)
    }
    this.frame = requestAnimationFrame(tick)
  }

  private settle(index: number, source: PickerSource) {
    if (index < 0 || index === this.committed) return
    this.committed = index
    this.onSelect(index, source)
  }

  /** Move to `index` for a keyboard command: commit at once, animate there. */
  private pickNow(index: number) {
    if (index < 0) return
    const base = this.glide ? this.glide.target : this.committed
    if (index === base && !this.glide) return
    const changed = index !== this.committed
    this.committed = index
    if (reducedMotion()) {
      this.halt()
      this.pos = index
      this.paint()
    } else {
      this.startGlide(index, this.glide ? motionAt(this.glide, now() - this.glideStart).velocity : 0, SNAP_TAU * 1.6, 'keyboard', false)
    }
    if (changed) this.onSelect(index, 'keyboard')
  }

  /* ── input ── */

  private onPointerDown = (e: PointerEvent) => {
    if (this.cfg.disabled || this.count === 0) return
    if (e.pointerType === 'mouse' && e.button !== 0) return
    e.preventDefault()
    this.el.focus({ preventScroll: true })
    // Catching a moving wheel stops it where it is.
    if (this.frame) cancelAnimationFrame(this.frame)
    this.frame = 0
    this.paintQueued = false
    this.glide = null
    clearTimeout(this.wheelTimer)
    this.wheelRaw = null
    const t = now()
    this.drag = { id: e.pointerId, y: e.clientY, startY: e.clientY, raw: this.pos, start: t, samples: [{ t, pos: this.pos }], moved: false }
    try {
      this.el.setPointerCapture?.(e.pointerId)
    } catch {
      /* synthetic events have no active pointer */
    }
  }

  private onPointerMove = (e: PointerEvent) => {
    const d = this.drag
    if (!d || e.pointerId !== d.id) return
    const dy = e.clientY - d.y
    d.y = e.clientY
    if (Math.abs(e.clientY - d.startY) > 4) d.moved = true
    d.raw -= dy / this.geo.itemHeight
    this.pos = rubberClamp(d.raw, this.max, this.geo.count / 2)
    const t = now()
    d.samples.push({ t, pos: this.pos })
    while (d.samples.length > 2 && t - d.samples[0].t > VELOCITY_WINDOW) d.samples.shift()
    this.schedulePaint()
  }

  private onPointerUp = (e: PointerEvent) => {
    const d = this.drag
    if (!d || e.pointerId !== d.id) return
    this.drag = null
    const t = now()
    if (!d.moved && t - d.start < 500) {
      // A tap: spin the tapped row into the band (disabled rows ignore taps).
      const rect = this.el.getBoundingClientRect()
      const row = rowAtOffset(e.clientY - (rect.top + rect.height / 2), this.pos, this.geo)
      const target = row >= 0 && row < this.count && !this.cfg.isDisabled(row) ? row : nearestEnabled(this.pos, this.count, this.cfg.isDisabled)
      this.startGlide(target, 0, SNAP_TAU * 1.6, 'pointer')
      return
    }
    const velocity = releaseVelocity(d.samples, t)
    const dis = this.cfg.isDisabled
    if (this.pos < 0 || this.pos > this.max) {
      // Let go while stretched past an end: spring back.
      this.startGlide(nearestEnabled(this.pos, this.count, dis, this.pos < 0 ? 1 : -1), 0, SNAP_TAU * 1.4, 'pointer')
    } else if (Math.abs(velocity) < 0.002 || reducedMotion()) {
      this.startGlide(momentumTarget(this.pos, velocity, this.count, dis, 60), 0, SNAP_TAU * 1.4, 'pointer')
    } else {
      const target = momentumTarget(this.pos, velocity, this.count, dis)
      if (target >= 0) this.run(makeMomentum(this.pos, velocity, target, this.max), 'pointer')
    }
  }

  private onPointerCancel = (e: Event) => {
    const d = this.drag
    if (!d || ((e as PointerEvent).pointerId !== undefined && (e as PointerEvent).pointerId !== d.id)) return
    this.drag = null
    this.startGlide(nearestEnabled(this.pos, this.count, this.cfg.isDisabled), 0, SNAP_TAU * 1.4, 'pointer')
  }

  private onWheel = (e: WheelEvent) => {
    if (this.cfg.disabled || this.count === 0 || this.drag) return
    e.preventDefault()
    if (this.glide && this.wheelRaw === null) {
      this.halt()
    }
    if (this.wheelRaw === null) this.wheelRaw = this.pos
    const unit = e.deltaMode === 1 ? this.geo.itemHeight : e.deltaMode === 2 ? this.geo.itemHeight * this.geo.count : 1
    // One mouse-wheel notch moves one row; trackpads scroll smoothly.
    const dy = Math.max(-this.geo.itemHeight, Math.min(this.geo.itemHeight, e.deltaY * unit))
    if (dy) this.wheelDir = Math.sign(dy)
    this.wheelRaw += dy / this.geo.itemHeight
    // Don't let a long trackpad swipe wind the rubber band up endlessly.
    this.wheelRaw = Math.max(-2, Math.min(this.max + 2, this.wheelRaw))
    this.pos = rubberClamp(this.wheelRaw, this.max, this.geo.count / 2)
    this.paint()
    clearTimeout(this.wheelTimer)
    this.wheelTimer = setTimeout(() => this.settleWheel(), 140)
  }

  private settleWheel() {
    clearTimeout(this.wheelTimer)
    this.wheelRaw = null
    const target = nearestEnabled(this.pos, this.count, this.cfg.isDisabled, this.wheelDir)
    this.startGlide(target, 0, SNAP_TAU * 1.6, 'wheel')
  }

  private onKeydown = (e: KeyboardEvent) => {
    if (this.cfg.disabled || this.count === 0 || e.altKey || e.ctrlKey || e.metaKey) return
    const base = this.glide ? this.glide.target : Math.max(0, this.committed)
    const dis = this.cfg.isDisabled
    const page = this.geo.count
    let next: number | undefined
    switch (e.key) {
      case 'ArrowDown':
        next = stepEnabled(base, 1, this.count, dis)
        break
      case 'ArrowUp':
        next = stepEnabled(base, -1, this.count, dis)
        break
      case 'PageDown':
        next = stepEnabled(base, page, this.count, dis)
        break
      case 'PageUp':
        next = stepEnabled(base, -page, this.count, dis)
        break
      case 'Home':
        next = nearestEnabled(0, this.count, dis, 1)
        break
      case 'End':
        next = nearestEnabled(this.count - 1, this.count, dis, -1)
        break
      default:
        if (e.key.length === 1 && e.key !== ' ') {
          clearTimeout(this.typedTimer)
          this.typed += e.key
          this.typedTimer = setTimeout(() => (this.typed = ''), 600)
          const hit = typeAheadMatch(this.cfg.labels, this.typed, base, dis)
          e.preventDefault()
          if (hit >= 0) this.pickNow(hit)
        }
        return
    }
    e.preventDefault()
    this.pickNow(next)
  }
}
