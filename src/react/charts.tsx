import { Fragment, useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react'
import { barLayout, bubbleRadius, chartStops, diamondPath, funnelStages, linearFit, nearestIndex, niceScale, niceStep, percentText, seriesColors, smoothPath, type BarSegment } from '../components/charts'
import { addDays, dayKey, startOfDay } from '../components/dates'
import { createPawPath } from '../components/paw'
import { highlightLines } from '../highlight'
import { mascotImages } from '../mascot'
import { encodeQr, qrEyePath, qrLayout, type QrLevel } from '../qrcode'
import type { MlBarMode, MlBarSeries, MlChartDatum, MlChartTone, MlFunnelDatum, MlHeatmapDatum, MlLineSeries, MlScatterSeries, MlScatterShape } from '../types'
import { Button, Paw, useSvgId } from './basic'
import { toast } from './overlay'
import { useLocale } from './locale'
import { cx } from './utils'

/* ── Ring & Sparkline ──────────────────────────────────── */

export interface RingProps {
  value: number
  max?: number
  size?: number
  thickness?: number
  label?: string
  tone?: MlChartTone
  showValue?: boolean
  children?: ReactNode
}

export function Ring({ value, max = 100, size = 120, thickness = 9, label, tone = 'gold', showValue = true, children }: RingProps) {
  const gradientId = useSvgId('ml-ring')
  const radius = 50 - thickness / 2 - 2
  const c = 2 * Math.PI * radius
  const percent = Math.min(100, Math.max(0, (value / max) * 100))
  return (
    <div
      className={cx('ml-ring', `ml-ring--${tone}`)}
      style={{ '--_size': `${size}px` } as CSSProperties}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(percent)}
      aria-label={label}
    >
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={chartStops[tone][0]} />
            <stop offset="1" stopColor={chartStops[tone][1]} />
          </linearGradient>
        </defs>
        <circle className="ml-ring__track" cx="50" cy="50" r={radius} strokeWidth={thickness} />
        <circle
          className="ml-ring__bar"
          cx="50"
          cy="50"
          r={radius}
          strokeWidth={thickness}
          stroke={`url(#${gradientId})`}
          strokeDasharray={c}
          strokeDashoffset={c * (1 - percent / 100)}
          style={{ '--_c': c } as CSSProperties}
        />
      </svg>
      <div className="ml-ring__center">
        {children ?? (
          <>
            {showValue && <span className="ml-ring__value">{Math.round(percent)}%</span>}
            {label && <span className="ml-ring__label">{label}</span>}
          </>
        )}
      </div>
    </div>
  )
}

export interface SparklineProps {
  data: number[]
  width?: number
  height?: number
  tone?: MlChartTone
  area?: boolean
  title?: string
}

export function Sparkline({ data, width = 120, height = 36, tone = 'gold', area = true, title }: SparklineProps) {
  const gradientId = useSvgId('ml-spark')
  const PAD = 3
  const values = data.length ? data : [0]
  const min = Math.min(...values)
  const span = Math.max(...values) - min || 1
  const stepX = values.length > 1 ? (width - PAD * 2) / (values.length - 1) : 0
  const pts = values.map((v, i) => ({ x: PAD + i * stepX, y: PAD + (1 - (v - min) / span) * (height - PAD * 2) }))
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
  const fill = `${line} L${pts[pts.length - 1].x.toFixed(1)} ${height} L${pts[0].x.toFixed(1)} ${height} Z`
  const last = pts[pts.length - 1]
  return (
    <svg
      className={cx('ml-sparkline', `ml-sparkline--${tone}`)}
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={chartStops[tone][0]} stopOpacity={0.45} />
          <stop offset="1" stopColor={chartStops[tone][1]} stopOpacity={0} />
        </linearGradient>
      </defs>
      {area && <path d={fill} fill={`url(#${gradientId})`} className="ml-sparkline__area" />}
      <path d={line} pathLength={1} className="ml-sparkline__line" fill="none" stroke={chartStops[tone][0]} strokeWidth={1.8} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={last.x} cy={last.y} r={2.6} fill={chartStops[tone][0]} className="ml-sparkline__dot" />
    </svg>
  )
}

/* ── BarChart & Donut ──────────────────────────────────── */

export interface BarChartProps {
  /** Single-series bars. */
  data?: MlChartDatum[]
  /** Several series, one value per label — switches to the multi-series chart. */
  series?: MlBarSeries[]
  /** Category (x-axis) labels for `series`. */
  labels?: string[]
  /** How several series are drawn. */
  mode?: MlBarMode
  /** Total above each stacked bar (stacked / percent modes). */
  showTotal?: boolean
  /** Show the series legend (on by default with more than one series). Click a key to hide that series. */
  legend?: boolean
  height?: number
  tone?: MlChartTone
  highlight?: 'max' | number | null
  ticks?: number
  format?: (value: number) => string
  label?: string
  /** A legend key was clicked. */
  onToggle?: (name: string, visible: boolean) => void
}

export function BarChart({ data = [], series, height = 200, tone = 'gold', highlight = 'max', ticks = 4, format, label, ...multi }: BarChartProps) {
  const fmt = (v: number) => (format ? format(v) : v.toLocaleString())
  if (series) return <MultiBarChart series={series} height={height} ticks={ticks} format={format} label={label} {...multi} />
  const max = Math.max(0, ...data.map((d) => d.value))
  const top = max === 0 ? ticks : niceStep(max, ticks) * ticks
  const tickValues = Array.from({ length: ticks + 1 }, (_, i) => (top / ticks) * (ticks - i))
  let best = -1
  if (highlight === 'max') data.forEach((d, i) => (best === -1 || d.value > data[best].value) && (best = i))
  const hi = highlight === null ? -1 : typeof highlight === 'number' ? highlight : best
  return (
    <figure className={cx('ml-bars', `ml-bars--${tone}`)} style={{ '--_h': `${height}px` } as CSSProperties} role="img" aria-label={label ?? data.map((d) => `${d.label} ${fmt(d.value)}`).join('，')}>
      <div className="ml-bars__axis" aria-hidden="true">
        {tickValues.map((t) => (
          <span key={t}>{fmt(t)}</span>
        ))}
      </div>
      <div className="ml-bars__plot" aria-hidden="true">
        <div className="ml-bars__grid">
          {tickValues.map((t) => (
            <i key={t} />
          ))}
        </div>
        {data.map((d, i) => (
          <div key={`${i}-${d.label}`} className="ml-bars__col">
            <div className="ml-bars__track">
              <div className={cx('ml-bars__bar', { 'ml-bars__bar--hi': i === hi })} style={{ height: `${(d.value / top) * 100}%`, '--_i': i } as CSSProperties}>
                {i === hi && <span className="ml-bars__tip">{fmt(d.value)}</span>}
              </div>
            </div>
            <span className="ml-bars__x">{d.label}</span>
          </div>
        ))}
      </div>
    </figure>
  )
}

type MultiBarProps = Omit<BarChartProps, 'data' | 'tone' | 'highlight' | 'series'> & { series: MlBarSeries[]; height: number; ticks: number }

// Hooks live here so the single-series BarChart stays hook-free.
function MultiBarChart({ series, labels, mode = 'grouped', showTotal = false, legend, height, ticks, format, label, onToggle }: MultiBarProps) {
  const loc = useLocale()
  const fmt = (v: number) => (format ? format(v) : v.toLocaleString())
  const [hidden, setHidden] = useState<number[]>([])
  const [hover, setHover] = useState<number | null>(null)
  const count = Math.max(labels?.length ?? 0, ...series.map((s) => s.data.length))
  const layout = barLayout(
    series.map((s) => s.data),
    count,
    mode,
    series.map((_, i) => !hidden.includes(i)),
    ticks,
  )
  const pos = (v: number) => ((v - layout.lo) / (layout.hi - layout.lo || 1)) * 100
  const colors = series.map((s, i) => s.color ?? (s.tone ? chartStops[s.tone][0] : seriesColors[i % seriesColors.length]))
  const axis = [...layout.values].reverse()
  const tickText = (t: number) => (mode === 'percent' ? percentText(t) : fmt(t))
  const totals = showTotal && mode !== 'grouped'
  const showLegend = legend ?? series.length > 1
  const catLabel = (i: number) => labels?.[i] ?? `#${i + 1}`
  const valueText = (s: BarSegment) => (mode === 'percent' ? `${fmt(s.value)} · ${percentText(s.share)}` : fmt(s.value))
  const tipSide = (i: number) => (i + 0.5 > count * 0.6 ? 'left' : 'right')
  const summary = label ?? loc.bars.summary(mode, series.length, count)

  const toggle = (i: number) => {
    const on = hidden.includes(i)
    setHidden(on ? hidden.filter((h) => h !== i) : [...hidden, i])
    onToggle?.(series[i].name, on)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!count) return
    const moves: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1 }
    if (event.key === 'Home') setHover(0)
    else if (event.key === 'End') setHover(count - 1)
    else if (event.key in moves) setHover(Math.min(count - 1, Math.max(0, (hover ?? -1) + moves[event.key])))
    else if (event.key === 'Escape') setHover(null)
    else return
    event.preventDefault()
  }

  return (
    <figure className={cx('ml-bars', 'ml-bars--multi', `ml-bars--${mode}`, { 'ml-bars--totals': totals })} style={{ '--_h': `${height}px` } as CSSProperties}>
      {showLegend && (
        <div className="ml-bars__legend">
          {series.map((s, i) => (
            <button
              key={s.name}
              type="button"
              className={cx('ml-bars__key', { 'ml-bars__key--off': hidden.includes(i) })}
              aria-pressed={!hidden.includes(i)}
              aria-label={loc.bars.toggle(s.name)}
              onClick={() => toggle(i)}
            >
              <i style={{ background: colors[i], color: colors[i] }} />
              {s.name}
            </button>
          ))}
        </div>
      )}
      <div className="ml-bars__body">
        <div className="ml-bars__axis" aria-hidden="true">
          {axis.map((t) => (
            <span key={t}>{tickText(t)}</span>
          ))}
        </div>
        <div className="ml-bars__plot" role="img" tabIndex={0} aria-label={summary} onPointerLeave={() => setHover(null)} onKeyDown={onKeyDown} onBlur={() => setHover(null)}>
          <div className="ml-bars__grid">
            {axis.map((t) => (
              <i key={t} className={t === 0 ? 'ml-bars__zero' : undefined} />
            ))}
          </div>
          {layout.categories.map((c, i) => {
            // Grouped bars get one slot per visible series; stacked ones share a single slot.
            const slots = mode === 'grouped' ? c.segments.map((s) => ({ key: `s${s.series}`, segments: [s] })) : [{ key: 'stack', segments: c.segments.filter((s) => s.to !== s.from) }]
            return (
              <div key={i} className={cx('ml-bars__col', { 'ml-bars__col--on': i === hover })} onPointerEnter={() => setHover(i)}>
                <div className="ml-bars__track">
                  {slots.map((slot) => (
                    <div key={slot.key} className="ml-bars__slot">
                      {slot.segments.map((s) => (
                        <div
                          key={s.series}
                          className={cx('ml-bars__seg', { 'ml-bars__seg--neg': s.to < s.from })}
                          style={{ bottom: `${pos(Math.min(s.from, s.to))}%`, height: `${Math.abs(pos(s.to) - pos(s.from))}%`, '--_c': colors[s.series], '--_i': i } as CSSProperties}
                        />
                      ))}
                    </div>
                  ))}
                  {totals && c.segments.length > 0 && (
                    <span className="ml-bars__total" style={{ bottom: `${pos(c.top)}%` }}>
                      {fmt(c.total)}
                    </span>
                  )}
                </div>
                <span className="ml-bars__x">{catLabel(i)}</span>
                {i === hover && (
                  <div className={cx('ml-bars__pop', `ml-bars__pop--${tipSide(i)}`)} aria-live="polite">
                    <p className="ml-bars__pop-title">{catLabel(i)}</p>
                    {c.segments.map((s) => (
                      <p key={s.series} className="ml-bars__pop-row">
                        <i style={{ background: colors[s.series] }} />
                        <span>{series[s.series].name}</span>
                        <b>{valueText(s)}</b>
                      </p>
                    ))}
                    {mode !== 'grouped' && c.segments.length > 0 && (
                      <p className="ml-bars__pop-row ml-bars__pop-row--total">
                        <span>{loc.bars.total}</span>
                        <b>{fmt(c.total)}</b>
                      </p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
      <table className="ml-visually-hidden">
        <caption>{loc.bars.table}</caption>
        <thead>
          <tr>
            <th scope="col">{loc.bars.category}</th>
            {series.map((s) => (
              <th key={s.name} scope="col">
                {s.name}
              </th>
            ))}
            {mode !== 'grouped' && <th scope="col">{loc.bars.total}</th>}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: count }, (_, i) => (
            <tr key={i}>
              <th scope="row">{catLabel(i)}</th>
              {series.map((s) => (
                <td key={s.name}>{s.data[i] !== undefined ? fmt(s.data[i]) : '—'}</td>
              ))}
              {mode !== 'grouped' && <td>{fmt(series.reduce((sum, s) => sum + (s.data[i] ?? 0), 0))}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}

export interface DonutProps {
  data: MlChartDatum[]
  size?: number
  thickness?: number
  title?: ReactNode
  caption?: ReactNode
  legend?: boolean
  label?: string
}

export function Donut({ data, size = 160, thickness = 12, title, caption, legend = true, label }: DonutProps) {
  const total = data.reduce((sum, d) => sum + Math.max(0, d.value), 0)
  const radius = 50 - thickness / 2 - 1
  const c = 2 * Math.PI * radius
  const GAP = 1.2
  let offset = 0
  const segments = data.map((d, i) => {
    const share = total ? Math.max(0, d.value) / total : 0
    const length = share * c
    const seg = { label: d.label, percent: share * 100, color: d.color ?? seriesColors[i % seriesColors.length], dash: `${Math.max(0, length - GAP)} ${c}`, offset: -offset }
    offset += length
    return seg
  })
  const pct = (p: number) => `${p < 10 && p % 1 ? p.toFixed(1) : Math.round(p)}%`
  return (
    <figure className="ml-donut" style={{ '--_size': `${size}px` } as CSSProperties}>
      <div className="ml-donut__chart" role="img" aria-label={label ?? segments.map((s) => `${s.label} ${pct(s.percent)}`).join('，')}>
        <svg viewBox="0 0 100 100" aria-hidden="true">
          <circle className="ml-donut__track" cx="50" cy="50" r={radius} strokeWidth={thickness} />
          {segments.map((s) => (
            <circle key={s.label} className="ml-donut__seg" cx="50" cy="50" r={radius} stroke={s.color} strokeWidth={thickness} strokeDasharray={s.dash} strokeDashoffset={s.offset} />
          ))}
        </svg>
        {(title || caption) && (
          <div className="ml-donut__center" aria-hidden="true">
            {title && <span className="ml-donut__title">{title}</span>}
            {caption && <span className="ml-donut__caption">{caption}</span>}
          </div>
        )}
      </div>
      {legend && (
        <ul className="ml-donut__legend">
          {segments.map((s) => (
            <li key={s.label}>
              <i style={{ background: s.color }} />
              <span className="ml-donut__name">{s.label}</span>
              <span className="ml-donut__pct">{pct(s.percent)}</span>
            </li>
          ))}
        </ul>
      )}
    </figure>
  )
}

/* ── Heatmap ───────────────────────────────────────────── */

export interface HeatmapProps {
  data: MlHeatmapDatum[]
  end?: Date
  weeks?: number
  cell?: 'square' | 'paw'
  thresholds?: [number, number, number, number]
  weekStartsOn?: 0 | 1
  tone?: 'gold' | 'tech' | 'bean' | 'success'
  format?: (count: number, date: Date) => string
  label?: string
  onSelect?: (date: Date, count: number) => void
}

const H_SIZE = 12
const H_STEP = 15
const H_LEFT = 28
const H_TOP = 18
const PAW_PATH = createPawPath()

function toDay(value: Date | string) {
  if (typeof value !== 'string') return startOfDay(value)
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  return startOfDay(m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(value))
}

export function Heatmap({ data, end, weeks = 53, cell = 'square', thresholds, weekStartsOn = 0, tone = 'gold', format, label, onSelect }: HeatmapProps) {
  const loc = useLocale()
  const [hovered, setHovered] = useState<string | null>(null)
  const model = useMemo(() => {
    const counts = new Map<string, number>()
    for (const d of data) {
      const key = dayKey(toDay(d.date))
      counts.set(key, (counts.get(key) ?? 0) + d.count)
    }
    const last = startOfDay(end ?? new Date())
    const first = addDays(last, -((last.getDay() - weekStartsOn + 7) % 7) - (weeks - 1) * 7)
    let levels = thresholds
    if (!levels) {
      const values = [...counts.values()].filter((v) => v > 0).sort((a, b) => a - b)
      const q = (p: number) => values[Math.min(values.length - 1, Math.floor(p * values.length))]
      levels = values.length ? [1, Math.max(2, q(0.25)), Math.max(3, q(0.5)), Math.max(4, q(0.75))] : [1, 2, 3, 4]
    }
    const [, l2, l3, l4] = levels
    const levelOf = (n: number) => (n <= 0 ? 0 : n >= l4 ? 4 : n >= l3 ? 3 : n >= l2 ? 2 : 1)
    const cells: { x: number; y: number; date: Date; count: number; level: number; key: string }[] = []
    for (let w = 0; w < weeks; w++) {
      for (let d = 0; d < 7; d++) {
        const date = addDays(first, w * 7 + d)
        if (date > last) break
        const key = dayKey(date)
        const count = counts.get(key) ?? 0
        cells.push({ x: H_LEFT + w * H_STEP, y: H_TOP + d * H_STEP, date, count, level: levelOf(count), key })
      }
    }
    const monthFmt = new Intl.DateTimeFormat(loc.name, { month: 'short' })
    const months: { x: number; text: string }[] = []
    let lastMonth = -1
    for (let w = 0; w < weeks; w++) {
      const date = addDays(first, w * 7)
      if (date.getMonth() !== lastMonth && date.getDate() <= 7) {
        if (!months.length || H_LEFT + w * H_STEP - months[months.length - 1].x > 26) months.push({ x: H_LEFT + w * H_STEP, text: monthFmt.format(date) })
        lastMonth = date.getMonth()
      }
    }
    const dayFmt = new Intl.DateTimeFormat(loc.name, { weekday: 'short' })
    const weekdays = [1, 3, 5].map((row) => ({ y: H_TOP + row * H_STEP + H_SIZE - 2, text: dayFmt.format(new Date(2023, 0, 1 + ((row + weekStartsOn) % 7))) }))
    return { cells, months, weekdays, total: cells.reduce((s, c) => s + c.count, 0) }
  }, [data, end, weeks, thresholds, weekStartsOn, loc])

  const dateFmt = new Intl.DateTimeFormat(loc.name, { dateStyle: 'medium' })
  const describe = (c: { count: number; date: Date }) => (format ? format(c.count, c.date) : loc.heatmap.cell(c.count, dateFmt.format(c.date)))
  const width = H_LEFT + weeks * H_STEP
  const height = H_TOP + 7 * H_STEP

  return (
    <figure className={cx('ml-heatmap', `ml-heatmap--${tone}`, `ml-heatmap--${cell}`)}>
      <div className="ml-heatmap__scroll">
        <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} role="img" aria-label={label ?? loc.heatmap.summary(model.total)}>
          {model.months.map((m) => (
            <text key={m.x} x={m.x} y={10} className="ml-heatmap__axis">
              {m.text}
            </text>
          ))}
          {model.weekdays.map((d) => (
            <text key={d.y} x={0} y={d.y} className="ml-heatmap__axis">
              {d.text}
            </text>
          ))}
          {model.cells.map((c, i) => {
            const props = {
              className: cx('ml-heatmap__cell', `ml-heatmap__cell--l${c.level}`, { 'ml-heatmap__cell--hover': hovered === c.key }),
              onMouseEnter: () => setHovered(c.key),
              onMouseLeave: () => setHovered(null),
              onClick: () => onSelect?.(c.date, c.count),
            }
            return (
              <g key={c.key} style={{ '--_i': Math.floor(i / 7) } as CSSProperties}>
                {cell === 'paw' ? (
                  <path d={PAW_PATH} transform={`translate(${c.x} ${c.y}) scale(${H_SIZE / 24})`} {...props}>
                    <title>{describe(c)}</title>
                  </path>
                ) : (
                  <rect x={c.x} y={c.y} width={H_SIZE} height={H_SIZE} rx={2.5} {...props}>
                    <title>{describe(c)}</title>
                  </rect>
                )}
              </g>
            )
          })}
        </svg>
      </div>
      <figcaption className="ml-heatmap__foot">
        <span className="ml-heatmap__total">{loc.heatmap.summary(model.total)}</span>
        <span className="ml-heatmap__legend" aria-hidden="true">
          {loc.heatmap.less}
          {[0, 1, 2, 3, 4].map((l) => (
            <i key={l} className={cx('ml-heatmap__swatch', `ml-heatmap__cell--l${l}`)} />
          ))}
          {loc.heatmap.more}
        </span>
      </figcaption>
    </figure>
  )
}

/* ── Gauge & Radar ─────────────────────────────────────── */

export interface GaugeProps {
  value: number
  min?: number
  max?: number
  unit?: string
  label?: string
  size?: number
  tone?: MlChartTone
  bands?: { from: number; tone: MlChartTone }[]
  ticks?: number
  format?: (value: number) => string
}

export function Gauge({ value, min = 0, max = 100, unit, label, size = 220, tone = 'gold', bands, ticks = 5, format }: GaugeProps) {
  const uid = useSvgId('ml-gauge')
  const START = -210
  const SWEEP = 240
  const C = 100
  const R = 78
  const clamp = (v: number) => Math.min(max, Math.max(min, v))
  const ratio = (clamp(value) - min) / (max - min || 1)
  const fmt = (v: number) => (format ? format(v) : Math.round(v).toLocaleString())
  const polar = (deg: number, r: number) => ({ x: C + Math.cos((deg * Math.PI) / 180) * r, y: C + Math.sin((deg * Math.PI) / 180) * r })
  const arc = (from: number, to: number, r: number) => {
    const a = polar(START + SWEEP * from, r)
    const b = polar(START + SWEEP * to, r)
    return `M${a.x.toFixed(2)} ${a.y.toFixed(2)}A${r} ${r} 0 ${SWEEP * (to - from) > 180 ? 1 : 0} 1 ${b.x.toFixed(2)} ${b.y.toFixed(2)}`
  }
  let toneNow = tone
  for (const band of [...(bands ?? [])].sort((a, b) => a.from - b.from)) if (clamp(value) >= band.from) toneNow = band.tone
  const needle = polar(START + SWEEP * ratio, R - 30)
  const marks = Array.from({ length: ticks + 1 }, (_, i) => {
    const deg = START + (SWEEP * i) / ticks
    return { a: polar(deg, R + 9), b: polar(deg, R + 14), lab: polar(deg, R - 16), text: fmt(min + ((max - min) * i) / ticks) }
  })
  const bandArcs = (bands ?? []).map((band, i, all) => {
    const from = (clamp(band.from) - min) / (max - min || 1)
    const next = all.filter((b) => b.from > band.from).sort((a, b) => a.from - b.from)[0]?.from ?? max
    return { d: arc(from, (clamp(next) - min) / (max - min || 1), R + 11), color: chartStops[band.tone][1], key: i }
  })
  return (
    <figure className={cx('ml-gauge', `ml-gauge--${toneNow}`)} style={{ '--_size': `${size}px` } as CSSProperties}>
      <svg
        viewBox="0 0 200 172"
        width={size}
        height={size * 0.86}
        role="meter"
        aria-valuenow={value}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuetext={`${fmt(value)}${unit ?? ''}`}
        aria-label={label}
      >
        <defs>
          <linearGradient id={uid} x1="0" y1="1" x2="1" y2="0">
            <stop offset="0" stopColor={chartStops[toneNow][1]} />
            <stop offset="1" stopColor={chartStops[toneNow][0]} />
          </linearGradient>
        </defs>
        {bandArcs.map((b) => (
          <path key={b.key} d={b.d} className="ml-gauge__band" stroke={b.color} />
        ))}
        <g className="ml-gauge__ticks">
          {marks.map((t, i) => (
            <line key={i} x1={t.a.x} y1={t.a.y} x2={t.b.x} y2={t.b.y} />
          ))}
        </g>
        <path d={arc(0, 1, R)} className="ml-gauge__track" />
        <path d={arc(0, Math.max(0.0001, ratio), R)} className="ml-gauge__bar" stroke={`url(#${uid})`} pathLength={1} />
        <line x1={C} y1={C} x2={needle.x} y2={needle.y} className="ml-gauge__needle" />
        <circle cx={C} cy={C} r={6} className="ml-gauge__hub" />
        {marks.map((t, i) => (
          <text key={`t${i}`} x={t.lab.x} y={t.lab.y} textAnchor="middle" dominantBaseline="middle" className="ml-gauge__tick-label">
            {t.text}
          </text>
        ))}
      </svg>
      <figcaption className="ml-gauge__readout" aria-hidden="true">
        <span className="ml-gauge__value">
          {fmt(value)}
          {unit && <small>{unit}</small>}
        </span>
        {label && <span className="ml-gauge__label">{label}</span>}
      </figcaption>
    </figure>
  )
}

export interface RadarChartProps {
  indicators: { label: string; max?: number }[]
  series: { name: string; values: number[]; tone?: MlChartTone; color?: string }[]
  size?: number
  rings?: number
  polygon?: boolean
  legend?: boolean
  format?: (value: number) => string
  label?: string
}

export function RadarChart({ indicators, series, size = 280, rings = 4, polygon = true, legend, format, label }: RadarChartProps) {
  const fmt = (v: number) => (format ? format(v) : v.toLocaleString())
  const C = 150
  const R = 104
  const n = indicators.length
  const maxes = indicators.map((ind, i) => ind.max ?? Math.max(1, ...series.map((s) => s.values[i] ?? 0)))
  const angle = (i: number) => -Math.PI / 2 + (2 * Math.PI * i) / n
  const point = (i: number, r: number) => ({ x: C + Math.cos(angle(i)) * r, y: C + Math.sin(angle(i)) * r })
  const shapes = series.map((s, k) => {
    const color = s.color ?? (s.tone ? chartStops[s.tone][0] : seriesColors[k % seriesColors.length])
    const pts = indicators.map((_, i) => point(i, (Math.min(s.values[i] ?? 0, maxes[i]) / maxes[i]) * R))
    return { ...s, color, pts, points: pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') }
  })
  const summary = label ?? series.map((s) => `${s.name}：${indicators.map((ind, i) => `${ind.label} ${fmt(s.values[i] ?? 0)}`).join('、')}`).join('；')
  return (
    <figure className="ml-radar">
      <svg viewBox="0 0 300 300" width={size} height={size} role="img" aria-label={summary}>
        <g className="ml-radar__grid">
          {Array.from({ length: rings }, (_, k) => {
            const r = (R * (k + 1)) / rings
            return polygon ? (
              <polygon key={r} points={indicators.map((_, i) => point(i, r)).map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')} />
            ) : (
              <circle key={r} cx={C} cy={C} r={r} />
            )
          })}
          {indicators.map((_, i) => {
            const e = point(i, R)
            return <line key={i} x1={C} y1={C} x2={e.x} y2={e.y} />
          })}
        </g>
        {indicators.map((ind, i) => {
          const p = point(i, R + 18)
          const cos = Math.cos(angle(i))
          return (
            <text key={`l${i}`} x={p.x} y={p.y} textAnchor={Math.abs(cos) < 0.2 ? 'middle' : cos > 0 ? 'start' : 'end'} dominantBaseline="middle" className="ml-radar__label">
              {ind.label}
            </text>
          )
        })}
        {shapes.map((s, k) => (
          <g key={s.name} className="ml-radar__series" style={{ '--_i': k, color: s.color } as CSSProperties}>
            <polygon points={s.points} className="ml-radar__area" />
            {s.pts.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r={3} className="ml-radar__dot">
                <title>{`${s.name} · ${indicators[i].label}：${fmt(s.values[i] ?? 0)}`}</title>
              </circle>
            ))}
          </g>
        ))}
      </svg>
      {(legend ?? series.length > 1) && (
        <figcaption className="ml-radar__legend" aria-hidden="true">
          {shapes.map((s) => (
            <span key={s.name}>
              <i style={{ background: s.color, color: s.color }} />
              {s.name}
            </span>
          ))}
        </figcaption>
      )}
    </figure>
  )
}

/* ── QRCode ────────────────────────────────────────────── */

export interface QRCodeProps {
  value: string
  size?: number
  level?: QrLevel
  shape?: 'square' | 'rounded'
  logo?: 'paw' | 'lion' | 'none'
  margin?: number
  color?: string
  background?: string
  eyeColor?: string
  title?: string
  children?: ReactNode
}

export function QRCode({ value, size = 200, level = 'M', shape = 'rounded', logo = 'none', margin = 2, color = '#12151c', background = '#f4f6f9', eyeColor = '#a96c0e', title, children }: QRCodeProps) {
  const loc = useLocale()
  const uid = useSvgId('ml-qr')
  const ecl: QrLevel = logo !== 'none' && (level === 'L' || level === 'M') ? 'Q' : level
  const layout = useMemo(() => {
    try {
      return qrLayout(encodeQr(value, ecl), { margin, shape, logo: logo !== 'none' })
    } catch {
      return null
    }
  }, [value, ecl, margin, shape, logo])
  if (!layout) {
    return (
      <figure className="ml-qr" style={{ '--_size': `${size}px` } as CSSProperties}>
        <p className="ml-qr__error" role="alert">
          {loc.qrcode.tooLong}
        </p>
      </figure>
    )
  }
  const { total, dataPath, eyes, hole, radius } = layout
  const centre = hole ? hole.start + margin + hole.span / 2 : 0
  return (
    <figure className="ml-qr" style={{ '--_size': `${size}px` } as CSSProperties}>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${total} ${total}`} width={size} height={size} role="img" aria-label={title ?? loc.qrcode.label(value)} shapeRendering="geometricPrecision">
        <rect width={total} height={total} fill={background} rx={1} />
        <path d={dataPath} fill={color} />
        {eyes.map((eye, i) => (
          <g key={i} fill={eyeColor}>
            <path d={qrEyePath(eye, radius.outer)} fillRule="evenodd" />
            <rect x={eye.x + 2} y={eye.y + 2} width={3} height={3} rx={radius.inner} />
          </g>
        ))}
        {hole && (
          <g>
            <rect x={hole.start + margin - 0.5} y={hole.start + margin - 0.5} width={hole.span + 1} height={hole.span + 1} rx={1.2} fill={background} />
            {logo === 'paw' ? (
              <g transform={`translate(${centre} ${centre}) scale(${hole.span / 24})`} fill={eyeColor}>
                <ellipse cx="0" cy="3.4" rx="5.4" ry="4.4" />
                <ellipse cx="-6.6" cy="-2.4" rx="2.1" ry="2.6" transform="rotate(-20 -6.6 -2.4)" />
                <ellipse cx="-2.4" cy="-6" rx="2.1" ry="2.7" transform="rotate(-6 -2.4 -6)" />
                <ellipse cx="2.4" cy="-6" rx="2.1" ry="2.7" transform="rotate(6 2.4 -6)" />
                <ellipse cx="6.6" cy="-2.4" rx="2.1" ry="2.6" transform="rotate(20 6.6 -2.4)" />
              </g>
            ) : (
              <>
                <clipPath id={`${uid}-clip`}>
                  <circle cx={centre} cy={centre} r={hole.span / 2} />
                </clipPath>
                <image href={mascotImages.avatar} x={hole.start + margin} y={hole.start + margin} width={hole.span} height={hole.span} clipPath={`url(#${uid}-clip)`} preserveAspectRatio="xMidYMid slice" />
              </>
            )}
          </g>
        )}
      </svg>
      {children && <figcaption className="ml-qr__caption">{children}</figcaption>}
    </figure>
  )
}

/* ── CodeBlock ─────────────────────────────────────────── */

export interface CodeBlockProps {
  code: string
  lang?: string
  filename?: string
  lineNumbers?: boolean
  highlight?: number[]
  maxHeight?: number | string
  collapsible?: boolean
  collapsed?: boolean
  copyable?: boolean
  plain?: boolean
  toastOnCopy?: boolean
  onCopy?: (code: string) => void
  actions?: ReactNode
}

export function CodeBlock({ code, lang = 'ts', filename, lineNumbers, highlight, maxHeight, collapsible, collapsed, copyable = true, plain, toastOnCopy, onCopy, actions }: CodeBlockProps) {
  const loc = useLocale()
  const [open, setOpen] = useState(!collapsed)
  const [copied, setCopied] = useState(false)
  const reset = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(reset.current), [])
  const source = code.replace(/^\n+|\s+$/g, '')
  const lines = useMemo(
    () => (plain ? source.split('\n').map((l) => l.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')) : highlightLines(source, lang)),
    [source, lang, plain],
  )
  const marked = new Set(highlight ?? [])

  async function copy() {
    try {
      await navigator.clipboard.writeText(source)
    } catch {
      const area = document.createElement('textarea')
      area.value = source
      area.setAttribute('readonly', '')
      area.style.position = 'fixed'
      area.style.opacity = '0'
      document.body.appendChild(area)
      area.select()
      document.execCommand('copy')
      area.remove()
    }
    setCopied(true)
    clearTimeout(reset.current)
    reset.current = setTimeout(() => setCopied(false), 1600)
    onCopy?.(source)
    if (toastOnCopy) toast({ message: loc.code.copiedToast(filename), duration: 1800 })
  }

  return (
    <div className={cx('ml-code', { 'ml-code--numbers': lineNumbers })}>
      {(filename || lang || copyable || collapsible) && (
        <div className="ml-code__bar">
          <span className="ml-code__file">
            {lang && <span className="ml-code__lang">{lang}</span>}
            {filename}
          </span>
          <div className="ml-code__actions">
            {actions}
            {collapsible && (
              <Button variant="ghost" size="sm" aria-expanded={open} onClick={() => setOpen(!open)}>
                {open ? loc.code.collapse : loc.code.expand}
              </Button>
            )}
            {copyable && (
              <Button
                variant="outline"
                size="sm"
                stamp
                onClick={copy}
                prefix={
                  copied ? (
                    <Paw tone="current" />
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path d="M8 8h11v13H8zM5 16H4V3h11v1" />
                    </svg>
                  )
                }
              >
                {copied ? loc.code.copied : loc.code.copy}
              </Button>
            )}
          </div>
        </div>
      )}
      <pre className="ml-code__pre" hidden={!open} style={maxHeight !== undefined ? { maxHeight: typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight } : undefined} tabIndex={0}>
        <code>
          {lines.map((line, i) => (
            <span key={i} className={cx('ml-code__line', { 'ml-code__line--hl': marked.has(i + 1) })}>
              {lineNumbers && (
                <span className="ml-code__num" aria-hidden="true">
                  {i + 1}
                </span>
              )}
              <span className="ml-code__text" dangerouslySetInnerHTML={{ __html: line || ' ' }} />
              {'\n'}
            </span>
          ))}
        </code>
      </pre>
    </div>
  )
}

/* ── Countdown ─────────────────────────────────────────── */

type Unit = 'days' | 'hours' | 'minutes' | 'seconds'
const UNIT_MS: Record<Unit, number> = { days: 86_400_000, hours: 3_600_000, minutes: 60_000, seconds: 1000 }

export interface CountdownProps {
  to?: Date | number
  duration?: number
  units?: Unit[]
  variant?: 'tiles' | 'text'
  paused?: boolean
  labels?: Partial<Record<Unit, string>>
  label?: string
  onFinish?: () => void
}

export function Countdown({ to, duration, units = ['days', 'hours', 'minutes', 'seconds'], variant = 'tiles', paused, labels, label, onFinish }: CountdownProps) {
  const loc = useLocale()
  const deadline = useRef(0)
  const frozen = useRef(0)
  const finished = useRef(false)
  const [now, setNow] = useState(() => Date.now())
  const finishRef = useRef(onFinish)
  finishRef.current = onFinish

  // (Re)start when the target changes.
  const target = to === undefined ? `d${duration}` : `t${typeof to === 'number' ? to : to.getTime()}`
  const started = useRef<string>(undefined)
  if (started.current !== target) {
    started.current = target
    deadline.current = to !== undefined ? (typeof to === 'number' ? to : to.getTime()) : Date.now() + (duration ?? 0)
    frozen.current = Math.max(0, deadline.current - Date.now())
    finished.current = false
  }

  useEffect(() => {
    if (paused) {
      frozen.current = Math.max(0, deadline.current - Date.now())
      return
    }
    deadline.current = Date.now() + frozen.current
    let timer: ReturnType<typeof setTimeout>
    const tick = () => {
      const t = Date.now()
      setNow(t)
      const left = deadline.current - t
      frozen.current = Math.max(0, left)
      if (left <= 0) {
        if (!finished.current) {
          finished.current = true
          finishRef.current?.()
        }
        return
      }
      // Tick on the second boundary so the display never skips or doubles a second.
      timer = setTimeout(tick, ((left - 1) % 1000) + 1)
    }
    tick()
    return () => clearTimeout(timer)
  }, [paused, target])

  const remaining = paused ? frozen.current : Math.max(0, deadline.current - now)
  let rest = Math.ceil(remaining / 1000) * 1000
  const parts = units.map((unit) => {
    const value = Math.floor(rest / UNIT_MS[unit])
    rest -= value * UNIT_MS[unit]
    return { unit, value, text: String(value).padStart(2, '0') }
  })
  const spoken = parts.map((p) => `${p.value} ${labels?.[p.unit] ?? loc.countdown[p.unit]}`).join(' ')

  return (
    <span className={cx('ml-countdown', `ml-countdown--${variant}`, { 'ml-countdown--done': remaining <= 0 })} role="timer" aria-label={`${label ?? loc.countdown.label}：${spoken}`}>
      {parts.map((p, i) => (
        <Fragment key={p.unit}>
          {i > 0 && (
            <span className="ml-countdown__colon" aria-hidden="true">
              :
            </span>
          )}
          <span className="ml-countdown__unit" aria-hidden="true">
            <span className="ml-countdown__value">
              <span key={p.text} className="ml-countdown__digits">
                {p.text}
              </span>
            </span>
            {variant === 'tiles' && <span className="ml-countdown__label">{labels?.[p.unit] ?? loc.countdown[p.unit]}</span>}
          </span>
        </Fragment>
      ))}
    </span>
  )
}

/* ── LineChart ─────────────────────────────────────────── */

export interface LineChartProps {
  series: MlLineSeries[]
  /** X-axis labels, one per data point. */
  labels?: string[]
  /** Plot height in px. */
  height?: number
  /** Fill the area under each line. */
  area?: boolean
  /** Monotone curves instead of straight segments. */
  smooth?: boolean
  /** Number of horizontal grid lines. */
  ticks?: number
  /** Mark every data point with a dot. */
  dots?: boolean
  /** Show the series legend (on by default with more than one series). */
  legend?: boolean
  format?: (value: number) => string
  /** Accessible summary of the chart. */
  label?: string
}

export function LineChart({ series, labels, height = 220, area = true, smooth = true, ticks = 4, dots = false, legend, format, label }: LineChartProps) {
  const fmt = (v: number) => (format ? format(v) : v.toLocaleString())
  const uid = useSvgId('ml-line')
  // The SVG is drawn in real pixels (so strokes and dots never stretch); the width follows the container.
  const plot = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(600)
  const [hover, setHover] = useState<number | null>(null)
  useEffect(() => {
    const el = plot.current
    if (!el) return
    if (el.clientWidth) setWidth(el.clientWidth)
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(80, Math.round(entry.contentRect.width))))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const PAD_Y = 8
  const count = Math.max(1, ...series.map((s) => s.data.length))
  const values = series.flatMap((s) => s.data)
  const vMax = Math.max(0, ...values)
  const vMin = Math.min(0, ...values)
  const step = niceStep(vMax - vMin || 1, ticks)
  const lo = Math.floor(vMin / step) * step
  const hi = Math.max(lo + step * ticks, Math.ceil(vMax / step) * step)
  const tickValues: number[] = []
  for (let v = hi; v >= lo - step / 2; v -= step) tickValues.push(+v.toFixed(10))
  const x = (i: number) => (count > 1 ? (i / (count - 1)) * width : width / 2)
  const y = (v: number) => PAD_Y + (1 - (v - lo) / (hi - lo || 1)) * (height - PAD_Y * 2)
  const baseline = y(Math.max(lo, 0))
  const drawn = series.map((s, i) => {
    const color = s.color ?? (s.tone ? chartStops[s.tone][0] : seriesColors[i % seriesColors.length])
    const pts = s.data.map((v, j) => ({ x: x(j), y: y(v) }))
    const line = smooth ? smoothPath(pts) : pts.map((p, j) => `${j ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
    const fill = pts.length ? `${line} L${pts[pts.length - 1].x.toFixed(1)} ${baseline} L${pts[0].x.toFixed(1)} ${baseline} Z` : ''
    return { name: s.name, color, pts, line, fill, gradient: `${uid}-g${i}` }
  })
  // Thin the x labels so they never crowd (roughly one per 64px).
  const labelEvery = Math.max(1, Math.ceil(((labels?.length ?? 0) * 64) / width))
  const showLegend = legend ?? series.length > 1
  const tipSide = hover !== null && x(hover) > width * 0.6 ? 'left' : 'right'
  const summary = label ?? series.map((s) => `${s.name}：${s.data.map(fmt).join('、')}`).join('；')

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const moves: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1 }
    if (event.key === 'Home') setHover(0)
    else if (event.key === 'End') setHover(count - 1)
    else if (event.key in moves) setHover(Math.min(count - 1, Math.max(0, (hover ?? -1) + moves[event.key])))
    else if (event.key === 'Escape') setHover(null)
    else return
    event.preventDefault()
  }

  return (
    <figure className="ml-line" style={{ '--_h': `${height}px` } as CSSProperties}>
      {showLegend && (
        <div className="ml-line__legend" aria-hidden="true">
          {drawn.map((s) => (
            <span key={s.name} className="ml-line__key">
              <i style={{ background: s.color, color: s.color }} />
              {s.name}
            </span>
          ))}
        </div>
      )}
      <div className="ml-line__body">
        <div className="ml-line__axis" aria-hidden="true">
          {tickValues.map((t) => (
            <span key={t}>{fmt(t)}</span>
          ))}
        </div>
        <div className="ml-line__main">
          <div
            ref={plot}
            className="ml-line__plot"
            role="img"
            tabIndex={0}
            aria-label={summary}
            onPointerMove={(event) => {
              const rect = event.currentTarget.getBoundingClientRect()
              const ratio = (event.clientX - rect.left) / (rect.width || 1)
              setHover(Math.min(count - 1, Math.max(0, Math.round(ratio * (count - 1)))))
            }}
            onPointerLeave={() => setHover(null)}
            onKeyDown={onKeyDown}
            onBlur={() => setHover(null)}
          >
            <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
              <defs>
                {drawn.map((s) => (
                  <linearGradient key={s.gradient} id={s.gradient} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor={s.color} stopOpacity={0.32} />
                    <stop offset="1" stopColor={s.color} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <g className="ml-line__grid">
                {tickValues.map((t) => (
                  <line key={t} x1="0" x2={width} y1={y(t)} y2={y(t)} className={t === 0 ? 'ml-line__zero' : undefined} />
                ))}
              </g>
              {drawn.map((s, i) => (
                <g key={s.name} className="ml-line__series" style={{ '--_i': i } as CSSProperties}>
                  {area && <path d={s.fill} fill={`url(#${s.gradient})`} className="ml-line__area" />}
                  <path d={s.line} pathLength={1} className="ml-line__stroke" stroke={s.color} />
                  {dots && s.pts.map((p, j) => <circle key={j} cx={p.x} cy={p.y} r={3} className="ml-line__dot" fill={s.color} />)}
                </g>
              ))}
              {hover !== null && (
                <g className="ml-line__cursor">
                  <line x1={x(hover)} x2={x(hover)} y1="0" y2={height} />
                  {drawn.map((s) => s.pts[hover] && <circle key={s.name} cx={s.pts[hover].x} cy={s.pts[hover].y} r={4.5} fill={s.color} className="ml-line__focus" />)}
                </g>
              )}
            </svg>
            {hover !== null && (
              <div className={cx('ml-line__tip', `ml-line__tip--${tipSide}`)} style={{ left: `${x(hover)}px` }} aria-live="polite">
                <p className="ml-line__tip-title">{labels?.[hover] ?? `#${hover + 1}`}</p>
                {series.map((s, i) => (
                  <p key={s.name} className="ml-line__tip-row">
                    <i style={{ background: drawn[i].color }} />
                    <span>{s.name}</span>
                    <b>{s.data[hover] !== undefined ? fmt(s.data[hover]) : '—'}</b>
                  </p>
                ))}
              </div>
            )}
          </div>
          {!!labels?.length && (
            <div className="ml-line__x" aria-hidden="true">
              {labels.map((l, i) =>
                i % labelEvery === 0 || i === hover ? (
                  <span key={i} className={i === hover ? 'ml-line__x--on' : undefined} style={{ left: `${x(i)}px` }}>
                    {l}
                  </span>
                ) : null,
              )}
            </div>
          )}
        </div>
      </div>
    </figure>
  )
}

/* ── ScatterChart ──────────────────────────────────────── */

export interface ScatterChartProps {
  series: MlScatterSeries[]
  /** Plot height in px. */
  height?: number
  /** Point marker. */
  shape?: MlScatterShape
  /** Radius (px) of points without a `size`. */
  pointSize?: number
  /** Smallest and largest bubble radius (px) for points with a `size`. */
  sizeRange?: [number, number]
  /** Least-squares trend line for every series (a series' own `trend` wins). */
  trend?: boolean
  /** Number of horizontal / vertical grid steps (approximate; steps stay round). */
  ticks?: number
  xTicks?: number
  /** Show the series legend (on by default with more than one series). Click a key to hide that series. */
  legend?: boolean
  xTitle?: string
  yTitle?: string
  /** Format y values (and x values when `xFormat` is not set). */
  format?: (value: number) => string
  xFormat?: (value: number) => string
  /** Accessible summary of the chart. */
  label?: string
  onToggle?: (name: string, visible: boolean) => void
}

export function ScatterChart({
  series,
  height = 260,
  shape = 'circle',
  pointSize = 5,
  sizeRange = [4, 18],
  trend = false,
  ticks = 4,
  xTicks = 5,
  legend,
  xTitle,
  yTitle,
  format,
  xFormat,
  label,
  onToggle,
}: ScatterChartProps) {
  const loc = useLocale()
  const fmtY = (v: number) => (format ? format(v) : v.toLocaleString())
  const fmtX = (v: number) => (xFormat ? xFormat(v) : format ? format(v) : v.toLocaleString())
  const uid = useSvgId('ml-scatter')
  // Real pixels (markers never stretch); the width follows the container. Updates
  // wait for the next frame so a re-layout can't trigger "ResizeObserver loop" errors.
  const plot = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(600)
  const [hidden, setHidden] = useState<number[]>([])
  const [active, setActive] = useState<{ s: number; j: number } | null>(null)
  useEffect(() => {
    const el = plot.current
    if (!el) return
    if (el.clientWidth) setWidth(el.clientWidth)
    if (typeof ResizeObserver === 'undefined') return
    let frame = 0
    const observer = new ResizeObserver(([entry]) => {
      const next = Math.max(80, Math.round(entry.contentRect.width))
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => setWidth(next))
    })
    observer.observe(el)
    return () => {
      observer.disconnect()
      cancelAnimationFrame(frame)
    }
  }, [])

  const PAD_Y = 8
  // Axes cover every series (hidden ones too), so toggling never rescales the plot.
  const all = series.flatMap((s) => s.points)
  const xScale = niceScale(Math.min(...all.map((p) => p.x)), Math.max(...all.map((p) => p.x)), xTicks)
  const yScale = niceScale(Math.min(...all.map((p) => p.y)), Math.max(...all.map((p) => p.y)), ticks)
  const sizes = all.filter((p) => p.size !== undefined).map((p) => p.size as number)
  const hasSize = sizes.length > 0
  const hasLabel = all.some((p) => p.label !== undefined)
  const x = (v: number) => ((v - xScale.lo) / (xScale.hi - xScale.lo || 1)) * width
  const y = (v: number) => PAD_Y + (1 - (v - yScale.lo) / (yScale.hi - yScale.lo || 1)) * (height - PAD_Y * 2)
  const radius = (size?: number) => (size === undefined ? pointSize : bubbleRadius(size, Math.min(...sizes), Math.max(...sizes), sizeRange))
  const pawTransform = (cx: number, cy: number, r: number) => {
    const k = (r * 2.3) / 24
    return `translate(${(cx - 12 * k).toFixed(1)} ${(cy - 12 * k).toFixed(1)}) scale(${k.toFixed(3)})`
  }

  const drawn = series.map((s, i) => {
    const color = s.color ?? (s.tone ? chartStops[s.tone][0] : seriesColors[i % seriesColors.length])
    const pts = s.points.map((p) => ({ ...p, px: x(p.x), py: y(p.y), r: radius(p.size) }))
    const fit = (s.trend ?? trend) ? linearFit(s.points) : null
    let line: { x1: number; y1: number; x2: number; y2: number } | null = null
    if (fit) {
      const lo = Math.min(...s.points.map((p) => p.x))
      const hi = Math.max(...s.points.map((p) => p.x))
      line = { x1: x(lo), y1: y(fit.slope * lo + fit.intercept), x2: x(hi), y2: y(fit.slope * hi + fit.intercept) }
    }
    return { name: s.name, color, pts, trend: line, on: !hidden.includes(i), gradient: `${uid}-g${i}` }
  })
  const showLegend = legend ?? series.length > 1

  const toggle = (i: number) => {
    const on = hidden.includes(i)
    setHidden(on ? hidden.filter((h) => h !== i) : [...hidden, i])
    if (active?.s === i) setActive(null)
    onToggle?.(series[i].name, on)
  }

  // Inspection: one point at a time. Keyboard order is left → right across every visible series.
  const order = drawn
    .flatMap((s, si) => (s.on ? s.pts.map((p, j) => ({ s: si, j, px: p.px, py: p.py })) : []))
    .sort((a, b) => a.px - b.px || a.py - b.py)

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const list = order
    if (!list.length) return
    const at = active ? list.findIndex((p) => p.s === active.s && p.j === active.j) : -1
    const pick = (k: number) => setActive({ s: list[k].s, j: list[k].j })
    if (event.key === 'ArrowRight') pick(Math.min(list.length - 1, at + 1))
    else if (event.key === 'ArrowLeft') pick(at < 0 ? 0 : Math.max(0, at - 1))
    else if (event.key === 'Home') pick(0)
    else if (event.key === 'End') pick(list.length - 1)
    else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      // Jump to the nearest-in-x point of the next / previous visible series.
      const seriesOn = [...new Set(list.map((p) => p.s))].sort((a, b) => a - b)
      const cur = at < 0 ? list[0] : list[at]
      const idx = seriesOn.indexOf(cur.s)
      const next = seriesOn[(idx + (event.key === 'ArrowDown' ? 1 : -1) + seriesOn.length) % seriesOn.length]
      const candidates = list.map((p, k) => ({ p, k })).filter(({ p }) => p.s === next)
      const best = candidates.reduce((a, b) => (Math.abs(b.p.px - cur.px) < Math.abs(a.p.px - cur.px) ? b : a))
      pick(best.k)
    } else if (event.key === 'Escape') setActive(null)
    else return
    event.preventDefault()
  }

  const fs = active ? drawn[active.s] : undefined
  const fp = active ? fs?.pts[active.j] : undefined
  const focus = fs && fp ? { s: fs, p: fp } : null
  const tipSide = focus && focus.p.px > width * 0.6 ? 'left' : 'right'
  const summary = label ?? loc.scatter.summary(series.length, all.length)

  return (
    <figure className="ml-scatter" style={{ '--_h': `${height}px` } as CSSProperties}>
      {showLegend && (
        <div className="ml-scatter__legend">
          {drawn.map((s, i) => (
            <button
              key={s.name}
              type="button"
              className={cx('ml-scatter__key', !s.on && 'ml-scatter__key--off')}
              aria-pressed={s.on}
              aria-label={loc.scatter.toggle(s.name)}
              onClick={() => toggle(i)}
            >
              <i style={{ background: s.color, color: s.color }} />
              {s.name}
            </button>
          ))}
        </div>
      )}
      {yTitle && (
        <div className="ml-scatter__title ml-scatter__title--y" aria-hidden="true">
          {yTitle}
        </div>
      )}
      <div className="ml-scatter__body">
        <div className="ml-scatter__axis" aria-hidden="true">
          {[...yScale.values].reverse().map((t) => (
            <span key={t}>{fmtY(t)}</span>
          ))}
        </div>
        <div className="ml-scatter__main">
          <div
            ref={plot}
            className="ml-scatter__plot"
            role="img"
            tabIndex={0}
            aria-label={summary}
            onPointerMove={(event) => {
              const rect = event.currentTarget.getBoundingClientRect()
              const hit = nearestIndex(
                order.map((p) => ({ x: p.px, y: p.py })),
                event.clientX - rect.left,
                event.clientY - rect.top,
                40,
              )
              setActive(hit < 0 ? null : { s: order[hit].s, j: order[hit].j })
            }}
            onPointerLeave={() => setActive(null)}
            onKeyDown={onKeyDown}
            onBlur={() => setActive(null)}
          >
            <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
              <defs>
                {drawn.map((s) => (
                  <radialGradient key={s.gradient} id={s.gradient} cx="0.35" cy="0.3" r="0.75">
                    <stop offset="0" stopColor="#fff" stopOpacity={0.85} />
                    <stop offset="0.35" stopColor={s.color} />
                    <stop offset="1" stopColor={s.color} stopOpacity={0.7} />
                  </radialGradient>
                ))}
              </defs>
              <g className="ml-scatter__grid">
                {yScale.values.map((t) => (
                  <line key={`y${t}`} x1="0" x2={width} y1={y(t)} y2={y(t)} className={t === 0 ? 'ml-scatter__zero' : undefined} />
                ))}
                {xScale.values.map((t) => (
                  <line key={`x${t}`} x1={x(t)} x2={x(t)} y1="0" y2={height} className={cx('ml-scatter__vline', t === 0 && 'ml-scatter__zero')} />
                ))}
              </g>
              {drawn.map((s, i) =>
                s.on ? (
                  <g key={s.name} className="ml-scatter__series" style={{ '--_i': i, color: s.color } as CSSProperties}>
                    {s.trend && <line className="ml-scatter__trend" x1={s.trend.x1} y1={s.trend.y1} x2={s.trend.x2} y2={s.trend.y2} stroke={s.color} />}
                    {s.pts.map((p, j) => {
                      const cls = cx('ml-scatter__pt', p.size !== undefined && 'ml-scatter__pt--bubble')
                      const style = { '--_j': j } as CSSProperties
                      if (shape === 'circle') return <circle key={j} className={cls} cx={p.px} cy={p.py} r={p.r} fill={`url(#${s.gradient})`} style={style} />
                      if (shape === 'paw') return <path key={j} className={cls} d={PAW_PATH} transform={pawTransform(p.px, p.py, p.r)} fill={s.color} style={style} />
                      return <path key={j} className={cls} d={diamondPath(p.px, p.py, p.r * 1.25)} fill={`url(#${s.gradient})`} style={style} />
                    })}
                  </g>
                ) : null,
              )}
              {focus && (
                <g className="ml-scatter__cursor">
                  <line x1={focus.p.px} x2={focus.p.px} y1={focus.p.py} y2={height} />
                  <line x1="0" x2={focus.p.px} y1={focus.p.py} y2={focus.p.py} />
                  <circle cx={focus.p.px} cy={focus.p.py} r={focus.p.r + 4} stroke={focus.s.color} className="ml-scatter__focus" />
                </g>
              )}
            </svg>
            {focus && (
              <div className={cx('ml-scatter__tip', `ml-scatter__tip--${tipSide}`)} style={{ left: `${focus.p.px}px`, top: `${focus.p.py}px` }} aria-live="polite">
                <p className="ml-scatter__tip-title">
                  <i style={{ background: focus.s.color }} />
                  {focus.p.label ?? focus.s.name}
                </p>
                {focus.p.label !== undefined && (
                  <p className="ml-scatter__tip-row">
                    <span>{loc.scatter.series}</span>
                    <b>{focus.s.name}</b>
                  </p>
                )}
                <p className="ml-scatter__tip-row">
                  <span>{xTitle ?? loc.scatter.x}</span>
                  <b>{fmtX(focus.p.x)}</b>
                </p>
                <p className="ml-scatter__tip-row">
                  <span>{yTitle ?? loc.scatter.y}</span>
                  <b>{fmtY(focus.p.y)}</b>
                </p>
                {focus.p.size !== undefined && (
                  <p className="ml-scatter__tip-row">
                    <span>{loc.scatter.size}</span>
                    <b>{focus.p.size.toLocaleString()}</b>
                  </p>
                )}
              </div>
            )}
          </div>
          <div className="ml-scatter__x" aria-hidden="true">
            {xScale.values.map((t) => (
              <span key={t} style={{ left: `${x(t)}px` }}>
                {fmtX(t)}
              </span>
            ))}
          </div>
          {xTitle && (
            <div className="ml-scatter__title ml-scatter__title--x" aria-hidden="true">
              {xTitle}
            </div>
          )}
        </div>
      </div>
      <table className="ml-visually-hidden">
        <caption>{loc.scatter.table}</caption>
        <thead>
          <tr>
            <th scope="col">{loc.scatter.series}</th>
            {hasLabel && <th scope="col">{loc.scatter.point}</th>}
            <th scope="col">{xTitle ?? loc.scatter.x}</th>
            <th scope="col">{yTitle ?? loc.scatter.y}</th>
            {hasSize && <th scope="col">{loc.scatter.size}</th>}
          </tr>
        </thead>
        <tbody>
          {series.map((s) =>
            s.points.map((p, j) => (
              <tr key={`${s.name}-${j}`}>
                <th scope="row">{s.name}</th>
                {hasLabel && <td>{p.label ?? ''}</td>}
                <td>{fmtX(p.x)}</td>
                <td>{fmtY(p.y)}</td>
                {hasSize && <td>{p.size?.toLocaleString() ?? ''}</td>}
              </tr>
            )),
          )}
        </tbody>
      </table>
    </figure>
  )
}

/* ── FunnelChart ───────────────────────────────────────── */

export interface FunnelChartProps {
  data: MlFunnelDatum[]
  /** Stages stacked top → bottom (vertical) or left → right (horizontal). */
  orientation?: 'vertical' | 'horizontal'
  /** Tapered trapezoids, or plain bars. */
  shape?: 'trapezoid' | 'rect'
  /** Tone for stages without their own. */
  tone?: MlChartTone
  /** Vertical: height of each stage (px). Horizontal: height of the shapes (px). */
  size?: number
  /** Show each stage's share of the first stage on the shape. */
  share?: boolean
  format?: (value: number) => string
  /** Accessible summary of the chart. */
  label?: string
  onSelect?: (index: number, datum: MlFunnelDatum) => void
}

export function FunnelChart({ data, orientation = 'vertical', shape = 'trapezoid', tone = 'gold', size, share = true, format, label, onSelect }: FunnelChartProps) {
  const loc = useLocale()
  const fmt = (v: number) => (format ? format(v) : v.toLocaleString())
  const [active, setActive] = useState<number | null>(null)
  const items = useRef<(HTMLLIElement | null)[]>([])

  const list = funnelStages(data)
  const stages = list.map((st, i) => {
    const t = st.tone ?? tone
    const a = st.width * 100
    // A trapezoid tapers into the next stage; the last one narrows a little on its own.
    const b = shape === 'rect' ? a : (list[i + 1]?.width ?? st.width * 0.82) * 100
    return { ...st, tone: t, a, b, c0: chartStops[t][0], c1: chartStops[t][1] }
  })
  const overall = stages.length ? stages[stages.length - 1].fromFirst : 0
  const summary = label ?? loc.funnel.summary(data.length, percentText(overall))
  const thickness = size ?? (orientation === 'vertical' ? 52 : 200)

  const move = (i: number) => {
    if (!data.length) return
    const next = Math.min(data.length - 1, Math.max(0, i))
    setActive(next)
    items.current[next]?.focus()
  }

  const onKeyDown = (event: KeyboardEvent<HTMLOListElement>) => {
    const cur = active ?? 0
    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') move(cur + 1)
    else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') move(cur - 1)
    else if (event.key === 'Home') move(0)
    else if (event.key === 'End') move(data.length - 1)
    else if (event.key === 'Escape') setActive(null)
    else if (event.key === 'Enter' || event.key === ' ') {
      if (active !== null) onSelect?.(active, data[active])
    } else return
    event.preventDefault()
  }

  return (
    <figure
      className={cx('ml-funnel', `ml-funnel--${orientation}`, `ml-funnel--${shape}`)}
      style={{ '--_size': `${thickness}px`, '--_n': data.length } as CSSProperties}
    >
      <ol
        className="ml-funnel__list"
        aria-label={summary}
        onKeyDown={onKeyDown}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setActive(null)
        }}
        onPointerLeave={() => setActive(null)}
      >
        {stages.map((s, i) => (
          <li
            key={`${i}-${s.label}`}
            ref={(el) => {
              items.current[i] = el
            }}
            className={cx('ml-funnel__stage', `ml-funnel__stage--${s.tone}`, active === i && 'ml-funnel__stage--on')}
            tabIndex={(active ?? 0) === i ? 0 : -1}
            style={{ '--_i': i, '--_a': s.a, '--_b': s.b, '--_c0': s.c0, '--_c1': s.c1 } as CSSProperties}
            onPointerEnter={() => setActive(i)}
            onFocus={() => setActive(i)}
            onClick={() => onSelect?.(i, data[i])}
          >
            <span className="ml-funnel__label">{s.label}</span>
            <span className="ml-funnel__track" aria-hidden="true">
              <span className="ml-funnel__shape" />
              {share && <span className="ml-funnel__share">{percentText(s.fromFirst)}</span>}
            </span>
            <span className="ml-funnel__value">{fmt(s.value)}</span>
            <span className="ml-funnel__rate">
              <small>{i ? loc.funnel.fromPrev : loc.funnel.start}</small>
              {percentText(s.fromPrev)}
              <span className="ml-visually-hidden">
                {' '}({loc.funnel.fromFirst} {percentText(s.fromFirst)})
              </span>
            </span>
            {active === i && (
              <div className="ml-funnel__tip" aria-hidden="true">
                <p className="ml-funnel__tip-title">{s.label}</p>
                <p className="ml-funnel__tip-row">
                  <span>{loc.funnel.value}</span>
                  <b>{fmt(s.value)}</b>
                </p>
                {i > 0 && (
                  <p className="ml-funnel__tip-row">
                    <span>{loc.funnel.fromPrev}</span>
                    <b>{percentText(s.fromPrev)}</b>
                  </p>
                )}
                <p className="ml-funnel__tip-row">
                  <span>{loc.funnel.fromFirst}</span>
                  <b>{percentText(s.fromFirst)}</b>
                </p>
                {i > 0 && (
                  <p className="ml-funnel__tip-row">
                    <span>{loc.funnel.drop}</span>
                    <b>{fmt(s.drop)}</b>
                  </p>
                )}
              </div>
            )}
          </li>
        ))}
      </ol>
    </figure>
  )
}
