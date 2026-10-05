import { useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { chartStops } from '../components/charts'
import { icons } from '../components/icons'
import type { MlTimeInput } from '../components/relative-time'
import {
  allDayBars,
  dayLabel,
  eventTimeText,
  formatClock,
  hourLabels,
  minuteOfDay,
  minutesAt,
  monthCellAt,
  monthKeyMove,
  monthKeyTarget,
  monthLayout,
  monthTitle,
  moveEvent,
  resizeEvent,
  sameDay,
  schedulerTitle,
  segmentTime,
  shiftAnchor,
  snapMinutes,
  startOfDay,
  timedSegments,
  toDate,
  viewDays,
  weekdayLabel,
  type MlSchedulerEvent,
  type MlSchedulerView,
  type MonthItem,
  type SchedulerRange,
} from '../components/scheduler'
import type { MlChartTone } from '../types'
import { useLocale } from './locale'
import { useNow } from './use-outside'
import { cx, useControllable } from './utils'

export interface SchedulerProps {
  events?: MlSchedulerEvent[]
  view?: MlSchedulerView
  defaultView?: MlSchedulerView
  onViewChange?: (view: MlSchedulerView) => void
  /** Any day in the period shown. Defaults to today. */
  date?: Date
  defaultDate?: Date
  onDateChange?: (date: Date) => void
  weekStartsOn?: 0 | 1
  /** First and last hour shown (the grid scrolls between them). */
  startHour?: number
  endHour?: number
  /** Pixels per hour. */
  hourHeight?: number
  /** Snap for dragging and keyboard moves, in minutes. */
  step?: number
  /** Height of the scrolling area (the month grid's minimum height). Numbers are pixels. */
  height?: number | string
  /** Hour scrolled to on mount. */
  scrollToHour?: number
  /** Rows of events per day in month view; the rest fold into "還有 n 項". */
  monthMaxEvents?: number
  /** Drag events to move them, their bottom edge to resize, empty slots to create. */
  editable?: boolean
  /** Prev / today / next and the month–week–day switch. */
  toolbar?: boolean
  /** Colour of events without a tone. */
  tone?: MlChartTone
  /** "Now" for the today highlight and the time line. Defaults to the clock. */
  now?: MlTimeInput
  onEventClick?: (event: MlSchedulerEvent) => void
  onChange?: (event: MlSchedulerEvent, range: SchedulerRange) => void
  onCreate?: (range: SchedulerRange) => void
  renderEvent?: (event: MlSchedulerEvent, time: string) => ReactNode
  className?: string
}

const NO_EVENTS: MlSchedulerEvent[] = []
const VIEWS = ['month', 'week', 'day'] as const

type Box = { left: number; top: number; width: number; height: number }

function Chevron({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="square">
      <path d={d} />
    </svg>
  )
}

export function Scheduler({
  events = NO_EVENTS,
  view: viewProp,
  defaultView = 'week',
  onViewChange,
  date: dateProp,
  defaultDate,
  onDateChange,
  weekStartsOn = 0,
  startHour = 0,
  endHour = 24,
  hourHeight = 48,
  step = 15,
  height = 560,
  scrollToHour = 8,
  monthMaxEvents = 3,
  editable = false,
  toolbar = true,
  tone = 'gold',
  now: nowProp,
  onEventClick,
  onChange,
  onCreate,
  renderEvent,
  className,
}: SchedulerProps) {
  const loc = useLocale()
  const [view, setView] = useControllable<MlSchedulerView>(viewProp, defaultView, onViewChange)
  const [date, setDate] = useControllable<Date | undefined>(dateProp, defaultDate, onDateChange as ((d: Date | undefined) => void) | undefined)
  const nowInput = useNow(nowProp)
  const now = toDate(nowInput) ?? new Date()
  const anchor = date ?? now
  const isMonth = view === 'month'
  const days = viewDays(anchor, view, weekStartsOn)
  const title = isMonth ? monthTitle(anchor, loc.name) : schedulerTitle(days, loc.name)
  const hours = hourLabels(startHour, endHour)
  const hintId = `ml-scheduler-hint-${useId().replace(/[^\w-]/g, '')}`

  const [draft, setDraft] = useState<{ id: string; range: SchedulerRange } | null>(null)
  const [ghost, setGhost] = useState<{ day: number; start: number; end: number } | null>(null)
  const [span, setSpan] = useState<{ from: number; to: number } | null>(null)
  const [live, setLive] = useState('')
  const root = useRef<HTMLDivElement>(null)
  const body = useRef<HTMLDivElement>(null)
  const grid = useRef<HTMLDivElement>(null)

  const shown = draft ? events.map((e) => (e.id === draft.id ? { ...e, start: draft.range.start, end: draft.range.end } : e)) : events
  const lo = startHour * 60
  const hi = endHour * 60
  const columns = isMonth
    ? []
    : timedSegments(shown, days).map((list) =>
        list
          .filter((s) => s.end > lo && s.start < hi)
          .map((s) => {
            const top = Math.max(s.start, lo)
            const bottom = Math.min(s.end, hi)
            return { ...s, top: ((top - lo) / 60) * hourHeight, size: ((bottom - top) / 60) * hourHeight, time: segmentTime(s) }
          }),
      )
  const bars = isMonth ? [] : allDayBars(shown, days)
  const lanes = bars.reduce((n, b) => Math.max(n, b.lane + 1), 0)
  const todayIndex = days.findIndex((d) => sameDay(d, now))
  const nowMinute = minuteOfDay(now)
  const nowLine = !isMonth && todayIndex >= 0 && nowMinute >= lo && nowMinute <= hi ? { day: todayIndex, top: ((nowMinute - lo) / 60) * hourHeight } : null

  /* Month grid: six week rows, events in lanes, overflow per day. */
  const month = isMonth ? monthLayout(shown, days, monthMaxEvents) : null
  const weeks = isMonth ? Array.from({ length: days.length / 7 }, (_, w) => Array.from({ length: 7 }, (_, c) => w * 7 + c)) : []
  const focusIndex = Math.max(0, days.findIndex((d) => sameDay(d, anchor)))
  const outside = (d: Date) => d.getMonth() !== anchor.getMonth()
  const cellLabel = (i: number) => {
    const count = month?.perDay[i].length ?? 0
    return [dayLabel(days[i], loc.name), count ? loc.scheduler.events(count) : ''].filter(Boolean).join('，')
  }
  const itemTime = (p: MonthItem) => (p.event.allDay ? loc.scheduler.allDay : p.time || formatClock(toDate(p.event.start)!))

  const canEdit = (e: MlSchedulerEvent) => editable && e.editable !== false
  const color = (e: MlSchedulerEvent) => chartStops[e.tone ?? tone]
  const label = (e: MlSchedulerEvent, time: string) => [e.title, e.allDay ? loc.scheduler.allDay : time, e.location].filter(Boolean).join('，')
  const openDay = (d: Date) => {
    setDate(d)
    setView('day')
  }

  // Latest values for the window listeners.
  const latest = useRef({ view, days, hourHeight, step, startHour, draft, ghost, span, onChange, onCreate })
  latest.current = { view, days, hourHeight, step, startHour, draft, ghost, span, onChange, onCreate }

  /* ── Drag to move / resize, or to create ─────────────── */
  const drag = useRef<{ pointer: number; event: MlSchedulerEvent; mode: 'move' | 'resize'; x: number; y: number; colWidth: number; moved: boolean; box?: Box; cell?: number } | null>(null)
  const create = useRef<{ pointer: number; day: number; top: number; anchor: number; box?: Box } | null>(null)
  const swallowClick = useRef(false)
  const listeners = useRef<{ move: (e: PointerEvent) => void; up: (e: PointerEvent) => void } | null>(null)

  const listen = (on: boolean) => {
    if (typeof window === 'undefined') return
    if (listeners.current) {
      window.removeEventListener('pointermove', listeners.current.move)
      window.removeEventListener('pointerup', listeners.current.up)
      window.removeEventListener('pointercancel', listeners.current.up)
      listeners.current = null
    }
    if (!on) return
    const move = (e: PointerEvent) => {
      const l = latest.current
      const d = drag.current
      if (d && e.pointerId === d.pointer) {
        if (d.box) {
          const shift = monthCellAt(e.clientX, e.clientY, d.box) - d.cell!
          if (!shift && !d.moved) return
          d.moved = true
          const range = moveEvent(d.event, shift, 0)
          if (range) {
            l.draft = { id: d.event.id, range }
            setDraft(l.draft)
          }
          return
        }
        const dayShift = l.view === 'week' ? Math.round((e.clientX - d.x) / d.colWidth) : 0
        const minutes = d.event.allDay ? 0 : snapMinutes(((e.clientY - d.y) / l.hourHeight) * 60, l.step)
        if (!dayShift && !minutes && !d.moved) return
        d.moved = true
        const range = d.mode === 'move' ? moveEvent(d.event, dayShift, minutes) : resizeEvent(d.event, d.event.allDay ? dayShift * 1440 : minutes, l.step)
        if (range) {
          l.draft = { id: d.event.id, range }
          setDraft(l.draft)
        }
      } else if (create.current && e.pointerId === create.current.pointer) {
        const c = create.current
        if (c.box) {
          const i = monthCellAt(e.clientX, e.clientY, c.box)
          l.span = { from: Math.min(i, c.anchor), to: Math.max(i, c.anchor) }
          setSpan(l.span)
          return
        }
        const m = minutesAt(e.clientY - c.top, l.hourHeight, l.step, l.startHour)
        l.ghost = m > c.anchor ? { day: c.day, start: c.anchor, end: m } : { day: c.day, start: m, end: c.anchor + l.step }
        setGhost(l.ghost)
      }
    }
    const up = (e: PointerEvent) => {
      const l = latest.current
      const cancelled = e.type === 'pointercancel'
      const d = drag.current
      if (d && e.pointerId === d.pointer) {
        const range = l.draft?.range
        drag.current = null
        setDraft(null)
        swallowClick.current = d.moved
        if (d.moved && range && !cancelled) l.onChange?.(d.event, range)
      } else if (create.current && e.pointerId === create.current.pointer) {
        const g = l.ghost
        const s = l.span
        const day = l.days[create.current.day]
        create.current = null
        setGhost(null)
        setSpan(null)
        if (s && !cancelled) l.onCreate?.({ start: l.days[s.from], end: l.days[s.to], allDay: true })
        else if (g && day && !cancelled) l.onCreate?.({ start: new Date(day.getTime() + g.start * 60_000), end: new Date(day.getTime() + g.end * 60_000) })
      }
      if (!drag.current && !create.current) listen(false)
    }
    listeners.current = { move, up }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
  }
  useEffect(() => () => listen(false), [])

  const onEventPointerDown = (e: ReactPointerEvent<HTMLElement>, event: MlSchedulerEvent) => {
    if (!canEdit(event) || e.button !== 0) return
    const col = e.currentTarget.closest('.ml-scheduler__col, .ml-scheduler__lanes') as HTMLElement | null
    const width = col ? col.getBoundingClientRect().width / (col.classList.contains('ml-scheduler__lanes') ? days.length : 1) : 1
    // Month view: which cell was grabbed, so a long bar keeps its offset under the pointer.
    const box = isMonth ? grid.current?.getBoundingClientRect() : undefined
    drag.current = {
      pointer: e.pointerId,
      event,
      mode: (e.target as Element).closest('.ml-scheduler__handle') ? 'resize' : 'move',
      x: e.clientX,
      y: e.clientY,
      colWidth: width || 1,
      moved: false,
      box,
      cell: box ? monthCellAt(e.clientX, e.clientY, box) : undefined,
    }
    e.preventDefault()
    listen(true)
  }

  const onColumnPointerDown = (e: ReactPointerEvent<HTMLElement>, day: number) => {
    if (!editable || e.button !== 0 || e.target !== e.currentTarget) return
    const top = e.currentTarget.getBoundingClientRect().top
    const start = Math.floor((((e.clientY - top) / hourHeight) * 60 + startHour * 60) / step) * step
    create.current = { pointer: e.pointerId, day, top, anchor: start }
    latest.current.ghost = { day, start, end: start + step }
    setGhost(latest.current.ghost)
    e.preventDefault()
    listen(true)
  }

  const onDayPointerDown = (e: ReactPointerEvent<HTMLElement>, day: number) => {
    if (!editable || e.button !== 0 || e.target !== e.currentTarget || !grid.current) return
    create.current = { pointer: e.pointerId, day, top: 0, anchor: day, box: grid.current.getBoundingClientRect() }
    latest.current.span = { from: day, to: day }
    setSpan(latest.current.span)
    e.preventDefault()
    listen(true)
  }

  const clickEvent = (event: MlSchedulerEvent) => {
    if (swallowClick.current) {
      swallowClick.current = false
      return
    }
    onEventClick?.(event)
  }

  /* ── Keyboard ──────────────────────────────────────────── */
  const refocus = useRef<string>(undefined)
  const refocusDay = useRef(false)
  useEffect(() => {
    if (refocusDay.current) {
      refocusDay.current = false
      grid.current?.querySelector<HTMLElement>('.ml-scheduler__mday[tabindex="0"]')?.focus()
    }
    if (refocus.current === undefined) return
    const id = refocus.current
    refocus.current = undefined
    root.current?.querySelectorAll<HTMLElement>('.ml-scheduler__event').forEach((el) => el.dataset.id === id && el.focus())
  })
  const describe = (range: SchedulerRange, allDay?: boolean) => {
    const day = new Intl.DateTimeFormat(loc.name, { month: 'short', day: 'numeric', weekday: 'short' })
    return allDay ? day.formatRange(range.start, range.end) : `${day.format(range.start)} ${formatClock(range.start)}–${formatClock(range.end)}`
  }
  const onEventKeyDown = (e: KeyboardEvent<HTMLElement>, event: MlSchedulerEvent) => {
    if (!canEdit(event)) return
    let range: SchedulerRange | null = null
    const vertical = e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0
    const horizontal = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0
    if (isMonth) range = monthKeyMove(event, e.key, e.shiftKey)
    else if (vertical && !event.allDay) range = e.shiftKey ? resizeEvent(event, vertical * step, step) : moveEvent(event, 0, vertical * step)
    else if (horizontal) range = e.shiftKey && event.allDay ? resizeEvent(event, horizontal * 1440, step) : moveEvent(event, horizontal, 0)
    if (!range) return
    e.preventDefault()
    // A moved event leaves the day it was listed under.
    setPop(null)
    // The event may now live in another column: keep the keyboard on it.
    refocus.current = event.id
    onChange?.(event, range)
    setLive(loc.scheduler.moved(event.title, describe(range, event.allDay)))
  }

  /* Month grid: roving focus over days; the focused day is the date model. */
  const onDayKeyDown = (e: KeyboardEvent<HTMLElement>, i: number) => {
    if (e.target !== e.currentTarget) return
    const d = days[i]
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      openDay(d)
      return
    }
    const next = monthKeyTarget(d, e.key, weekStartsOn, e.shiftKey)
    if (!next) return
    e.preventDefault()
    refocusDay.current = true
    setDate(next)
  }

  /* "還有 n 項": a popover listing the whole day; it belongs to one page of one view. */
  const page = `${view}:${days[0]?.getTime()}`
  const [popState, setPopState] = useState<{ day: number; page: string } | null>(null)
  const pop = popState && popState.page === page ? popState.day : null
  const setPop = (day: number | null) => setPopState(day === null ? null : { day, page })
  const focusPop = useRef(false)
  useEffect(() => {
    if (!focusPop.current) return
    focusPop.current = false
    root.current?.querySelector<HTMLElement>('.ml-scheduler__pop .ml-scheduler__event')?.focus()
  })
  const morePopover = (i: number) => {
    focusPop.current = pop !== i
    setPop(pop === i ? null : i)
  }
  const closePopover = (returnFocus: boolean) => {
    const trigger = root.current?.querySelector<HTMLElement>('.ml-scheduler__more[aria-expanded="true"]')
    setPop(null)
    if (returnFocus) trigger?.focus()
  }
  const onPopKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key !== 'Escape') return
    e.preventDefault()
    e.stopPropagation()
    closePopover(true)
  }
  useEffect(() => {
    if (pop === null) return
    const onDown = (e: Event) => {
      const target = e.target as Node
      const popEl = root.current?.querySelector('.ml-scheduler__pop')
      const trigger = root.current?.querySelector('.ml-scheduler__more[aria-expanded="true"]')
      if (popEl?.contains(target) || trigger?.contains(target)) return
      const trig = trigger as HTMLElement | null | undefined
      const inside = !!popEl?.contains(document.activeElement)
      setPopState(null)
      if (inside) trig?.focus()
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [pop])

  useEffect(() => {
    if (body.current) body.current.scrollTop = Math.max(0, (scrollToHour - startHour) * hourHeight - 12)
    // On mount and when coming back from the month grid, like the Vue twin.
  }, [isMonth])

  const weekend = (d: Date) => d.getDay() === 0 || d.getDay() === 6
  const tones = (e: MlSchedulerEvent) => ({ '--_sc-c0': color(e)[0], '--_sc-c1': color(e)[1] }) as CSSProperties
  const size = (v: number | string) => (typeof v === 'number' ? `${v}px` : v)

  return (
    <div
      ref={root}
      className={cx('ml-scheduler', `ml-scheduler--${view}`, className, { 'ml-scheduler--editable': editable, 'ml-scheduler--dragging': !!draft || !!ghost || !!span })}
      role="region"
      aria-label={loc.scheduler.label}
      style={{ '--_sc-hour': `${hourHeight}px`, '--_sc-days': isMonth ? 7 : days.length } as CSSProperties}
    >
      {toolbar && (
        <div className="ml-scheduler__toolbar">
          <div className="ml-scheduler__nav">
            <button type="button" className="ml-scheduler__btn" aria-label={loc.scheduler.prev} onClick={() => setDate(shiftAnchor(anchor, view, -1))}>
              <Chevron d={icons.chevronLeft} />
            </button>
            <button type="button" className="ml-scheduler__btn ml-scheduler__today" onClick={() => setDate(startOfDay(now))}>
              {loc.scheduler.today}
            </button>
            <button type="button" className="ml-scheduler__btn" aria-label={loc.scheduler.next} onClick={() => setDate(shiftAnchor(anchor, view, 1))}>
              <Chevron d={icons.chevronRight} />
            </button>
          </div>
          <h3 className="ml-scheduler__title" aria-live="polite">
            {title}
          </h3>
          <div className="ml-scheduler__views" role="group">
            {VIEWS.map((v) => (
              <button key={v} type="button" className={cx('ml-scheduler__view', { 'ml-scheduler__view--active': view === v })} aria-pressed={view === v} onClick={() => setView(v)}>
                {loc.scheduler[v]}
              </button>
            ))}
          </div>
        </div>
      )}
      {month ? (
        <div className="ml-scheduler__month" role="grid" aria-label={title} style={{ minHeight: size(height), '--_sc-max': monthMaxEvents } as CSSProperties}>
          <div className="ml-scheduler__mhead" role="row">
            {days.slice(0, 7).map((d, i) => (
              <div key={i} className={cx('ml-scheduler__mweekday', { 'ml-scheduler__mweekday--weekend': weekend(d) })} role="columnheader">
                {weekdayLabel(d, loc.name)}
              </div>
            ))}
          </div>
          <div ref={grid} className="ml-scheduler__mweeks">
            {weeks.map((week, w) => (
              <div key={w} className="ml-scheduler__mweek" role="row">
                {week.map((i) => (
                  <div
                    key={i}
                    className={cx('ml-scheduler__mday', {
                      'ml-scheduler__mday--outside': outside(days[i]),
                      'ml-scheduler__mday--today': sameDay(days[i], now),
                      'ml-scheduler__mday--weekend': weekend(days[i]),
                      'ml-scheduler__mday--ghost': !!span && i >= span.from && i <= span.to,
                    })}
                    role="gridcell"
                    tabIndex={i === focusIndex ? 0 : -1}
                    aria-label={cellLabel(i)}
                    aria-current={sameDay(days[i], now) ? 'date' : undefined}
                    onKeyDown={(e) => onDayKeyDown(e, i)}
                    onPointerDown={(e) => onDayPointerDown(e, i)}
                  >
                    <button type="button" tabIndex={-1} className="ml-scheduler__mdate" aria-label={loc.scheduler.openDay(dayLabel(days[i], loc.name))} onClick={() => openDay(days[i])}>
                      {days[i].getDate()}
                    </button>
                    {month.starts[i].map((p) => (
                      <button
                        key={p.event.id}
                        type="button"
                        data-id={p.event.id}
                        className={cx('ml-scheduler__event', 'ml-scheduler__event--month', p.bar ? 'ml-scheduler__event--bar' : 'ml-scheduler__event--chip', {
                          'ml-scheduler__event--before': p.before,
                          'ml-scheduler__event--after': p.after,
                          'ml-scheduler__event--draft': draft?.id === p.event.id,
                        })}
                        style={{ '--_sc-lane': p.lane, '--_sc-span': p.to - p.from + 1, ...tones(p.event) } as CSSProperties}
                        aria-label={label(p.event, eventTimeText(p.event))}
                        aria-describedby={canEdit(p.event) ? hintId : undefined}
                        onPointerDown={(e) => onEventPointerDown(e, p.event)}
                        onClick={() => clickEvent(p.event)}
                        onKeyDown={(e) => onEventKeyDown(e, p.event)}
                      >
                        {renderEvent ? (
                          renderEvent(p.event, itemTime(p))
                        ) : (
                          <>
                            {!p.bar && (
                              <>
                                <span className="ml-scheduler__dot" aria-hidden="true" />
                                <span className="ml-scheduler__time">{p.time}</span>
                              </>
                            )}
                            <span className="ml-scheduler__name">{p.event.title}</span>
                          </>
                        )}
                      </button>
                    ))}
                    {month.more[i] > 0 && (
                      <button type="button" className="ml-scheduler__more" aria-haspopup="dialog" aria-expanded={pop === i} onClick={() => morePopover(i)}>
                        {loc.scheduler.more(month.more[i])}
                      </button>
                    )}
                    {pop === i && (
                      <div
                        className={cx('ml-scheduler__pop', { 'ml-scheduler__pop--up': w >= 3, 'ml-scheduler__pop--end': i % 7 >= 4 })}
                        role="dialog"
                        aria-label={dayLabel(days[i], loc.name)}
                        onKeyDown={onPopKeyDown}
                      >
                        <p className="ml-scheduler__pop-title">{dayLabel(days[i], loc.name)}</p>
                        {month.perDay[i].map((p) => (
                          <button
                            key={p.event.id}
                            type="button"
                            data-id={p.event.id}
                            className="ml-scheduler__event ml-scheduler__event--month ml-scheduler__event--chip"
                            style={tones(p.event)}
                            aria-label={label(p.event, eventTimeText(p.event))}
                            aria-describedby={canEdit(p.event) ? hintId : undefined}
                            onClick={() => clickEvent(p.event)}
                            onKeyDown={(e) => onEventKeyDown(e, p.event)}
                          >
                            {renderEvent ? (
                              renderEvent(p.event, itemTime(p))
                            ) : (
                              <>
                                <span className="ml-scheduler__dot" aria-hidden="true" />
                                <span className="ml-scheduler__time">{itemTime(p)}</span>
                                <span className="ml-scheduler__name">{p.event.title}</span>
                              </>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div ref={body} className="ml-scheduler__body" style={{ height: size(height) }}>
          <div className="ml-scheduler__sticky">
            <div className="ml-scheduler__head">
              <span className="ml-scheduler__corner" />
              {days.map((d, i) => (
                <div key={i} className={cx('ml-scheduler__day', { 'ml-scheduler__day--today': sameDay(d, now), 'ml-scheduler__day--weekend': weekend(d) })}>
                  <span className="ml-scheduler__weekday">{weekdayLabel(d, loc.name)}</span>
                  <span className="ml-scheduler__date">{d.getDate()}</span>
                </div>
              ))}
            </div>
            {bars.length > 0 && (
              <div className="ml-scheduler__allday">
                <span className="ml-scheduler__allday-label">{loc.scheduler.allDay}</span>
                <div className="ml-scheduler__lanes" style={{ gridTemplateRows: `repeat(${lanes}, 24px)` }}>
                  {bars.map((b) => (
                    <button
                      key={b.event.id}
                      type="button"
                      data-id={b.event.id}
                      className={cx('ml-scheduler__event', 'ml-scheduler__event--allday', {
                        'ml-scheduler__event--before': b.before,
                        'ml-scheduler__event--after': b.after,
                        'ml-scheduler__event--draft': draft?.id === b.event.id,
                      })}
                      style={{ gridColumn: `${b.from + 1} / ${b.to + 2}`, gridRow: b.lane + 1, ...tones(b.event) }}
                      aria-label={label(b.event, '')}
                      aria-describedby={canEdit(b.event) ? hintId : undefined}
                      onPointerDown={(e) => onEventPointerDown(e, b.event)}
                      onClick={() => clickEvent(b.event)}
                      onKeyDown={(e) => onEventKeyDown(e, b.event)}
                    >
                      {renderEvent ? renderEvent(b.event, loc.scheduler.allDay) : <span className="ml-scheduler__name">{b.event.title}</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="ml-scheduler__grid" style={{ height: `${(endHour - startHour) * hourHeight}px` }}>
            <div className="ml-scheduler__gutter" aria-hidden="true">
              {hours.map((h, i) => (
                <span key={h} className="ml-scheduler__hour" style={{ top: `${i * hourHeight}px` }}>
                  {h}
                </span>
              ))}
            </div>
            {columns.map((col, d) => (
              <div
                key={d}
                className={cx('ml-scheduler__col', { 'ml-scheduler__col--today': sameDay(days[d], now), 'ml-scheduler__col--weekend': weekend(days[d]) })}
                onPointerDown={(e) => onColumnPointerDown(e, d)}
              >
                {col.map((seg) => (
                  <button
                    key={seg.event.id}
                    type="button"
                    data-id={seg.event.id}
                    className={cx('ml-scheduler__event', {
                      'ml-scheduler__event--short': seg.size < 36,
                      'ml-scheduler__event--before': seg.before,
                      'ml-scheduler__event--after': seg.after,
                      'ml-scheduler__event--draft': draft?.id === seg.event.id,
                    })}
                    style={{ top: `${seg.top}px`, height: `${seg.size}px`, left: `${(seg.col / seg.cols) * 100}%`, width: `${100 / seg.cols}%`, ...tones(seg.event) }}
                    aria-label={label(seg.event, seg.time)}
                    aria-describedby={canEdit(seg.event) ? hintId : undefined}
                    onPointerDown={(e) => onEventPointerDown(e, seg.event)}
                    onClick={() => clickEvent(seg.event)}
                    onKeyDown={(e) => onEventKeyDown(e, seg.event)}
                  >
                    {renderEvent ? (
                      renderEvent(seg.event, seg.time)
                    ) : (
                      <>
                        <span className="ml-scheduler__time">{seg.time}</span>
                        <span className="ml-scheduler__name">{seg.event.title}</span>
                        {seg.event.location && <span className="ml-scheduler__place">{seg.event.location}</span>}
                      </>
                    )}
                    {canEdit(seg.event) && !seg.after && <span className="ml-scheduler__handle" aria-hidden="true" />}
                  </button>
                ))}
                {ghost && ghost.day === d && (
                  <div className="ml-scheduler__ghost" style={{ top: `${((ghost.start - lo) / 60) * hourHeight}px`, height: `${((ghost.end - ghost.start) / 60) * hourHeight}px` }}>
                    {segmentTime(ghost)}
                  </div>
                )}
                {nowLine && nowLine.day === d && <div className="ml-scheduler__now" style={{ top: `${nowLine.top}px` }} />}
              </div>
            ))}
          </div>
        </div>
      )}
      {editable && (
        <p id={hintId} className="ml-visually-hidden">
          {isMonth ? loc.scheduler.monthHint : loc.scheduler.hint}
        </p>
      )}
      <p className="ml-visually-hidden" aria-live="polite">
        {live}
      </p>
    </div>
  )
}
