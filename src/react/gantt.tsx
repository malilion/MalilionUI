import { Fragment, useEffect, useRef, useState, type CSSProperties, type FocusEvent, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react'
import { chartStops } from '../components/charts'
import {
  GANTT_DAY_WIDTH,
  ganttArrow,
  ganttDate,
  ganttDay,
  ganttFormat,
  ganttLink,
  ganttMove,
  ganttRange,
  ganttResize,
  ganttRows,
  ganttSpans,
  ganttTicks,
  ganttWeekends,
  type GanttTick,
  type MlGanttDate,
  type MlGanttScale,
  type MlGanttTask,
} from '../components/gantt'
import type { MlChartTone } from '../types'
import { useLocale } from './locale'
import { cx } from './utils'

export { ganttDay, ganttDate, ganttFormat, ganttISO, ganttSpans, ganttRange, ganttTicks } from '../components/gantt'
export type { MlGanttTask, MlGanttDate, MlGanttScale, GanttSpan, GanttTick } from '../components/gantt'

export interface GanttProps {
  tasks: MlGanttTask[]
  /** Default 'day'. */
  scale?: MlGanttScale
  /** Pixels per day (default: 32 for day, 14 for week, 4 for month). */
  dayWidth?: number
  /** Default 36. */
  rowHeight?: number
  /** Width of the task-name column (px). Default 168. */
  sideWidth?: number
  /** Tone for tasks without their own. Default 'gold'. */
  tone?: MlChartTone
  /** Where the today line goes; `false` hides it. Default: the user's today (set after mount). */
  today?: MlGanttDate | false
  /** Drag bars to move them, drag the right edge to resize; arrow keys too. Calls `onChange`. */
  editable?: boolean
  onChange?: (task: MlGanttTask, range: { start: Date; end: Date }) => void
  /** Accessible summary of the chart. */
  label?: string
  className?: string
}

export function Gantt({
  tasks,
  scale = 'day',
  dayWidth,
  rowHeight = 36,
  sideWidth = 168,
  tone = 'gold',
  today,
  editable = false,
  onChange,
  label,
  className,
}: GanttProps) {
  const loc = useLocale()
  const dayW = dayWidth ?? GANTT_DAY_WIDTH[scale]
  const spans = ganttSpans(tasks)
  const range = ganttRange(spans, scale)
  const ticks = ganttTicks(range.from, range.to, scale)
  const weekends = scale === 'day' ? ganttWeekends(range.from, range.to) : []
  const [collapsed, setCollapsed] = useState<string[]>([])
  const rows = ganttRows(spans, collapsed)
  const canvasWidth = (range.to - range.from) * dayW
  const bodyHeight = rows.length * rowHeight
  const x = (day: number) => (day - range.from) * dayW

  // Today is only known in the browser, so it appears after mount (no hydration mismatch).
  const [clientToday, setClientToday] = useState<number | null>(null)
  useEffect(() => setClientToday(ganttDay(new Date())), [])
  const todayDay = today === false ? null : today !== undefined ? ganttDay(today) : clientToday
  const todayX = todayDay !== null && Number.isFinite(todayDay) && todayDay >= range.from && todayDay < range.to ? x(todayDay) + dayW / 2 : null

  const topLabel = (t: GanttTick) => {
    if (scale === 'month') return loc.gantt.year(t.year)
    return t.days * dayW >= 84 ? loc.gantt.monthTitle(t.year, t.month) : loc.gantt.months[t.month]
  }
  const bottomLabel = (t: GanttTick) => {
    if (scale === 'month') return loc.gantt.months[t.month]
    if (scale === 'week') return `${t.month + 1}/${t.date}`
    return String(t.date)
  }

  /* ── Drag & keyboard edits (a draft until the parent applies onChange) ── */
  const [draft, setDraft] = useState<{ id: string; start: number; end: number } | null>(null)
  const [dragging, setDragging] = useState(false)
  const [hovered, setHovered] = useState<string | null>(null)
  const [focused, setFocused] = useState<string | null>(null)
  const [live, setLive] = useState('')
  const items = useRef(new Map<string, HTMLDivElement>())

  const bars = rows.flatMap((row, r) => {
    if (row.kind !== 'task') return []
    const s = draft?.id === row.span.task.id ? { ...row.span, start: draft.start, end: draft.end } : row.span
    const t = s.task
    const progress = Math.min(1, Math.max(0, t.progress ?? 0))
    return [
      {
        id: t.id,
        task: t,
        r,
        start: s.start,
        end: s.end,
        milestone: !!t.milestone,
        tone: t.tone ?? tone,
        progress,
        left: x(s.start),
        width: (s.end - s.start + 1) * dayW,
        mid: r * rowHeight + rowHeight / 2,
        text: `${t.label}：${t.milestone ? `${loc.gantt.milestone} ${ganttFormat(s.start)}` : `${ganttFormat(s.start)} – ${ganttFormat(s.end)}，${loc.gantt.days(s.end - s.start + 1)}，${loc.gantt.progress} ${Math.round(progress * 100)}%`}`,
      },
    ]
  })
  const byId = new Map(bars.map((b) => [b.id, b]))
  const deps = bars.flatMap((b) =>
    (b.task.deps ?? []).flatMap((id) => {
      const from = byId.get(id)
      if (!from) return []
      const x1 = from.milestone ? from.left + dayW / 2 + 7 : from.left + from.width
      const x2 = b.milestone ? b.left + dayW / 2 - 8 : b.left
      return [{ key: `${id}>${b.id}`, d: ganttLink(x1, from.mid, x2, b.mid, rowHeight), arrow: ganttArrow(x2, b.mid) }]
    }),
  )

  // Fresh values for the window listeners of a drag.
  const latest = useRef({ spans, dayW, onChange })
  latest.current = { spans, dayW, onChange }

  function commit(id: string, next: { start: number; end: number }, announce = false) {
    const s = latest.current.spans.find((x) => x.task.id === id)
    if (!s || (s.start === next.start && s.end === next.end)) return
    latest.current.onChange?.(s.task, { start: ganttDate(next.start), end: ganttDate(next.end) })
    if (announce) setLive(loc.gantt.moved(s.task.label, ganttFormat(next.start), ganttFormat(next.end)))
  }

  const drag = useRef<{ stop: () => void } | null>(null)
  useEffect(() => () => drag.current?.stop(), [])

  function onPointerDown(event: ReactPointerEvent, id: string) {
    if (!editable || event.button !== 0) return
    const s = spans.find((x) => x.task.id === id)
    if (!s) return
    const mode = (event.target as Element).closest('.ml-gantt__handle') ? 'resize' : 'move'
    const pointerId = event.pointerId
    const x0 = event.clientX
    const base = { start: s.start, end: s.end }
    let current: { start: number; end: number } | null = null
    event.preventDefault()
    const move = (e: PointerEvent) => {
      if (e.pointerId !== pointerId) return
      const delta = Math.round((e.clientX - x0) / latest.current.dayW)
      if (delta !== 0) setDragging(true)
      current = mode === 'move' ? ganttMove(base, delta) : ganttResize(base, delta)
      setDraft({ id, ...current })
    }
    const up = (e: PointerEvent) => {
      if (e.pointerId !== pointerId) return
      stop()
      setDraft(null)
      setDragging(false)
      if (current && e.type !== 'pointercancel') commit(id, current)
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

  const current = focused && byId.has(focused) ? focused : bars[0]?.id

  function focusBar(id: string | undefined) {
    if (!id) return
    setFocused(id)
    items.current.get(id)?.focus()
  }

  function onKeyDown(event: KeyboardEvent) {
    const k = bars.findIndex((b) => b.id === current)
    if (k < 0) return
    const b = bars[k]
    if (event.key === 'ArrowDown') focusBar(bars[Math.min(bars.length - 1, k + 1)].id)
    else if (event.key === 'ArrowUp') focusBar(bars[Math.max(0, k - 1)].id)
    else if (event.key === 'Home') focusBar(bars[0].id)
    else if (event.key === 'End') focusBar(bars[bars.length - 1].id)
    else if (editable && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
      const delta = event.key === 'ArrowRight' ? 1 : -1
      commit(b.id, event.shiftKey && !b.milestone ? ganttResize(b, delta) : ganttMove(b, delta), true)
    } else return
    event.preventDefault()
  }

  function onBlur(event: FocusEvent<HTMLDivElement>) {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(null)
  }

  const tipBar = dragging ? undefined : bars.find((b) => b.id === (hovered ?? focused))
  const tip = tipBar ? { b: tipBar, below: tipBar.r < 2, left: tipBar.milestone ? tipBar.left + dayW / 2 : tipBar.left + Math.min(tipBar.width, 240) / 2 } : null

  const toggle = (group: string) => setCollapsed((c) => (c.includes(group) ? c.filter((g) => g !== group) : [...c, group]))
  const summary = `${label ?? loc.gantt.summary(spans.length)}. ${loc.gantt.hint}${editable ? `，${loc.gantt.editHint}` : ''}`

  return (
    <figure
      className={cx('ml-gantt', `ml-gantt--${scale}`, { 'ml-gantt--editable': editable, 'ml-gantt--dragging': dragging }, className)}
      style={{ '--_gt-row': `${rowHeight}px`, '--_gt-day': `${dayW}px`, '--_gt-side': `${sideWidth}px` } as CSSProperties}
    >
      <div className="ml-gantt__frame">
        <div className="ml-gantt__side">
          <div className="ml-gantt__corner" aria-hidden="true">
            {loc.gantt.task}
          </div>
          {rows.map((row) =>
            row.kind === 'group' ? (
              <button
                key={row.key}
                type="button"
                className={cx('ml-gantt__group', { 'ml-gantt__group--closed': row.collapsed })}
                aria-expanded={!row.collapsed}
                aria-label={row.collapsed ? loc.gantt.expand(row.label) : loc.gantt.collapse(row.label)}
                onClick={() => toggle(row.label)}
              >
                <span className="ml-gantt__chevron" aria-hidden="true" />
                {row.label}
                <small>{row.count}</small>
              </button>
            ) : (
              <div key={row.key} className={cx('ml-gantt__name', { 'ml-gantt__name--nested': row.group })}>
                <i
                  className={cx('ml-gantt__dot', { 'ml-gantt__dot--milestone': row.span.task.milestone })}
                  style={{ '--_gt-c0': chartStops[row.span.task.tone ?? tone][0] } as CSSProperties}
                />
                {row.span.task.label}
              </div>
            ),
          )}
        </div>
        <div className="ml-gantt__scroll">
          <div className="ml-gantt__canvas" style={{ width: `${canvasWidth}px` }}>
            <div className="ml-gantt__header" aria-hidden="true">
              <div className="ml-gantt__scale">
                {ticks.top.map((t) => (
                  <span key={t.day} className="ml-gantt__cell" style={{ left: `${x(t.day)}px`, width: `${t.days * dayW}px` }}>
                    {topLabel(t)}
                  </span>
                ))}
              </div>
              <div className="ml-gantt__scale ml-gantt__scale--fine">
                {ticks.bottom.map((t) => (
                  <span
                    key={t.day}
                    className={cx('ml-gantt__cell', {
                      'ml-gantt__cell--weekend': scale === 'day' && (t.weekday === 0 || t.weekday === 6),
                      'ml-gantt__cell--today': scale === 'day' && t.day === todayDay,
                    })}
                    style={{ left: `${x(t.day)}px`, width: `${t.days * dayW}px` }}
                  >
                    {bottomLabel(t)}
                    {scale === 'day' && <small>{loc.gantt.weekdays[t.weekday]}</small>}
                  </span>
                ))}
              </div>
            </div>
            <div
              className="ml-gantt__body"
              style={{ height: `${bodyHeight}px` }}
              role="group"
              aria-label={summary}
              onKeyDown={onKeyDown}
              onBlur={onBlur}
              onPointerLeave={() => setHovered(null)}
            >
              {weekends.map((d) => (
                <span key={`w${d}`} className="ml-gantt__weekend" style={{ left: `${x(d)}px` }} />
              ))}
              {ticks.bottom.map((t) => (
                <span key={`l${t.day}`} className="ml-gantt__line" style={{ left: `${x(t.day)}px` }} />
              ))}
              <svg className="ml-gantt__deps" width={canvasWidth} height={bodyHeight} aria-hidden="true">
                {deps.map((d) => (
                  <g key={d.key} className="ml-gantt__dep">
                    <path d={d.d} className="ml-gantt__dep-line" />
                    <path d={d.arrow} className="ml-gantt__dep-arrow" />
                  </g>
                ))}
              </svg>
              {rows.map((row, r) =>
                row.kind === 'group' ? (
                  <span
                    key={row.key}
                    className="ml-gantt__summary"
                    style={{ left: `${x(row.start)}px`, width: `${(row.end - row.start + 1) * dayW}px`, top: `${r * rowHeight}px` }}
                  />
                ) : (
                  <Fragment key={row.key} />
                ),
              )}
              {bars.map((b, i) => (
                <div
                  key={b.id}
                  ref={(el) => {
                    if (el) items.current.set(b.id, el)
                    else items.current.delete(b.id)
                  }}
                  data-id={b.id}
                  className={cx(b.milestone ? 'ml-gantt__milestone' : 'ml-gantt__bar', {
                    'ml-gantt__bar--done': b.progress >= 1,
                    'ml-gantt__bar--draft': draft?.id === b.id,
                  })}
                  style={
                    {
                      left: `${b.milestone ? b.left + dayW / 2 : b.left}px`,
                      top: `${b.r * rowHeight}px`,
                      width: b.milestone ? undefined : `${b.width}px`,
                      '--_gt-i': i,
                      '--_gt-p': b.progress,
                      '--_gt-c0': chartStops[b.tone][0],
                      '--_gt-c1': chartStops[b.tone][1],
                    } as CSSProperties
                  }
                  role="img"
                  aria-label={b.text}
                  tabIndex={current === b.id ? 0 : -1}
                  onPointerEnter={() => setHovered(b.id)}
                  onPointerLeave={() => setHovered(null)}
                  onFocus={() => setFocused(b.id)}
                  onPointerDown={(e) => onPointerDown(e, b.id)}
                >
                  {!b.milestone && <span className="ml-gantt__progress" />}
                  {editable && !b.milestone && <span className="ml-gantt__handle" />}
                </div>
              ))}
              {todayX !== null && (
                <div className="ml-gantt__today" style={{ left: `${todayX}px` }} aria-hidden="true">
                  <span>{loc.gantt.today}</span>
                </div>
              )}
              {tip && (
                <div
                  className={cx('ml-gantt__tip', { 'ml-gantt__tip--below': tip.below })}
                  style={{ left: `${tip.left}px`, top: `${tip.below ? (tip.b.r + 1) * rowHeight : tip.b.r * rowHeight}px` }}
                  aria-hidden="true"
                >
                  <p className="ml-gantt__tip-title">{tip.b.task.label}</p>
                  {tip.b.milestone ? (
                    <p className="ml-gantt__tip-row">
                      <span>{loc.gantt.milestone}</span>
                      <b>{ganttFormat(tip.b.start)}</b>
                    </p>
                  ) : (
                    <>
                      <p className="ml-gantt__tip-row">
                        <span>{loc.gantt.start}</span>
                        <b>{ganttFormat(tip.b.start)}</b>
                      </p>
                      <p className="ml-gantt__tip-row">
                        <span>{loc.gantt.end}</span>
                        <b>{ganttFormat(tip.b.end)}</b>
                      </p>
                      <p className="ml-gantt__tip-row">
                        <span>{loc.gantt.duration}</span>
                        <b>{loc.gantt.days(tip.b.end - tip.b.start + 1)}</b>
                      </p>
                      <p className="ml-gantt__tip-row">
                        <span>{loc.gantt.progress}</span>
                        <b>{`${Math.round(tip.b.progress * 100)}%`}</b>
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <p className="ml-visually-hidden" aria-live="polite">
        {live}
      </p>
      <div className="ml-visually-hidden">
      <table>
        <caption>{loc.gantt.table}</caption>
        <thead>
          <tr>
            <th scope="col">{loc.gantt.task}</th>
            <th scope="col">{loc.gantt.group}</th>
            <th scope="col">{loc.gantt.start}</th>
            <th scope="col">{loc.gantt.end}</th>
            <th scope="col">{loc.gantt.progress}</th>
          </tr>
        </thead>
        <tbody>
          {spans.map((s) => (
            <tr key={s.task.id}>
              <th scope="row">{s.task.label}</th>
              <td>{s.task.group ?? ''}</td>
              <td>{ganttFormat(s.start)}</td>
              <td>{s.task.milestone ? loc.gantt.milestone : ganttFormat(s.end)}</td>
              <td>{s.task.milestone ? '' : `${Math.round(Math.min(1, Math.max(0, s.task.progress ?? 0)) * 100)}%`}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </figure>
  )
}
