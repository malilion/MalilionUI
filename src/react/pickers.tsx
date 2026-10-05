import {
  forwardRef,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
  type CSSProperties,
  type DragEvent,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type Ref,
} from 'react'
import { hexToHsva, hsvaToHex, parseHex, type HSVA } from '../components/color'
import { addDays, addMonths, comparePeriods, dayKey, formatPeriod, monthGrid, sameDay, startOfDay, withCalendar, type MlCalendarSystem } from '../components/dates'
import { formatTime, padTime, parseTime, range as steps, toSeconds, type TimeParts } from '../components/time'
import { CARD_DRAG_THRESHOLD, addFiles, canAddMore, cardIndexAt, createThumbStore, formatSize, moveItem, reorderKey, uploadState } from '../components/upload'
import type { MlLocale } from '../locale-data'
import type { MlDatePickerType, MlDateRange, MlRangePreset, MlUploadFile, MlUploadListType, MlUploadRejectReason } from '../types'
import { Button, Icon, Paw } from './basic'
import { Field } from './form'
import { ImagePreview } from './layout'
import { useLocale } from './locale'
import { useTransition } from './overlay'
import { PeriodPanel } from './period'
import { cx, describedBy, useControllable } from './utils'
import { useFormField } from './validation'

const NO_RANGE: MlDateRange = [null, null]
const cleanId = (id: string) => id.replace(/[^\w-]/g, '')

export interface FocusHandle {
  focus(): void
}

/* ── Calendar ──────────────────────────────────────────── */

export interface CalendarProps {
  /** "single" uses value/onChange; "range" uses range/onRangeChange. */
  mode?: 'single' | 'range'
  value?: Date | null
  defaultValue?: Date | null
  onChange?: (date: Date | null) => void
  range?: MlDateRange
  defaultRange?: MlDateRange
  onRangeChange?: (range: MlDateRange) => void
  min?: Date
  max?: Date
  disabledDate?: (date: Date) => boolean
  /** Days that get a little paw marker (events, deadlines…). */
  markers?: Date[]
  locale?: string
  /** 'roc' titles the months in 民國 years (民國115年10月). */
  calendar?: MlCalendarSystem
  /** 0 = Sunday, 1 = Monday. */
  weekStartsOn?: 0 | 1
  onMonthChange?: (year: number, month: number) => void
  className?: string
}

function CalendarImpl({
  mode = 'single',
  value,
  defaultValue = null,
  onChange,
  range,
  defaultRange = NO_RANGE,
  onRangeChange,
  min,
  max,
  disabledDate,
  markers,
  locale,
  calendar,
  weekStartsOn = 0,
  onMonthChange,
  className,
  focusRef: ref,
}: CalendarProps & { focusRef?: Ref<FocusHandle> }) {
  const loc = useLocale()
  const [model, setModel] = useControllable(value, defaultValue, onChange)
  const [rng, setRange] = useControllable(range, defaultRange, onRangeChange)
  const [today] = useState(() => startOfDay(new Date()))
  const anchor = mode === 'range' ? rng[0] : model
  const [view, setViewState] = useState(() => {
    const d = anchor ?? today
    return { year: d.getFullYear(), month: d.getMonth() }
  })
  /** The day that owns the roving tabindex. */
  const [focused, setFocused] = useState(() => startOfDay(anchor ?? today))
  const [hovered, setHovered] = useState<Date | null>(null)
  /** Direction of the last month change, so the new grid slides in from that side. */
  const [slide, setSlide] = useState<'next' | 'prev' | null>(null)
  const grid = useRef<HTMLTableElement>(null)
  const pendingFocus = useRef(false)
  const titleId = `ml-calendar-${cleanId(useId())}`

  const days = monthGrid(view.year, view.month, weekStartsOn)
  const weeks = Array.from({ length: 6 }, (_, w) => days.slice(w * 7, w * 7 + 7))
  const lang = locale ?? loc.name
  const isZh = lang.toLowerCase().startsWith('zh')
  const dayFmt = new Intl.DateTimeFormat(lang, { weekday: isZh ? 'narrow' : 'short' })
  // 2023-01-01 was a Sunday.
  const weekdays = Array.from({ length: 7 }, (_, i) => dayFmt.format(new Date(2023, 0, 1 + ((i + weekStartsOn) % 7))))
  const title = new Intl.DateTimeFormat(lang, withCalendar({ year: 'numeric', month: 'long' }, calendar)).format(new Date(view.year, view.month, 1))
  const fullFmt = new Intl.DateTimeFormat(lang, withCalendar({ dateStyle: 'full' }, calendar))
  const markerKeys = new Set((markers ?? []).map(dayKey))

  const isDisabled = (d: Date) => {
    if (min && d < startOfDay(min)) return true
    if (max && d > startOfDay(max)) return true
    return disabledDate?.(d) ?? false
  }
  const isSelected = (d: Date) => (mode === 'single' ? sameDay(d, model) : sameDay(d, rng[0]) || sameDay(d, rng[1]))
  /** Between the range ends — or, while picking the end, between start and the hovered day. */
  const inRange = (d: Date) => {
    if (mode !== 'range') return false
    const [start, end] = rng
    const other = end ?? (start ? hovered : null)
    if (!start || !other) return false
    const [lo, hi] = start <= other ? [start, other] : [other, start]
    return d > startOfDay(lo) && d < startOfDay(hi)
  }

  function setView(d: Date) {
    const delta = d.getFullYear() * 12 + d.getMonth() - (view.year * 12 + view.month)
    if (delta) setSlide(delta > 0 ? 'next' : 'prev')
    setViewState({ year: d.getFullYear(), month: d.getMonth() })
    onMonthChange?.(d.getFullYear(), d.getMonth())
  }
  const outsideView = (d: Date) => d.getMonth() !== view.month || d.getFullYear() !== view.year

  function select(d: Date) {
    if (isDisabled(d)) return
    setFocused(d)
    if (d.getMonth() !== view.month) setView(d)
    if (mode === 'single') return setModel(d)
    const [start, end] = rng
    if (!start || end) setRange([d, null])
    else setRange(d < start ? [d, start] : [start, d])
  }

  function shiftMonth(delta: number) {
    setView(addMonths(new Date(view.year, view.month, 1), delta))
    setFocused(addMonths(focused, delta))
  }

  function moveFocus(d: Date) {
    pendingFocus.current = true
    setFocused(d)
    if (outsideView(d)) setView(d)
  }

  useEffect(() => {
    if (!pendingFocus.current) return
    pendingFocus.current = false
    grid.current?.querySelector<HTMLElement>(`[data-day="${dayKey(focused)}"]`)?.focus()
  })

  /** Move keyboard focus into the grid (used by the pickers when they open). */
  useImperativeHandle(ref, () => ({ focus: () => moveFocus(new Date(focused)) }), [focused, view])

  // Follow value changes made from outside (e.g. a date typed elsewhere).
  const anchorKey = anchor ? dayKey(anchor) : ''
  useEffect(() => {
    if (anchor && !sameDay(anchor, focused)) {
      setFocused(startOfDay(anchor))
      if (outsideView(anchor)) setView(anchor)
    }
  }, [anchorKey])

  function onKeyDown(event: KeyboardEvent) {
    const d = focused
    const col = (d.getDay() - weekStartsOn + 7) % 7
    const moves: Record<string, () => Date> = {
      ArrowLeft: () => addDays(d, -1),
      ArrowRight: () => addDays(d, 1),
      ArrowUp: () => addDays(d, -7),
      ArrowDown: () => addDays(d, 7),
      PageUp: () => addMonths(d, event.shiftKey ? -12 : -1),
      PageDown: () => addMonths(d, event.shiftKey ? 12 : 1),
      Home: () => addDays(d, -col),
      End: () => addDays(d, 6 - col),
    }
    if (moves[event.key]) {
      event.preventDefault()
      moveFocus(moves[event.key]())
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      select(d)
    }
  }

  return (
    <div className={cx('ml-calendar', `ml-calendar--${mode}`, className)}>
      <div className="ml-calendar__head">
        <button type="button" className="ml-calendar__nav" aria-label={loc.calendar.prevMonth} onClick={() => shiftMonth(-1)}>
          <Icon name="chevronLeft" />
        </button>
        <span id={titleId} className="ml-calendar__title" aria-live="polite">
          {title}
        </span>
        <button type="button" className="ml-calendar__nav" aria-label={loc.calendar.nextMonth} onClick={() => shiftMonth(1)}>
          <Icon name="chevronRight" />
        </button>
      </div>
      <table ref={grid} className="ml-calendar__grid" role="grid" aria-labelledby={titleId} onKeyDown={onKeyDown}>
        <thead>
          <tr>
            {weekdays.map((w) => (
              <th key={w} scope="col" className="ml-calendar__weekday">
                {w}
              </th>
            ))}
          </tr>
        </thead>
        <tbody key={`${view.year}-${view.month}`} className={cx('ml-calendar__body', slide && `ml-calendar__body--${slide}`)}>
          {weeks.map((week, w) => (
            <tr key={w}>
              {week.map((d) => (
                <td
                  key={dayKey(d)}
                  className={cx({
                    'ml-calendar__cell--range': inRange(d),
                    'ml-calendar__cell--start': mode === 'range' && sameDay(d, rng[0]) && !!(rng[1] || hovered),
                    'ml-calendar__cell--end': mode === 'range' && sameDay(d, rng[1]),
                  })}
                  aria-selected={isSelected(d)}
                  role="gridcell"
                >
                  <button
                    type="button"
                    data-day={dayKey(d)}
                    tabIndex={sameDay(d, focused) ? 0 : -1}
                    disabled={isDisabled(d)}
                    aria-label={fullFmt.format(d)}
                    aria-current={sameDay(d, today) ? 'date' : undefined}
                    className={cx('ml-calendar__day', {
                      'ml-calendar__day--outside': d.getMonth() !== view.month,
                      'ml-calendar__day--today': sameDay(d, today),
                      'ml-calendar__day--selected': isSelected(d),
                    })}
                    onClick={() => select(d)}
                    onMouseEnter={() => setHovered(d)}
                    onMouseLeave={() => setHovered(null)}
                  >
                    {d.getDate()}
                    {markerKeys.has(dayKey(d)) && <Paw tone="current" className="ml-calendar__marker" />}
                  </button>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Month grid; the ref's `focus()` moves focus to the active day. */
export const Calendar = forwardRef<FocusHandle, CalendarProps>(function Calendar(props, ref) {
  return <CalendarImpl {...props} focusRef={ref} />
})

/* ── Shared popup shell for the field pickers ──────────── */

type Placement = 'bottom-start' | 'bottom-end'

interface PickerBase {
  label?: ReactNode
  hint?: string
  error?: string
  index?: string
  placeholder?: string
  clearable?: boolean
  required?: boolean
  disabled?: boolean
  placement?: Placement
  id?: string
  className?: string
}

/** Open state, outside-click closing, the dropdown transition and focus-on-open. */
function usePopup(disabled: boolean | undefined, onOpened: () => void) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const transition = useTransition(open, 'ml-dropdown', { enter: 480, leave: 120 })
  const opened = useRef(onOpened)
  opened.current = onOpened
  const show = () => !disabled && setOpen(true)
  const hide = (returnFocus = true) => {
    setOpen(false)
    if (returnFocus) trigger.current?.focus()
  }
  useEffect(() => {
    if (!open) return
    const onDown = (event: PointerEvent) => {
      if (root.current && !root.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [open])
  useEffect(() => {
    if (open && transition.mounted) opened.current()
  }, [open, transition.mounted])
  return { open, show, hide, root, trigger, transition }
}
type Popup = ReturnType<typeof usePopup>

interface FrameProps extends PickerBase {
  pop: Popup
  controlId: string
  rootClass: string
  affix: ReactNode
  triggerClass?: string
  trigger: ReactNode
  after?: ReactNode
  clearLabel: string
  showClear: boolean
  onClear: () => void
  panelLabel: string
  panelClass?: string
  onPanelKeyDown?: (event: KeyboardEvent) => void
  panel: ReactNode
}

function PickerFrame(p: FrameProps) {
  const { pop, controlId, disabled, hint } = p
  const { error, required } = useFormField(p)
  const panelId = `${controlId}-panel`
  function onPanelKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.stopPropagation()
      pop.hide()
    } else p.onPanelKeyDown?.(event)
  }
  return (
    <Field controlId={controlId} label={p.label} hint={hint} error={error} index={p.index} required={required} className={p.className}>
      <div ref={pop.root} className={cx('ml-datepicker', p.rootClass)}>
        <div className={cx('ml-input', { 'ml-input--error': error, 'ml-input--disabled': disabled })}>
          {p.affix}
          <button
            id={controlId}
            ref={pop.trigger}
            type="button"
            className={cx('ml-input__control ml-datepicker__trigger', p.triggerClass)}
            aria-haspopup="dialog"
            aria-expanded={pop.open}
            aria-controls={pop.open ? panelId : undefined}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy(controlId, hint, error)}
            disabled={disabled}
            onClick={() => (pop.open ? pop.hide() : pop.show())}
          >
            {p.trigger}
          </button>
          {p.after}
          {p.clearable && p.showClear && !disabled && (
            <button type="button" className="ml-datepicker__clear" aria-label={p.clearLabel} onClick={p.onClear}>
              <Icon name="close" />
            </button>
          )}
        </div>
        {pop.transition.mounted && (
          <div
            id={panelId}
            role="dialog"
            aria-label={p.panelLabel}
            className={cx('ml-datepicker__panel', `ml-datepicker__panel--${p.placement ?? 'bottom-start'}`, p.panelClass, pop.transition.className)}
            onKeyDown={onPanelKeyDown}
          >
            {p.panel}
          </div>
        )}
      </div>
    </Field>
  )
}

const dateAffix = (
  <span className="ml-input__affix">
    <Icon name="calendar" />
  </span>
)

/* ── DatePicker ────────────────────────────────────────── */

interface CalendarBits {
  min?: Date
  max?: Date
  disabledDate?: (date: Date) => boolean
  markers?: Date[]
  locale?: string
  /** 'roc' shows 民國 years (民國115/10/04) instead of Gregorian. */
  calendar?: MlCalendarSystem
  weekStartsOn?: 0 | 1
}

export interface DatePickerProps extends PickerBase, CalendarBits {
  value?: Date | null
  defaultValue?: Date | null
  onChange?: (date: Date | null) => void
  /** Intl options used to display the chosen date. */
  format?: Intl.DateTimeFormatOptions
  /**
   * What to pick. For 'month' / 'quarter' / 'year' the value is the first day
   * of the chosen period (2026 Q4 → 2026-10-01).
   */
  type?: MlDatePickerType
}

const DATE_FORMAT: Intl.DateTimeFormatOptions = { year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' }

export function DatePicker({ value, defaultValue = null, onChange, format, placeholder, min, max, disabledDate, markers, locale, calendar, weekStartsOn = 0, type = 'date', ...base }: DatePickerProps) {
  const loc = useLocale()
  const controlId = base.id ?? `ml-datepicker-${cleanId(useId())}`
  const [model, setModel] = useControllable(value, defaultValue, onChange)
  const panel = useRef<FocusHandle>(null)
  const pop = usePopup(base.disabled, () => panel.current?.focus())
  // Periods use the locale's wording unless an explicit Intl format is given (quarters always do).
  const display = !model
    ? ''
    : type === 'date' || (format && type !== 'quarter')
      ? new Intl.DateTimeFormat(locale ?? loc.name, withCalendar(format ?? DATE_FORMAT, calendar)).format(model)
      : formatPeriod(model, type, loc.date.period, calendar === 'roc' ? loc.date.roc : undefined)
  const pickLabel = type === 'date' ? loc.date.pick : loc.date.period.pick[type]
  const pick = (d: Date | null) => {
    setModel(d)
    pop.hide()
  }
  return (
    <PickerFrame
      {...base}
      pop={pop}
      controlId={controlId}
      rootClass=""
      affix={dateAffix}
      trigger={display ? <span>{display}</span> : <span className="ml-datepicker__placeholder">{placeholder ?? pickLabel}</span>}
      clearLabel={type === 'date' ? loc.date.clear : loc.date.period.clear[type]}
      showClear={!!model}
      onClear={() => {
        setModel(null)
        pop.trigger.current?.focus()
      }}
      panelLabel={pickLabel}
      panel={
        type === 'date' ? (
          <Calendar
            ref={panel}
            value={model}
            min={min}
            max={max}
            disabledDate={disabledDate}
            markers={markers}
            locale={locale}
            calendar={calendar}
            weekStartsOn={weekStartsOn}
            onChange={pick}
          />
        ) : (
          <PeriodPanel ref={panel} type={type} value={model} min={min} max={max} disabledDate={disabledDate} locale={locale} calendar={calendar} onChange={pick} />
        )
      }
    />
  )
}

/* ── DateRangePicker ───────────────────────────────────── */

export interface DateRangePickerProps extends Omit<PickerBase, 'placeholder'>, CalendarBits {
  value?: MlDateRange
  defaultValue?: MlDateRange
  onChange?: (range: MlDateRange) => void
  startPlaceholder?: string
  endPlaceholder?: string
  /** Intl options used to display each end of the range. */
  format?: Intl.DateTimeFormatOptions
  /** Quick picks beside the calendar. Pass [] to hide them. */
  presets?: MlRangePreset[]
  /**
   * Pick days, months or years. For 'month' / 'year' both ends are the first
   * day of their period, and there are no default presets.
   */
  type?: 'date' | 'month' | 'year'
}

const RANGE_FORMAT: Intl.DateTimeFormatOptions = { year: 'numeric', month: '2-digit', day: '2-digit' }

const todayStart = () => startOfDay(new Date())
const defaultPresets = (t: MlLocale): MlRangePreset[] => [
  { label: t.date.today, value: () => [todayStart(), todayStart()] },
  { label: t.date.last7, value: () => [addDays(todayStart(), -6), todayStart()] },
  { label: t.date.last30, value: () => [addDays(todayStart(), -29), todayStart()] },
  {
    label: t.date.thisMonth,
    value: () => {
      const d = todayStart()
      return [new Date(d.getFullYear(), d.getMonth(), 1), new Date(d.getFullYear(), d.getMonth() + 1, 0)]
    },
  },
  {
    label: t.date.lastMonth,
    value: () => {
      const d = todayStart()
      return [new Date(d.getFullYear(), d.getMonth() - 1, 1), new Date(d.getFullYear(), d.getMonth(), 0)]
    },
  },
]

export function DateRangePicker({
  value,
  defaultValue = NO_RANGE,
  onChange,
  startPlaceholder,
  endPlaceholder,
  format,
  presets,
  type = 'date',
  min,
  max,
  disabledDate,
  markers,
  locale,
  calendar,
  weekStartsOn = 0,
  ...base
}: DateRangePickerProps) {
  const loc = useLocale()
  const controlId = base.id ?? `ml-daterange-${cleanId(useId())}`
  const [model, setModel] = useControllable(value, defaultValue, onChange)
  /** The range being picked inside the panel; committed once both ends are set. */
  const [draft, setDraft] = useState<MlDateRange>(NO_RANGE)
  const panel = useRef<FocusHandle>(null)
  const pop = usePopup(base.disabled, () => panel.current?.focus())
  const presetList = presets ?? (type === 'date' ? defaultPresets(loc) : [])
  const fmt = (d: Date | null) =>
    !d
      ? ''
      : type === 'date' || format
        ? new Intl.DateTimeFormat(locale ?? loc.name, withCalendar(format ?? RANGE_FORMAT, calendar)).format(d)
        : formatPeriod(d, type, loc.date.period, calendar === 'roc' ? loc.date.roc : undefined)
  const [a, b] = model
  /** Length of the range in days (or months / years). */
  const days = !a || !b ? 0 : type !== 'date' ? comparePeriods(b, a, type) + 1 : Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / 86_400_000) + 1
  const t = loc.date
  const text =
    type === 'date'
      ? { start: t.rangeStart, end: t.rangeEnd, pick: t.pickRange, clear: t.clearRange, first: t.pickStart, next: t.pickEnd, count: t.days }
      : {
          start: t.period.rangeStart[type],
          end: t.period.rangeEnd[type],
          pick: t.period.pickRange[type],
          clear: t.period.clearRange[type],
          first: t.period.pickStart[type],
          next: t.period.pickEnd,
          count: (n: number) => t.period.count(n, type),
        }
  const onDraft = (r: MlDateRange) => {
    setDraft(r)
    if (r[0] && r[1]) commit(r)
  }

  function commit(range: MlDateRange) {
    setModel(range)
    pop.hide()
  }
  return (
    <PickerFrame
      {...base}
      pop={{
        ...pop,
        show: () => {
          if (base.disabled) return
          setDraft([...model])
          pop.show()
        },
      }}
      controlId={controlId}
      rootClass="ml-daterange"
      affix={dateAffix}
      triggerClass="ml-daterange__trigger"
      trigger={
        <>
          <span className={cx({ 'ml-datepicker__placeholder': !a })}>{fmt(a) || (startPlaceholder ?? text.start)}</span>
          <Icon name="arrowRight" className="ml-daterange__arrow" />
          <span className={cx({ 'ml-datepicker__placeholder': !b })}>{fmt(b) || (endPlaceholder ?? text.end)}</span>
        </>
      }
      after={
        !!days && (
          <span className="ml-daterange__days" aria-hidden="true">
            {text.count(days)}
          </span>
        )
      }
      clearLabel={text.clear}
      showClear={!!(a || b)}
      onClear={() => {
        setModel([null, null])
        pop.trigger.current?.focus()
      }}
      panelLabel={text.pick}
      panelClass="ml-daterange__panel"
      panel={
        <>
          {presetList.length > 0 && (
            <ul className="ml-daterange__presets" aria-label={loc.date.presets}>
              {presetList.map((preset) => (
                <li key={preset.label}>
                  <button type="button" className="ml-daterange__preset" onClick={() => commit(typeof preset.value === 'function' ? preset.value() : preset.value)}>
                    {preset.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="ml-daterange__cal">
            {type === 'date' ? (
              <Calendar
                ref={panel}
                mode="range"
                range={draft}
                min={min}
                max={max}
                disabledDate={disabledDate}
                markers={markers}
                locale={locale}
                calendar={calendar}
                weekStartsOn={weekStartsOn}
                onRangeChange={onDraft}
              />
            ) : (
              <PeriodPanel ref={panel} type={type} mode="range" range={draft} min={min} max={max} disabledDate={disabledDate} locale={locale} calendar={calendar} onRangeChange={onDraft} />
            )}
            <p className="ml-daterange__status" aria-live="polite">
              {draft[0] && !draft[1] ? text.next(fmt(draft[0])) : text.first}
            </p>
          </div>
        </>
      }
    />
  )
}

/* ── TimeColumns (internal wheels) ─────────────────────── */

type Unit = 'h' | 'm' | 's'

interface TimeColumnsProps {
  value: TimeParts | null
  seconds?: boolean
  minuteStep?: number
  secondStep?: number
  /** Inclusive bounds in seconds of the day. */
  min?: number
  max?: number
  onChange: (value: TimeParts) => void
}

const TimeColumns = forwardRef<FocusHandle, TimeColumnsProps>(function TimeColumns({ value, seconds, minuteStep = 1, secondStep = 1, min = 0, max = 86399, onChange }, ref) {
  const loc = useLocale()
  const lists = useRef<(HTMLUListElement | null)[]>([])
  const columns: { unit: Unit; label: string; values: number[] }[] = [
    { unit: 'h', label: loc.date.units.h, values: steps(1, 24) },
    { unit: 'm', label: loc.date.units.m, values: steps(minuteStep, 60) },
  ]
  if (seconds) columns.push({ unit: 's', label: loc.date.units.s, values: steps(secondStep, 60) })

  /** An option is disabled when nothing it could lead to lies inside [min, max]. */
  function disabled(unit: Unit, n: number) {
    let lo: number
    let hi: number
    if (unit === 'h') {
      lo = n * 3600
      hi = lo + 3599
    } else if (unit === 'm') {
      if (!value) return false
      lo = value.h * 3600 + n * 60
      hi = lo + 59
    } else {
      if (!value) return false
      lo = hi = value.h * 3600 + value.m * 60 + n
    }
    return hi < min || lo > max
  }

  function pick(unit: Unit, n: number) {
    if (disabled(unit, n)) return
    const t = { ...(value ?? { h: 0, m: 0, s: 0 }), [unit]: n }
    const sec = Math.min(max, Math.max(min, toSeconds(t)))
    onChange(sec === toSeconds(t) ? t : { h: Math.floor(sec / 3600), m: Math.floor((sec % 3600) / 60), s: sec % 60 })
  }

  function onKeyDown(event: KeyboardEvent, unit: Unit, values: number[]) {
    const current = value ? values.indexOf(value[unit]) : -1
    const enabled = values.map((n, i) => (disabled(unit, n) ? -1 : i)).filter((i) => i >= 0)
    if (!enabled.length) return
    const pos = enabled.indexOf(current)
    const last = enabled.length - 1
    const jumps: Record<string, number> = {
      ArrowDown: pos < 0 ? 0 : Math.min(last, pos + 1),
      ArrowUp: pos < 0 ? 0 : Math.max(0, pos - 1),
      PageDown: pos < 0 ? 0 : Math.min(last, pos + 5),
      PageUp: pos < 0 ? 0 : Math.max(0, pos - 5),
      Home: 0,
      End: last,
    }
    if (!(event.key in jumps)) return
    event.preventDefault()
    pick(unit, values[enabled[jumps[event.key]]])
  }

  // Keep each column's selected value centred.
  const first = useRef(true)
  useEffect(() => {
    for (const list of lists.current) {
      const el = list?.querySelector<HTMLElement>('[aria-selected="true"]')
      if (!list || !el || typeof list.scrollTo !== 'function') continue
      list.scrollTo({ top: el.offsetTop - list.clientHeight / 2 + el.offsetHeight / 2, behavior: first.current ? 'auto' : 'smooth' })
    }
    first.current = false
  }, [value?.h, value?.m, value?.s, seconds])

  useImperativeHandle(ref, () => ({ focus: () => lists.current[0]?.focus() }), [])

  return (
    <div className="ml-time">
      {columns.map((col, c) => (
        <ul
          key={col.unit}
          ref={(el) => void (lists.current[c] = el)}
          className="ml-time__col"
          role="listbox"
          tabIndex={0}
          aria-label={col.label}
          onKeyDown={(e) => onKeyDown(e, col.unit, col.values)}
        >
          {col.values.map((n) => (
            <li
              key={n}
              role="option"
              aria-selected={value?.[col.unit] === n}
              aria-disabled={disabled(col.unit, n) || undefined}
              className={cx('ml-time__cell', { 'ml-time__cell--selected': value?.[col.unit] === n })}
              onClick={() => pick(col.unit, n)}
            >
              {padTime(n)}
            </li>
          ))}
        </ul>
      ))}
    </div>
  )
})

function TimeFooter({ onNow, onConfirm }: { onNow: () => void; onConfirm: () => void }) {
  const loc = useLocale()
  return (
    <div className="ml-timepicker__footer">
      <Button size="sm" variant="ghost" onClick={onNow}>
        {loc.common.now}
      </Button>
      <Button size="sm" onClick={onConfirm}>
        {loc.common.confirm}
      </Button>
    </div>
  )
}

/* ── TimePicker ────────────────────────────────────────── */

export interface TimePickerProps extends PickerBase {
  /** "HH:mm" (or "HH:mm:ss" with `seconds`); null when empty. */
  value?: string | null
  defaultValue?: string | null
  onChange?: (value: string | null) => void
  /** Include a seconds column; the value becomes "HH:mm:ss". */
  seconds?: boolean
  minuteStep?: number
  secondStep?: number
  /** Earliest allowed time, "HH:mm" or "HH:mm:ss". */
  min?: string
  /** Latest allowed time, "HH:mm" or "HH:mm:ss". */
  max?: string
}

export function TimePicker({ value, defaultValue = null, onChange, seconds, minuteStep = 1, secondStep = 1, min, max, placeholder, ...base }: TimePickerProps) {
  const loc = useLocale()
  const controlId = base.id ?? `ml-timepicker-${cleanId(useId())}`
  const [model, setModel] = useControllable(value, defaultValue, onChange)
  const columns = useRef<FocusHandle>(null)
  const pop = usePopup(base.disabled, () => columns.current?.focus())
  const parts = parseTime(model)
  const minT = parseTime(min)
  const maxT = parseTime(max)
  const minSec = minT ? toSeconds(minT) : 0
  const maxSec = maxT ? toSeconds(maxT) : 86399
  const set = (t: TimeParts) => setModel(formatTime(t, seconds))

  function now() {
    const d = new Date()
    const step = (n: number, s: number) => Math.floor(n / s) * s
    const sec = Math.min(maxSec, Math.max(minSec, d.getHours() * 3600 + step(d.getMinutes(), minuteStep) * 60 + (seconds ? step(d.getSeconds(), secondStep) : 0)))
    set({ h: Math.floor(sec / 3600), m: Math.floor((sec % 3600) / 60), s: sec % 60 })
  }

  return (
    <PickerFrame
      {...base}
      pop={pop}
      controlId={controlId}
      rootClass="ml-timepicker"
      affix={
        <span className="ml-input__affix">
          <Icon name="clock" />
        </span>
      }
      triggerClass="ml-timepicker__trigger"
      trigger={model ? <span>{model}</span> : <span className="ml-datepicker__placeholder">{placeholder ?? loc.date.pickTime}</span>}
      clearLabel={loc.date.clearTime}
      showClear={!!model}
      onClear={() => {
        setModel(null)
        pop.trigger.current?.focus()
      }}
      panelLabel={loc.date.pickTime}
      panelClass="ml-timepicker__panel"
      onPanelKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault()
          pop.hide()
        }
      }}
      panel={
        <>
          <TimeColumns ref={columns} value={parts} seconds={seconds} minuteStep={minuteStep} secondStep={secondStep} min={minSec} max={maxSec} onChange={set} />
          <TimeFooter onNow={now} onConfirm={() => pop.hide()} />
        </>
      }
    />
  )
}

/* ── DateTimePicker ────────────────────────────────────── */

export interface DateTimePickerProps extends PickerBase, CalendarBits {
  value?: Date | null
  defaultValue?: Date | null
  onChange?: (value: Date | null) => void
  /** Include a seconds column. */
  seconds?: boolean
  minuteStep?: number
  /** Intl options used to display the chosen moment. */
  format?: Intl.DateTimeFormatOptions
}

export function DateTimePicker({ value, defaultValue = null, onChange, seconds, minuteStep = 1, format, placeholder, min, max, disabledDate, markers, locale, calendar, weekStartsOn = 0, ...base }: DateTimePickerProps) {
  const loc = useLocale()
  const controlId = base.id ?? `ml-datetimepicker-${cleanId(useId())}`
  const [model, setModel] = useControllable(value, defaultValue, onChange)
  const panel = useRef<FocusHandle>(null)
  const pop = usePopup(base.disabled, () => panel.current?.focus())

  const display = model
    ? new Intl.DateTimeFormat(
        locale ?? loc.name,
        withCalendar(
          format ?? { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: seconds ? '2-digit' : undefined, hourCycle: 'h23' },
          calendar,
        ),
      ).format(model)
    : ''
  const parts: TimeParts | null = model ? { h: model.getHours(), m: model.getMinutes(), s: model.getSeconds() } : null
  const secOf = (d: Date) => d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds()
  /** The time-of-day window allowed on the currently chosen day (from min / max). */
  const minSec = min && model && sameDay(min, model) ? secOf(min) : 0
  const maxSec = max && model && sameDay(max, model) ? secOf(max) : 86399
  const clampToBounds = (d: Date) => (min && d < min ? new Date(min) : max && d > max ? new Date(max) : d)

  function onPickDate(date: Date | null) {
    if (!date) return
    const t = parts ?? { h: 0, m: 0, s: 0 }
    setModel(clampToBounds(new Date(date.getFullYear(), date.getMonth(), date.getDate(), t.h, t.m, t.s)))
  }
  function onPickTime(t: TimeParts) {
    const base = model ?? startOfDay(new Date())
    setModel(clampToBounds(new Date(base.getFullYear(), base.getMonth(), base.getDate(), t.h, t.m, seconds ? t.s : 0)))
  }
  function now() {
    const d = new Date()
    d.setMinutes(Math.floor(d.getMinutes() / minuteStep) * minuteStep, seconds ? d.getSeconds() : 0, 0)
    setModel(clampToBounds(d))
  }

  return (
    <PickerFrame
      {...base}
      pop={pop}
      controlId={controlId}
      rootClass="ml-datetimepicker"
      affix={dateAffix}
      trigger={display ? <span>{display}</span> : <span className="ml-datepicker__placeholder">{placeholder ?? loc.date.pickDateTime}</span>}
      clearLabel={loc.date.clearDateTime}
      showClear={!!model}
      onClear={() => {
        setModel(null)
        pop.trigger.current?.focus()
      }}
      panelLabel={loc.date.pickDateTime}
      panelClass="ml-datetimepicker__panel"
      panel={
        <>
          <div className="ml-datetimepicker__body">
            <Calendar
              ref={panel}
              value={model ? startOfDay(model) : null}
              min={min}
              max={max}
              disabledDate={disabledDate}
              markers={markers}
              locale={locale}
              calendar={calendar}
              weekStartsOn={weekStartsOn}
              onChange={onPickDate}
            />
            <div className="ml-datetimepicker__time">
              <p className="ml-datetimepicker__time-label">{parts ? loc.date.time : loc.date.timeFirst}</p>
              <TimeColumns value={parts} seconds={seconds} minuteStep={minuteStep} min={minSec} max={maxSec} onChange={onPickTime} />
            </div>
          </div>
          <TimeFooter onNow={now} onConfirm={() => pop.hide()} />
        </>
      }
    />
  )
}

/* ── ColorPicker ───────────────────────────────────────── */

export interface ColorPickerProps extends PickerBase {
  /** Lower-case hex; null when empty. */
  value?: string | null
  defaultValue?: string | null
  onChange?: (value: string | null) => void
  /** Add an opacity slider; the value may become #rrggbbaa. */
  alpha?: boolean
  /** Quick-pick swatches. */
  presets?: string[]
}

const COLOR_PRESETS = ['#f0ad2f', '#cd7631', '#3eeed0', '#52e38a', '#ff5c48', '#ff8fa8', '#9ea7b5', '#12151c']

export function ColorPicker({ value, defaultValue = null, onChange, alpha, presets = COLOR_PRESETS, placeholder, ...base }: ColorPickerProps) {
  const loc = useLocale()
  const controlId = base.id ?? `ml-colorpicker-${cleanId(useId())}`
  const [model, setModel] = useControllable(value, defaultValue, onChange)
  const area = useRef<HTMLDivElement>(null)
  const pop = usePopup(base.disabled, () => area.current?.focus())
  // Working colour in HSV, so hue survives when saturation or value hit 0.
  const [hsva, setHsva] = useState<HSVA>(() => hexToHsva(model) ?? { h: 38, s: 0.8, v: 0.94, a: 1 })
  const [hexInput, setHexInput] = useState(model ?? '')
  const dragging = useRef(false)

  useEffect(() => {
    const parsed = hexToHsva(model)
    // Keep the old hue for greys, where it isn't recoverable from hex.
    if (parsed) setHsva((cur) => (hsvaToHex(parsed, alpha) !== hsvaToHex(cur, alpha) ? (parsed.s === 0 ? { ...parsed, h: cur.h } : parsed) : cur))
    setHexInput(model ?? '')
  }, [model])

  function commit(next: HSVA) {
    setHsva(next)
    setModel(hsvaToHex(next, alpha))
  }
  const pureHue = hsvaToHex({ h: hsva.h, s: 1, v: 1, a: 1 })
  const solid = hsvaToHex({ ...hsva, a: 1 })
  const swatch = model ?? 'transparent'
  const valid = !!parseHex(model)

  function fromPointer(event: ReactPointerEvent) {
    const rect = area.current!.getBoundingClientRect()
    const s = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width))
    const v = Math.min(1, Math.max(0, 1 - (event.clientY - rect.top) / rect.height))
    commit({ ...hsva, s, v })
  }
  function onAreaDown(event: ReactPointerEvent) {
    dragging.current = true
    area.current?.setPointerCapture?.(event.pointerId)
    area.current?.focus()
    fromPointer(event)
  }
  function onAreaKey(event: KeyboardEvent) {
    const d = event.shiftKey ? 0.1 : 0.01
    const { s, v } = hsva
    const moves: Record<string, [number, number]> = { ArrowLeft: [s - d, v], ArrowRight: [s + d, v], ArrowUp: [s, v + d], ArrowDown: [s, v - d] }
    const m = moves[event.key]
    if (!m) return
    event.preventDefault()
    commit({ ...hsva, s: Math.min(1, Math.max(0, m[0])), v: Math.min(1, Math.max(0, m[1])) })
  }
  function onHexChange() {
    const raw = hexInput.trim()
    if (!raw && base.clearable) return setModel(null)
    const parsed = hexToHsva(raw.startsWith('#') ? raw : `#${raw}`)
    if (parsed) commit(alpha ? parsed : { ...parsed, a: 1 })
    else setHexInput(model ?? '')
  }
  const endDrag = () => void (dragging.current = false)

  return (
    <PickerFrame
      {...base}
      pop={pop}
      controlId={controlId}
      rootClass="ml-colorpicker"
      affix={<span className="ml-colorpicker__chip" style={{ '--_c': swatch } as CSSProperties} aria-hidden="true" />}
      triggerClass="ml-colorpicker__trigger"
      trigger={valid ? <span>{model}</span> : <span className="ml-datepicker__placeholder">{placeholder ?? loc.color.pick}</span>}
      clearLabel={loc.color.clear}
      showClear={!!model}
      onClear={() => {
        setModel(null)
        pop.trigger.current?.focus()
      }}
      panelLabel={loc.color.pick}
      panelClass="ml-colorpicker__panel"
      panel={
        <>
          <div
            ref={area}
            className="ml-colorpicker__area"
            role="slider"
            tabIndex={0}
            aria-label={loc.color.area}
            aria-valuetext={loc.color.areaValue(Math.round(hsva.s * 100), Math.round(hsva.v * 100))}
            aria-valuenow={Math.round(hsva.s * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
            style={{ '--_hue': pureHue } as CSSProperties}
            onPointerDown={onAreaDown}
            onPointerMove={(e) => dragging.current && fromPointer(e)}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onKeyDown={onAreaKey}
          >
            <span className="ml-colorpicker__handle" style={{ left: `${hsva.s * 100}%`, top: `${(1 - hsva.v) * 100}%`, '--_c': solid } as CSSProperties} />
          </div>
          <label className="ml-colorpicker__slider ml-colorpicker__slider--hue">
            <span className="ml-visually-hidden">{loc.color.hue}</span>
            <input type="range" min="0" max="359" value={Math.round(hsva.h)} onChange={(e) => commit({ ...hsva, h: Number(e.target.value) })} />
          </label>
          {alpha && (
            <label className="ml-colorpicker__slider ml-colorpicker__slider--alpha" style={{ '--_c': solid } as CSSProperties}>
              <span className="ml-visually-hidden">{loc.color.alpha}</span>
              <input type="range" min="0" max="100" value={Math.round(hsva.a * 100)} onChange={(e) => commit({ ...hsva, a: Number(e.target.value) / 100 })} />
            </label>
          )}
          <div className="ml-colorpicker__row">
            <span className="ml-colorpicker__preview" style={{ '--_c': swatch } as CSSProperties} aria-hidden="true" />
            <label className="ml-colorpicker__hex">
              <span className="ml-visually-hidden">{loc.color.hex}</span>
              <input
                type="text"
                spellCheck={false}
                maxLength={9}
                value={hexInput}
                onChange={(e) => setHexInput(e.target.value)}
                onBlur={onHexChange}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') return
                  e.preventDefault()
                  onHexChange()
                }}
              />
            </label>
          </div>
          {presets.length > 0 && (
            <div className="ml-colorpicker__presets" role="group" aria-label={loc.color.presets}>
              {presets.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={cx('ml-colorpicker__preset', { 'ml-colorpicker__preset--on': model === c.toLowerCase() })}
                  style={{ '--_c': c } as CSSProperties}
                  aria-label={c}
                  aria-pressed={model === c.toLowerCase()}
                  onClick={() => {
                    const parsed = hexToHsva(c)
                    if (parsed) commit(parsed)
                  }}
                />
              ))}
            </div>
          )}
        </>
      }
    />
  )
}

/* ── Upload ────────────────────────────────────────────── */

export interface UploadProps {
  value?: MlUploadFile[]
  defaultValue?: MlUploadFile[]
  onChange?: (files: MlUploadFile[]) => void
  /** Same syntax as <input accept>: ".png,.pdf", "image/*"… */
  accept?: string
  multiple?: boolean
  /** Bytes. Larger files are rejected. */
  maxSize?: number
  /** Most files kept. Extra ones are rejected with 'count'; the picture wall hides its add tile when full. */
  maxCount?: number
  disabled?: boolean
  title?: ReactNode
  hint?: ReactNode
  /** 'picture': a wall of thumbnail cards that can be previewed and reordered. */
  listType?: MlUploadListType
  /** Card width / height in picture mode. */
  aspect?: number
  onReject?: (file: File, reason: MlUploadRejectReason) => void
  className?: string
}

const NO_FILES: MlUploadFile[] = []

/** A file row that slides in when it's added after the list first rendered. */
function FileRow({ animate, children }: { animate: boolean; children: ReactNode }) {
  const [phase, setPhase] = useState(animate ? 'ml-upload-file-enter-from ml-upload-file-enter-active' : '')
  useEffect(() => {
    if (!animate) return
    let raf = requestAnimationFrame(() => (raf = requestAnimationFrame(() => setPhase('ml-upload-file-enter-active ml-upload-file-enter-to'))))
    const timer = setTimeout(() => setPhase(''), 480)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(timer)
    }
  }, [])
  return <li className={cx('ml-upload__file', phase)}>{children}</li>
}

export function Upload({
  value,
  defaultValue = NO_FILES,
  onChange,
  accept,
  multiple = true,
  maxSize,
  maxCount,
  disabled,
  title,
  hint,
  listType = 'text',
  aspect = 1,
  onReject,
  className,
}: UploadProps) {
  const loc = useLocale()
  const uid = cleanId(useId())
  const inputId = `ml-upload-${uid}`
  const hintId = `ml-upload-${uid}-reorder`
  const [files, setFiles] = useControllable(value, defaultValue, onChange)
  const [dragging, setDragging] = useState(false)
  const dragDepth = useRef(0)
  const root = useRef<HTMLDivElement>(null)
  const picture = listType === 'picture'
  const canAdd = canAddMore(files.length, maxCount)
  // Stable per-file keys; files keyed after the first render animate in.
  const keys = useRef({ map: new WeakMap<File, number>(), next: 0, settled: -1 })
  const fileKey = (file: File) => {
    let key = keys.current.map.get(file)
    if (key === undefined) keys.current.map.set(file, (key = keys.current.next++))
    return key
  }
  useEffect(() => {
    if (keys.current.settled < 0) keys.current.settled = keys.current.next
  }, [])

  function add(list: FileList | File[] | null | undefined) {
    if (!list || disabled) return
    const { next, rejected } = addFiles(files, Array.from(list), { accept, maxSize, maxCount, multiple })
    for (const [file, reason] of rejected) onReject?.(file, reason)
    if (next) setFiles(next)
  }
  const remove = (index: number) => setFiles(files.filter((_, j) => j !== index))

  const dropHandlers = {
    onDragEnter: (e: DragEvent<HTMLElement>) => {
      e.preventDefault()
      dragDepth.current++
      setDragging(!disabled)
    },
    onDragOver: (e: DragEvent<HTMLElement>) => e.preventDefault(),
    onDragLeave: () => {
      dragDepth.current = Math.max(0, dragDepth.current - 1)
      if (!dragDepth.current) setDragging(false)
    },
    onDrop: (e: DragEvent<HTMLElement>) => {
      e.preventDefault()
      dragDepth.current = 0
      setDragging(false)
      add(e.dataTransfer?.files)
    },
  }

  /* ── Picture wall ── */

  // Object URLs are made in an effect (never during SSR) and revoked when their file leaves.
  const [thumbStore] = useState(createThumbStore)
  const [thumbs, setThumbs] = useState(() => new Map<File, string>())
  useEffect(() => {
    if (thumbStore.sync(picture ? files : NO_FILES)) setThumbs(new Map(thumbStore.urls))
  }, [files, picture, thumbStore])
  useEffect(() => () => thumbStore.clear(), [thumbStore])

  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewIndex, setPreviewIndex] = useState(0)
  const previewable = files.filter((file) => thumbs.has(file))
  const openPreview = (file: File) => {
    setPreviewIndex(Math.max(0, previewable.indexOf(file)))
    setPreviewOpen(true)
  }

  const [announce, setAnnounce] = useState('')
  const refocus = useRef(-1)
  function move(from: number, to: number, focus: boolean) {
    if (from === to) return
    setFiles(moveItem(files, from, to))
    setAnnounce(loc.upload.moved(to + 1))
    if (focus) refocus.current = to
  }
  useEffect(() => {
    if (refocus.current < 0) return
    root.current?.querySelectorAll<HTMLElement>('.ml-upload__card')[refocus.current]?.focus()
    refocus.current = -1
  }, [files])

  function onCardKeydown(e: KeyboardEvent<HTMLLIElement>, index: number) {
    if (!e.altKey || disabled) return
    const to = reorderKey(e.key, index, files.length)
    if (to === null) return
    e.preventDefault()
    move(index, to, true)
  }

  // Drag a card onto another to reorder. The pressed card follows the pointer.
  const press = useRef<{ index: number; x: number; y: number } | null>(null)
  const [drag, setDrag] = useState<{ from: number; over: number; dx: number; dy: number } | null>(null)
  function onCardPointerDown(e: ReactPointerEvent<HTMLLIElement>, index: number) {
    if (disabled || e.button !== 0 || (e.target as Element).closest('button')) return
    press.current = { index, x: e.clientX, y: e.clientY }
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }
  function onCardPointerMove(e: ReactPointerEvent<HTMLLIElement>) {
    const start = press.current
    if (!start) return
    const dx = e.clientX - start.x
    const dy = e.clientY - start.y
    if (!drag && Math.hypot(dx, dy) < CARD_DRAG_THRESHOLD) return
    const over = cardIndexAt(root.current, e.clientX, e.clientY, start.index)
    // Off every other card (a gap, or back home) means "drop nowhere".
    setDrag({ from: start.index, over: over < 0 ? start.index : over, dx, dy })
  }
  function onCardPointerUp() {
    press.current = null
    setDrag(null)
    if (drag) move(drag.from, drag.over, false)
  }

  return (
    <div
      ref={root}
      className={cx('ml-upload', className, { 'ml-upload--picture': picture, 'ml-upload--dragging': dragging, 'ml-upload--disabled': disabled })}
      style={picture ? ({ '--ml-upload-aspect': aspect } as CSSProperties) : undefined}
    >
      {picture ? (
        <>
          <div className="ml-upload__wall">
            {files.length > 0 && (
              <ul role="list" className="ml-upload__cards" aria-label={loc.upload.files}>
                {files.map((file, i) => {
                  const state = uploadState(file)
                  const thumb = thumbs.get(file)
                  return (
                    <li
                      key={fileKey(file)}
                      role="listitem"
                      className={cx('ml-upload__card', state.status && `ml-upload__card--${state.status}`, {
                        'ml-upload__card--dragging': drag?.from === i,
                        'ml-upload__card--over': !!drag && drag.from !== i && drag.over === i,
                      })}
                      style={drag?.from === i ? { translate: `${drag.dx}px ${drag.dy}px` } : undefined}
                      data-index={i}
                      tabIndex={disabled ? undefined : 0}
                      aria-label={file.name}
                      aria-describedby={disabled ? undefined : hintId}
                      onKeyDown={(e) => onCardKeydown(e, i)}
                      onPointerDown={(e) => onCardPointerDown(e, i)}
                      onPointerMove={onCardPointerMove}
                      onPointerUp={onCardPointerUp}
                      onPointerCancel={onCardPointerUp}
                    >
                      {thumb ? (
                        <img src={thumb} alt="" className="ml-upload__thumb" draggable={false} />
                      ) : (
                        <span className="ml-upload__doc">
                          <Icon name="file" className="ml-upload__doc-icon" />
                          <span className="ml-upload__doc-name">{file.name}</span>
                        </span>
                      )}
                      {state.status === 'uploading' ? (
                        <span
                          className="ml-upload__overlay ml-upload__overlay--progress"
                          role="progressbar"
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={state.percent}
                          aria-label={loc.upload.uploading(file.name, state.percent)}
                        >
                          <span className="ml-upload__percent">{state.percent}%</span>
                          <span className="ml-upload__bar">
                            <span className="ml-upload__bar-fill" style={{ width: `${state.percent}%` }} />
                          </span>
                        </span>
                      ) : state.status === 'error' ? (
                        <span className="ml-upload__overlay ml-upload__overlay--error">
                          <Icon name="danger" className="ml-upload__error-icon" />
                          <span className="ml-upload__error">{state.error || loc.upload.failed}</span>
                        </span>
                      ) : null}
                      <span className="ml-upload__actions">
                        {thumb && (
                          <button type="button" className="ml-upload__action ml-upload__preview" aria-label={loc.upload.preview(file.name)} onClick={() => openPreview(file)}>
                            <Icon name="eye" />
                          </button>
                        )}
                        <button type="button" className="ml-upload__action ml-upload__remove" aria-label={loc.common.remove(file.name)} onClick={() => remove(i)}>
                          <Icon name="close" />
                        </button>
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
            {canAdd && (
              <label htmlFor={inputId} className="ml-upload__add" {...dropHandlers}>
                <Icon name="plus" className="ml-upload__add-icon" />
                <span className="ml-upload__add-text">{title ?? loc.upload.add}</span>
              </label>
            )}
          </div>
          {hint && <span className="ml-upload__hint">{hint}</span>}
          <span id={hintId} className="ml-visually-hidden">
            {loc.upload.reorderHint}
          </span>
          <span className="ml-visually-hidden" aria-live="polite">
            {announce}
          </span>
        </>
      ) : (
        <label htmlFor={inputId} className="ml-upload__zone" {...dropHandlers}>
          <Icon name="upload" className="ml-upload__icon" />
          <span className="ml-upload__title">{title ?? loc.upload.title}</span>
          <span className="ml-upload__sub">
            {loc.upload.or}
            <u>{loc.upload.browse}</u>
          </span>
          {hint && <span className="ml-upload__hint">{hint}</span>}
        </label>
      )}
      <input
        id={inputId}
        type="file"
        className="ml-visually-hidden ml-upload__input"
        accept={accept}
        multiple={multiple}
        disabled={disabled || (picture && !canAdd)}
        onChange={(e) => {
          add(e.target.files)
          e.target.value = '' // allow picking the same file again
        }}
      />
      {!picture && files.length > 0 && (
        <ul className="ml-upload__list">
          {files.map((file, i) => {
            const key = fileKey(file)
            return (
              <FileRow key={key} animate={keys.current.settled >= 0 && key >= keys.current.settled}>
                <Paw tone="current" className="ml-upload__paw" />
                <span className="ml-upload__name">{file.name}</span>
                <span className="ml-upload__size">{formatSize(file.size)}</span>
                <button type="button" className="ml-upload__remove" aria-label={loc.common.remove(file.name)} onClick={() => remove(i)}>
                  <Icon name="close" />
                </button>
              </FileRow>
            )
          })}
        </ul>
      )}
      {picture && (
        <ImagePreview
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          index={previewIndex}
          onIndexChange={setPreviewIndex}
          images={previewable.map((file) => thumbs.get(file)!)}
          alts={previewable.map((file) => file.name)}
        />
      )}
    </div>
  )
}
