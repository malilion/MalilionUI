import { Fragment, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { chartStops, niceStep, seriesColors } from '../components/charts'
import { addDays, dayKey, startOfDay } from '../components/dates'
import { createPawPath } from '../components/paw'
import { highlightLines } from '../highlight'
import { mascotImages } from '../mascot'
import { encodeQr, qrEyePath, qrLayout, type QrLevel } from '../qrcode'
import type { MlChartDatum, MlChartTone, MlHeatmapDatum } from '../types'
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
  data: MlChartDatum[]
  height?: number
  tone?: MlChartTone
  highlight?: 'max' | number | null
  ticks?: number
  format?: (value: number) => string
  label?: string
}

export function BarChart({ data, height = 200, tone = 'gold', highlight = 'max', ticks = 4, format, label }: BarChartProps) {
  const fmt = (v: number) => (format ? format(v) : v.toLocaleString())
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
