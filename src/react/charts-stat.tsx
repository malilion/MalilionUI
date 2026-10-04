import { useState, type CSSProperties, type KeyboardEvent } from 'react'
import { chartStops } from '../components/charts'
import { boxLayout, bulletRows, waterfallLayout, type BulletRow, type MlBoxDatum, type MlBoxStats, type MlBulletDatum, type MlWaterfallDatum, type WaterfallBar } from '../components/charts-stat'
import type { MlChartTone } from '../types'
import { useLocale } from './locale'
import { cx } from './utils'

/** Left / right / Home / End / Esc over the columns, like the bar chart. */
function useColumnKeys(count: number) {
  const [hover, setHover] = useState<number | null>(null)
  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (!count) return
    const moves: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1 }
    if (e.key === 'Home') setHover(0)
    else if (e.key === 'End') setHover(count - 1)
    else if (e.key in moves) setHover(Math.min(count - 1, Math.max(0, (hover ?? -1) + moves[e.key])))
    else if (e.key === 'Escape') setHover(null)
    else return
    e.preventDefault()
  }
  const tipSide = (i: number) => (i + 0.5 > count * 0.6 ? 'left' : 'right')
  return { hover, setHover, onKeyDown, tipSide }
}

/* ── WaterfallChart ────────────────────────────────────── */

export interface WaterfallChartProps {
  data?: MlWaterfallDatum[]
  /** Plot height in px. */
  height?: number
  /** Which colour rises: red (Taiwan markets) or green. Falls take the other. */
  upColor?: 'red' | 'green'
  /** Change labels on the bars. */
  showValues?: boolean
  ticks?: number
  format?: (value: number) => string
  /** Accessible summary of the chart. */
  label?: string
  className?: string
}

const NO_STEPS: MlWaterfallDatum[] = []

export function WaterfallChart({ data = NO_STEPS, height = 220, upColor = 'red', showValues = true, ticks = 4, format, label, className }: WaterfallChartProps) {
  const loc = useLocale()
  const fmt = (v: number) => (format ? format(v) : v.toLocaleString())
  const layout = waterfallLayout(data, ticks)
  const axis = [...layout.values].reverse()
  const pos = (v: number) => ((v - layout.lo) / (layout.hi - layout.lo || 1)) * 100
  const signed = (b: WaterfallBar) => (b.kind === 'total' ? fmt(b.value) : `${b.value > 0 ? '+' : b.value < 0 ? '−' : ''}${fmt(Math.abs(b.value))}`)
  const kindText = (b: WaterfallBar) => (b.kind === 'total' ? loc.waterfall.total : b.kind === 'up' ? loc.waterfall.increase : loc.waterfall.decrease)
  const { hover, setHover, onKeyDown, tipSide } = useColumnKeys(layout.bars.length)

  return (
    <figure className={cx('ml-waterfall', `ml-waterfall--up-${upColor}`, className, { 'ml-waterfall--values': showValues })} style={{ '--_h': `${height}px` } as CSSProperties}>
      <div className="ml-waterfall__body">
        <div className="ml-waterfall__axis" aria-hidden="true">
          {axis.map((t) => (
            <span key={t}>{fmt(t)}</span>
          ))}
        </div>
        <div
          className="ml-waterfall__plot"
          role="img"
          tabIndex={0}
          aria-label={label ?? loc.waterfall.summary(layout.bars.length)}
          onPointerLeave={() => setHover(null)}
          onKeyDown={onKeyDown}
          onBlur={() => setHover(null)}
        >
          <div className="ml-waterfall__grid">
            {axis.map((t) => (
              <i key={t} className={cx({ 'ml-waterfall__zero': t === 0 })} />
            ))}
          </div>
          {layout.bars.map((b, i) => (
            <div key={i} className={cx('ml-waterfall__col', { 'ml-waterfall__col--on': i === hover })} onPointerEnter={() => setHover(i)}>
              <div className="ml-waterfall__track">
                <div
                  className={cx('ml-waterfall__bar', `ml-waterfall__bar--${b.kind}`)}
                  style={{ bottom: `${pos(Math.min(b.from, b.to))}%`, height: `${Math.abs(pos(b.to) - pos(b.from))}%`, '--_i': i } as CSSProperties}
                >
                  {showValues && <span className={cx('ml-waterfall__value', { 'ml-waterfall__value--below': b.to < b.from || b.to < 0 })}>{signed(b)}</span>}
                </div>
                {i < layout.bars.length - 1 && <i className="ml-waterfall__link" style={{ bottom: `${pos(b.running)}%` }} />}
              </div>
              <span className="ml-waterfall__x">{b.label}</span>
              {i === hover && (
                <div className={cx('ml-waterfall__pop', `ml-waterfall__pop--${tipSide(i)}`)} aria-live="polite">
                  <p className="ml-waterfall__pop-title">{b.label}</p>
                  <p className="ml-waterfall__pop-row">
                    <i className={`ml-waterfall__swatch--${b.kind}`} />
                    <span>{kindText(b)}</span>
                    <b>{signed(b)}</b>
                  </p>
                  {b.kind !== 'total' && (
                    <p className="ml-waterfall__pop-row ml-waterfall__pop-row--total">
                      <span>{loc.waterfall.running}</span>
                      <b>{fmt(b.running)}</b>
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      <table className="ml-visually-hidden">
        <caption>{loc.waterfall.table}</caption>
        <thead>
          <tr>
            <th scope="col">{loc.waterfall.category}</th>
            <th scope="col">{loc.waterfall.change}</th>
            <th scope="col">{loc.waterfall.running}</th>
          </tr>
        </thead>
        <tbody>
          {layout.bars.map((b, i) => (
            <tr key={i}>
              <th scope="row">{b.label}</th>
              <td>{b.kind === 'total' ? loc.waterfall.total : signed(b)}</td>
              <td>{fmt(b.running)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}

/* ── BoxPlot ───────────────────────────────────────────── */

export interface BoxPlotProps {
  data?: MlBoxDatum[]
  /** Plot height in px. */
  height?: number
  /** Colour of boxes without their own tone. */
  tone?: MlChartTone
  /** Whiskers reach this many IQRs past the box; samples beyond are outliers. */
  whisker?: number
  /** Mark the mean with a diamond. */
  showMean?: boolean
  ticks?: number
  format?: (value: number) => string
  /** Accessible summary of the chart. */
  label?: string
  className?: string
}

const NO_BOXES: MlBoxDatum[] = []

export function BoxPlot({ data = NO_BOXES, height = 220, tone = 'gold', whisker = 1.5, showMean = true, ticks = 5, format, label, className }: BoxPlotProps) {
  const loc = useLocale()
  const fmt = (v: number) => (format ? format(v) : Number(v.toFixed(2)).toLocaleString())
  const layout = boxLayout(data, ticks, whisker)
  const axis = [...layout.values].reverse()
  const pos = (v: number) => ((v - layout.lo) / (layout.hi - layout.lo || 1)) * 100
  const rows = (s: MlBoxStats): [string, number][] => [
    [loc.boxplot.max, s.max],
    [loc.boxplot.q3, s.q3],
    [loc.boxplot.median, s.median],
    [loc.boxplot.q1, s.q1],
    [loc.boxplot.min, s.min],
    ...(s.mean !== undefined ? ([[loc.boxplot.mean, s.mean]] as [string, number][]) : []),
  ]
  const { hover, setHover, onKeyDown, tipSide } = useColumnKeys(layout.boxes.length)

  return (
    <figure className={cx('ml-boxplot', className)} style={{ '--_h': `${height}px` } as CSSProperties}>
      <div className="ml-boxplot__body">
        <div className="ml-boxplot__axis" aria-hidden="true">
          {axis.map((t) => (
            <span key={t}>{fmt(t)}</span>
          ))}
        </div>
        <div
          className="ml-boxplot__plot"
          role="img"
          tabIndex={0}
          aria-label={label ?? loc.boxplot.summary(layout.boxes.length)}
          onPointerLeave={() => setHover(null)}
          onKeyDown={onKeyDown}
          onBlur={() => setHover(null)}
        >
          <div className="ml-boxplot__grid">
            {axis.map((t) => (
              <i key={t} />
            ))}
          </div>
          {layout.boxes.map((b, i) => (
            <div
              key={i}
              className={cx('ml-boxplot__col', { 'ml-boxplot__col--on': i === hover })}
              style={{ '--_c': chartStops[b.tone ?? tone][0], '--_i': i } as CSSProperties}
              onPointerEnter={() => setHover(i)}
            >
              <div className="ml-boxplot__track">
                {b.stats && (
                  <>
                    <i className="ml-boxplot__whisker" style={{ bottom: `${pos(b.stats.min)}%`, height: `${pos(b.stats.max) - pos(b.stats.min)}%` }} />
                    <i className="ml-boxplot__cap" style={{ bottom: `${pos(b.stats.max)}%` }} />
                    <i className="ml-boxplot__cap" style={{ bottom: `${pos(b.stats.min)}%` }} />
                    <div className="ml-boxplot__box" style={{ bottom: `${pos(b.stats.q1)}%`, height: `${pos(b.stats.q3) - pos(b.stats.q1)}%` }} />
                    <i className="ml-boxplot__median" style={{ bottom: `${pos(b.stats.median)}%` }} />
                    {showMean && b.stats.mean !== undefined && <i className="ml-boxplot__mean" style={{ bottom: `${pos(b.stats.mean)}%` }} />}
                    {(b.stats.outliers ?? []).map((o, k) => (
                      <i key={k} className="ml-boxplot__outlier" style={{ bottom: `${pos(o)}%` }} />
                    ))}
                  </>
                )}
              </div>
              <span className="ml-boxplot__x">{b.label}</span>
              {i === hover && b.stats && (
                <div className={cx('ml-boxplot__pop', `ml-boxplot__pop--${tipSide(i)}`)} aria-live="polite">
                  <p className="ml-boxplot__pop-title">{b.label}</p>
                  {rows(b.stats).map(([name, v]) => (
                    <p key={name} className="ml-boxplot__pop-row">
                      <span>{name}</span>
                      <b>{fmt(v)}</b>
                    </p>
                  ))}
                  {!!b.stats.outliers?.length && (
                    <p className="ml-boxplot__pop-row ml-boxplot__pop-row--total">
                      <span>{loc.boxplot.outliers}</span>
                      <b>{b.stats.outliers.map(fmt).join(', ')}</b>
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      <table className="ml-visually-hidden">
        <caption>{loc.boxplot.table}</caption>
        <thead>
          <tr>
            <th scope="col">{loc.boxplot.group}</th>
            <th scope="col">{loc.boxplot.min}</th>
            <th scope="col">{loc.boxplot.q1}</th>
            <th scope="col">{loc.boxplot.median}</th>
            <th scope="col">{loc.boxplot.q3}</th>
            <th scope="col">{loc.boxplot.max}</th>
            <th scope="col">{loc.boxplot.outliers}</th>
          </tr>
        </thead>
        <tbody>
          {layout.boxes.map((b, i) => (
            <tr key={i}>
              <th scope="row">{b.label}</th>
              {b.stats ? (
                <>
                  <td>{fmt(b.stats.min)}</td>
                  <td>{fmt(b.stats.q1)}</td>
                  <td>{fmt(b.stats.median)}</td>
                  <td>{fmt(b.stats.q3)}</td>
                  <td>{fmt(b.stats.max)}</td>
                  <td>{b.stats.outliers?.length ? b.stats.outliers.map(fmt).join(', ') : '—'}</td>
                </>
              ) : (
                <td colSpan={6}>—</td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}

/* ── BulletChart ───────────────────────────────────────── */

export interface BulletChartProps {
  data?: MlBulletDatum[]
  /** Colour of measures without their own tone. */
  tone?: MlChartTone
  /** Names of the bands, low to high. Default 差 / 普通 / 良好 / 優秀. */
  bandLabels?: string[]
  /** Numbers under each scale. */
  axis?: boolean
  ticks?: number
  format?: (value: number) => string
  className?: string
}

const NO_BULLETS: MlBulletDatum[] = []

export function BulletChart({ data = NO_BULLETS, tone = 'gold', bandLabels, axis = true, ticks = 4, format, className }: BulletChartProps) {
  const loc = useLocale()
  const fmt = (v: number) => (format ? format(v) : v.toLocaleString())
  const rows = bulletRows(data, ticks)
  const bandName = (r: BulletRow) => (r.band < 0 ? null : ((bandLabels ?? loc.bullet.bands)[r.band] ?? null))
  return (
    <div className={cx('ml-bullet', className)} role="list">
      {rows.map((r, i) => (
        <div key={i} className="ml-bullet__row" role="listitem" style={{ '--_c': chartStops[r.tone ?? tone][0], '--_i': i } as CSSProperties}>
          <div className="ml-bullet__head">
            <span className="ml-bullet__label">{r.label}</span>
            {r.sublabel && <span className="ml-bullet__sub">{r.sublabel}</span>}
          </div>
          <div className="ml-bullet__scale" role="img" aria-label={loc.bullet.describe(r.label, fmt(r.value), r.target === undefined ? null : fmt(r.target), bandName(r))}>
            <div className="ml-bullet__track">
              {r.bands.map((b, k) => (
                <i key={k} className="ml-bullet__band" style={{ left: `${b.from}%`, width: `${b.to - b.from}%`, '--_k': k, '--_n': r.bands.length } as CSSProperties} />
              ))}
              <div className="ml-bullet__bar" style={{ width: `${r.valuePct}%` }} />
              {r.targetPct !== undefined && <i className="ml-bullet__target" style={{ left: `${r.targetPct}%` }} />}
            </div>
            {axis && (
              <div className="ml-bullet__ticks" aria-hidden="true">
                {r.ticks.map((t) => (
                  <span key={t} style={{ left: `${(t / r.max) * 100}%` }}>
                    {fmt(t)}
                  </span>
                ))}
              </div>
            )}
          </div>
          <span className="ml-bullet__value">
            <b>{fmt(r.value)}</b>
            {r.target !== undefined && <small> / {fmt(r.target)}</small>}
          </span>
        </div>
      ))}
    </div>
  )
}
