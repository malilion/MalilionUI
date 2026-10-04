import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react'
import { chartStops, tonePalette } from '../components/charts'
import {
  axisWidth,
  candleChange,
  candleTime,
  candleTimeLabel,
  candleTimeText,
  clampRange,
  formatPrice,
  initialRange,
  isIntraday,
  movingAverage,
  panRange,
  priceDecimals,
  priceScale,
  stepDecimals,
  timeTicks,
  volumeScale,
  zoomRange,
  type CandleRange,
  type MlCandle,
  type MlCandleUpColor,
} from '../components/candlestick'
import { Icon } from './basic'
import { useChartWidth } from './chart-width'
import { useLocale } from './locale'
import { cx } from './utils'

export { movingAverage, candleChange, candleTime, zoomRange, panRange, clampRange } from '../components/candlestick'
export type { MlCandle, MlCandleUpColor, CandleRange } from '../components/candlestick'

export interface CandlestickProps {
  data: MlCandle[]
  /** Height of the price pane in px; the width follows the container. Default 280. */
  height?: number
  /** Volume bars under the prices (when the data has volume). Default true. */
  volume?: boolean
  /** Default 72. */
  volumeHeight?: number
  /** Moving-average periods to draw, e.g. [5, 20]. */
  ma?: number[]
  /** Colour of rising candles: 'red' (Taiwan, default) or 'green' (US / Europe). */
  upColor?: MlCandleUpColor
  /** How many candles show at first (the latest ones). Default 60. */
  visible?: number
  /** Price format (default: the data's own decimals). */
  format?: (value: number) => string
  volumeFormat?: (value: number) => string
  /** Time label for the axis, legend and table. */
  timeFormat?: (time: number) => string
  /** Accessible summary of the chart. */
  label?: string
  className?: string
}

const MIN = 8
const PAD = 10
const GAP = 10
const TIME_H = 22
const NO_MA: number[] = []

export function Candlestick({
  data,
  height = 280,
  volume = true,
  volumeHeight = 72,
  ma = NO_MA,
  upColor = 'red',
  visible = 60,
  format,
  volumeFormat,
  timeFormat,
  label,
  className,
}: CandlestickProps) {
  const loc = useLocale()
  const [plot, width] = useChartWidth<HTMLDivElement>()

  const times = data.map((c) => candleTime(c.time))
  const intraday = isIntraday(times.slice(0, 50))
  const decimals = priceDecimals(data)
  const fmt = (v: number) => (format ? format(v) : formatPrice(v, decimals))
  const fmtVol = (v: number) => (volumeFormat ? volumeFormat(v) : v.toLocaleString())
  const timeText = (i: number) => (timeFormat ? timeFormat(times[i]) : candleTimeText(times[i], intraday))
  const timeLabel = (i: number) => (timeFormat ? timeFormat(times[i]) : candleTimeLabel(times[i], intraday, times[i - 1]))

  /* ── Visible window ── */
  const [range, setRangeState] = useState<CandleRange>(() => initialRange(data.length, visible, MIN))
  const rangeRef = useRef(range)
  rangeRef.current = range
  const setRange = (r: CandleRange) => {
    rangeRef.current = r
    setRangeState(r)
  }
  const prevLength = useRef(data.length)
  useEffect(() => {
    const old = prevLength.current
    prevLength.current = data.length
    if (old === data.length) return
    const r = rangeRef.current
    setRange(r.start + r.count >= old ? initialRange(data.length, r.count || visible, MIN) : clampRange(r, data.length, MIN))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.length])
  const firstVisible = useRef(true)
  useEffect(() => {
    if (firstVisible.current) {
      firstVisible.current = false
      return
    }
    setRange(initialRange(data.length, visible, MIN))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible])

  const shown = data.slice(range.start, range.start + range.count)
  const closes = data.map((c) => c.close)
  const averages = ma.map((n, k) => ({ n, values: movingAverage(closes, n), color: chartStops[tonePalette[k % 4]][0] }))
  const scale = priceScale(
    shown,
    averages.flatMap((a) => a.values.slice(range.start, range.start + range.count)),
    5,
  )
  const fmtTick = (v: number) => (format ? format(v) : formatPrice(v, stepDecimals(scale.step)))
  const axisW = axisWidth(scale.values.map(fmtTick))
  const plotW = Math.max(40, width - axisW)
  const step = plotW / Math.max(1, range.count)
  const bodyW = Math.max(1, Math.min(18, step * 0.64))
  const xi = (i: number) => (i - range.start + 0.5) * step
  const hasVolume = volume && data.some((c) => c.volume !== undefined)
  const vmax = volumeScale(shown)
  const volTop = height + GAP
  const totalH = height + (hasVolume ? GAP + volumeHeight : 0) + TIME_H
  const axisBottom = totalH - TIME_H
  const y = (v: number) => PAD + (1 - (v - scale.lo) / (scale.hi - scale.lo || 1)) * (height - PAD * 2)
  const vy = (v: number) => volTop + volumeHeight - (v / vmax) * volumeHeight
  const priceAt = (py: number) => scale.lo + (1 - (py - PAD) / (height - PAD * 2)) * (scale.hi - scale.lo)

  const dir = (c: MlCandle) => (c.close > c.open ? 'up' : c.close < c.open ? 'down' : 'flat')
  const candles = shown.map((c, k) => {
    const i = range.start + k
    const top = y(Math.max(c.open, c.close))
    return { i, k, dir: dir(c), x: xi(i), high: y(c.high), low: y(c.low), top, h: Math.max(1, y(Math.min(c.open, c.close)) - top), vol: c.volume !== undefined ? vy(c.volume) : null }
  })
  const lines = averages.map((a) => {
    let d = ''
    for (let i = range.start; i < range.start + range.count; i++) {
      const v = a.values[i]
      if (v === null) continue
      d += `${d ? 'L' : 'M'}${xi(i).toFixed(1)} ${y(v).toFixed(1)}`
    }
    return { ...a, d }
  })
  const ticks = timeTicks(range, step)

  /* ── Crosshair ── */
  const [cursor, setCursor] = useState<{ i: number; y: number | null } | null>(null)
  const focusIndex = cursor?.i ?? range.start + range.count - 1
  const lc = data[focusIndex]
  let legend = null
  if (lc) {
    const ch = candleChange(data, focusIndex)
    legend = {
      c: lc,
      time: timeText(focusIndex),
      dir: ch.change > 0 ? 'up' : ch.change < 0 ? 'down' : 'flat',
      change: `${ch.change > 0 ? '+' : ''}${fmt(ch.change)} (${ch.percent > 0 ? '+' : ''}${ch.percent.toFixed(2)}%)`,
      ma: averages.map((a) => ({ n: a.n, color: a.color, v: a.values[focusIndex] })),
    }
  }

  // Everything the window / wheel listeners read, kept fresh each render.
  const live = useRef({ step, plotW, n: data.length })
  live.current = { step, plotW, n: data.length }

  const [dragging, setDragging] = useState(false)
  const drag = useRef<{ stop: () => void } | null>(null)

  function localPoint(event: { clientX: number; clientY: number }) {
    const rect = plot.current?.getBoundingClientRect()
    return rect ? { x: event.clientX - rect.left, y: event.clientY - rect.top } : { x: 0, y: 0 }
  }

  function onPointerMove(event: ReactPointerEvent) {
    if (drag.current) return
    const p = localPoint(event)
    if (p.x < 0 || p.x > plotW || !data.length) {
      setCursor(null)
      return
    }
    const i = Math.min(range.start + range.count - 1, range.start + Math.floor(p.x / step))
    setCursor({ i, y: p.y >= 0 && p.y <= height ? p.y : null })
  }

  function onPointerDown(event: ReactPointerEvent) {
    if (event.button !== 0 || (event.target as Element).closest('button')) return
    const pointerId = event.pointerId
    const x0 = event.clientX
    const base = { ...rangeRef.current }
    let moved = false
    const move = (e: PointerEvent) => {
      if (e.pointerId !== pointerId) return
      const dx = e.clientX - x0
      if (!moved && Math.abs(dx) < 4) return
      moved = true
      setDragging(true)
      setCursor(null)
      setRange(panRange(base, -Math.round(dx / live.current.step), live.current.n, MIN))
    }
    const up = (e: PointerEvent) => {
      if (e.pointerId !== pointerId) return
      stop()
      setDragging(false)
    }
    const stop = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
      drag.current = null
    }
    drag.current?.stop()
    drag.current = { stop }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
  }

  // React's onWheel is passive, so the wheel listener is added by hand to be able to preventDefault.
  useEffect(() => {
    const el = plot.current
    if (!el) return
    const onWheel = (event: WheelEvent) => {
      const { n, step: s, plotW: pw } = live.current
      if (!n) return
      const r = rangeRef.current
      let next: CandleRange
      if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) next = panRange(r, Math.round(event.deltaX / s) || Math.sign(event.deltaX), n, MIN)
      else {
        const rect = el.getBoundingClientRect()
        const anchor = Math.min(1, Math.max(0, (event.clientX - rect.left) / pw))
        next = zoomRange(r, event.deltaY > 0 ? 1.15 : 1 / 1.15, n, anchor, MIN)
      }
      // Let the page scroll once the chart can't zoom any further.
      if (next.start === r.start && next.count === r.count) return
      event.preventDefault()
      setRange(next)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      el.removeEventListener('wheel', onWheel)
      drag.current?.stop()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function zoom(factor: number) {
    const anchor = cursor ? (cursor.i - range.start + 0.5) / range.count : 1
    setRange(zoomRange(range, factor, data.length, anchor, MIN))
  }
  const reset = () => setRange(initialRange(data.length, visible, MIN))

  const [announce, setAnnounce] = useState('')
  function moveTo(i: number) {
    const n = data.length
    if (!n) return
    const at = Math.min(n - 1, Math.max(0, i))
    if (at < range.start) setRange(clampRange({ start: at, count: range.count }, n, MIN))
    else if (at >= range.start + range.count) setRange(clampRange({ start: at - range.count + 1, count: range.count }, n, MIN))
    setCursor({ i: at, y: null })
    const c = data[at]
    const ch = candleChange(data, at)
    setAnnounce(
      `${timeText(at)}：${loc.candle.open} ${fmt(c.open)}，${loc.candle.high} ${fmt(c.high)}，${loc.candle.low} ${fmt(c.low)}，${loc.candle.close} ${fmt(c.close)}，${loc.candle.change} ${ch.percent.toFixed(2)}%`,
    )
  }

  function onKeyDown(event: KeyboardEvent) {
    const cur = cursor?.i
    const big = event.shiftKey ? 10 : 1
    if (event.key === 'ArrowLeft') moveTo((cur ?? focusIndex + 1) - big)
    else if (event.key === 'ArrowRight') moveTo(cur === undefined ? focusIndex : cur + big)
    else if (event.key === 'Home') moveTo(0)
    else if (event.key === 'End') moveTo(data.length - 1)
    else if (event.key === '+' || event.key === '=') zoom(0.75)
    else if (event.key === '-' || event.key === '_') zoom(1 / 0.75)
    else if (event.key === 'Escape') setCursor(null)
    else return
    event.preventDefault()
  }

  // Entrance motion only on first paint, not on every pan / zoom.
  const [intro, setIntro] = useState(true)
  useEffect(() => {
    const t = setTimeout(() => setIntro(false), 1400)
    return () => clearTimeout(t)
  }, [])

  const crossY = cursor ? (cursor.y ?? y(data[cursor.i].close)) : null
  const canZoomIn = range.count > Math.min(MIN, data.length)
  const canZoomOut = range.count < data.length
  const span = data.length ? loc.candle.range(timeText(range.start), timeText(range.start + range.count - 1)) : ''
  const summary = `${label ?? loc.candle.summary(data.length)}. ${span}. ${loc.candle.hint}`
  const hasVolumeData = data.some((c) => c.volume !== undefined)

  return (
    <figure
      className={cx('ml-candle', `ml-candle--up-${upColor}`, { 'ml-candle--intro': intro, 'ml-candle--dragging': dragging }, className)}
      style={{ '--_cd-h': `${totalH}px` } as CSSProperties}
    >
      <div className="ml-candle__bar">
        {legend && (
          <div className="ml-candle__legend" aria-hidden="true">
            <span className="ml-candle__time">{legend.time}</span>
            <span>
              <small>{loc.candle.open}</small>
              <b>{fmt(legend.c.open)}</b>
            </span>
            <span>
              <small>{loc.candle.high}</small>
              <b>{fmt(legend.c.high)}</b>
            </span>
            <span>
              <small>{loc.candle.low}</small>
              <b>{fmt(legend.c.low)}</b>
            </span>
            <span>
              <small>{loc.candle.close}</small>
              <b>{fmt(legend.c.close)}</b>
            </span>
            <span className={`ml-candle__change ml-candle__change--${legend.dir}`}>{legend.change}</span>
            {legend.c.volume !== undefined && (
              <span>
                <small>{loc.candle.volume}</small>
                <b>{fmtVol(legend.c.volume)}</b>
              </span>
            )}
            {legend.ma.map((m) => (
              <span key={m.n} className="ml-candle__ma-key">
                <i style={{ background: m.color }} />
                {loc.candle.ma(m.n)}
                <b>{m.v === null ? '—' : fmt(m.v)}</b>
              </span>
            ))}
          </div>
        )}
        <div className="ml-candle__tools">
          <button type="button" className="ml-candle__tool" aria-label={loc.candle.zoomIn} disabled={!canZoomIn} onClick={() => zoom(0.75)}>
            <Icon name="plus" />
          </button>
          <button type="button" className="ml-candle__tool" aria-label={loc.candle.zoomOut} disabled={!canZoomOut} onClick={() => zoom(1 / 0.75)}>
            <Icon name="minus" />
          </button>
          <button type="button" className="ml-candle__tool" aria-label={loc.candle.reset} onClick={reset}>
            <Icon name="rotate" />
          </button>
        </div>
      </div>
      <div
        ref={plot}
        className="ml-candle__plot"
        role="img"
        tabIndex={0}
        aria-label={summary}
        onPointerMove={onPointerMove}
        onPointerLeave={() => setCursor(null)}
        onPointerDown={onPointerDown}
        onKeyDown={onKeyDown}
        onBlur={() => setCursor(null)}
      >
        <svg width={width} height={totalH} viewBox={`0 0 ${width} ${totalH}`} aria-hidden="true">
          <g className="ml-candle__grid">
            {scale.values.map((t) => (
              <line key={t} x1="0" x2={plotW} y1={y(t)} y2={y(t)} />
            ))}
            {hasVolume && <line className="ml-candle__divider" x1="0" x2={plotW} y1={volTop - GAP / 2} y2={volTop - GAP / 2} />}
            <line className="ml-candle__divider" x1={plotW} x2={plotW} y1="0" y2={axisBottom} />
          </g>
          <g className="ml-candle__axis">
            {scale.values.map((t) => (
              <text key={t} x={plotW + 8} y={y(t)}>
                {fmtTick(t)}
              </text>
            ))}
            {ticks.map((i) => (
              <text key={`t${i}`} className="ml-candle__tick" x={xi(i)} y={axisBottom + 15}>
                {timeLabel(i)}
              </text>
            ))}
          </g>
          {hasVolume && (
            <g className="ml-candle__volumes">
              {candles.map((c) =>
                c.vol !== null ? (
                  <rect
                    key={c.i}
                    className={`ml-candle__vol ml-candle__vol--${c.dir}`}
                    x={c.x - bodyW / 2}
                    y={c.vol}
                    width={bodyW}
                    height={Math.max(0, volTop + volumeHeight - c.vol)}
                    style={{ '--_cd-k': c.k } as CSSProperties}
                  />
                ) : null,
              )}
            </g>
          )}
          <g className="ml-candle__candles">
            {candles.map((c) => (
              <g key={c.i} className={`ml-candle__k ml-candle__k--${c.dir}`} style={{ '--_cd-k': c.k } as CSSProperties}>
                <line x1={c.x} x2={c.x} y1={c.high} y2={c.low} />
                <rect x={c.x - bodyW / 2} y={c.top} width={bodyW} height={c.h} />
              </g>
            ))}
          </g>
          {lines.map((m) => (
            <path key={m.n} className="ml-candle__ma" d={m.d} stroke={m.color} />
          ))}
          {cursor && crossY !== null && (
            <g className="ml-candle__cross">
              <line x1={xi(cursor.i)} x2={xi(cursor.i)} y1="0" y2={axisBottom} />
              <line x1="0" x2={plotW} y1={crossY} y2={crossY} />
              <rect className="ml-candle__tag" x={plotW + 1} y={crossY - 9} width={axisW - 2} height="18" />
              <text className="ml-candle__tag-text" x={plotW + 8} y={crossY}>
                {fmt(cursor.y === null ? data[cursor.i].close : priceAt(cursor.y))}
              </text>
              <rect className="ml-candle__tag" x={Math.min(plotW - 84, Math.max(0, xi(cursor.i) - 42))} y={axisBottom + 3} width="84" height="18" />
              <text className="ml-candle__tag-text ml-candle__tag-text--time" x={Math.min(plotW - 42, Math.max(42, xi(cursor.i)))} y={axisBottom + 12}>
                {timeText(cursor.i)}
              </text>
            </g>
          )}
        </svg>
      </div>
      <p className="ml-visually-hidden" aria-live="polite">
        {announce}
      </p>
      <div className="ml-visually-hidden">
      <table>
        <caption>{loc.candle.table}</caption>
        <thead>
          <tr>
            <th scope="col">{loc.candle.time}</th>
            <th scope="col">{loc.candle.open}</th>
            <th scope="col">{loc.candle.high}</th>
            <th scope="col">{loc.candle.low}</th>
            <th scope="col">{loc.candle.close}</th>
            {hasVolumeData && <th scope="col">{loc.candle.volume}</th>}
            <th scope="col">{loc.candle.change}</th>
          </tr>
        </thead>
        <tbody>
          {data.map((c, i) => (
            <tr key={i}>
              <th scope="row">{timeText(i)}</th>
              <td>{fmt(c.open)}</td>
              <td>{fmt(c.high)}</td>
              <td>{fmt(c.low)}</td>
              <td>{fmt(c.close)}</td>
              {hasVolumeData && <td>{c.volume === undefined ? '' : fmtVol(c.volume)}</td>}
              <td>{`${candleChange(data, i).percent.toFixed(2)}%`}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </figure>
  )
}
