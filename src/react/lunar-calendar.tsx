import { forwardRef, useEffect, useId, useImperativeHandle, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { addDays, addMonths, dayKey, sameDay, startOfDay } from '../components/dates'
import { lunarCells, lunarDayParts, lunarYearsOf, type LunarCell, type MlLunarHolidays } from '../components/lunar-calendar'
import { Icon } from './basic'
import { useLocale } from './locale'
import { cx, useControllable } from './utils'

export {
  toLunar,
  fromLunar,
  lunarDayName,
  lunarMonthName,
  lunarLeapMonth,
  lunarMonthDays,
  ganZhiYear,
  zodiacIndex,
  solarTerms,
  solarTermOn,
  twHolidays,
  twOfficialDays,
  TW_OFFICIAL_YEARS,
  TW_HOLIDAY_VERIFIED_FROM,
  SOLAR_TERMS,
  ZODIAC,
  ZODIAC_EN,
  HEAVENLY_STEMS,
  EARTHLY_BRANCHES,
  LUNAR_MIN_YEAR,
  LUNAR_MAX_YEAR,
  TW_HOLIDAY_ACT_DATE,
} from '../tw-calendar'
export type { LunarDate, SolarTerm, SolarTermName, TwHoliday, TwHolidayOptions, TwOfficialDay } from '../tw-calendar'
export { lunarHolidayMap } from '../components/lunar-calendar'
export type { MlLunarHoliday, MlLunarHolidays, LunarCell, LunarDayInfo } from '../components/lunar-calendar'

export interface LunarCalendarHandle {
  /** Move keyboard focus into the grid. */
  focus(): void
}

export interface LunarCalendarProps {
  value?: Date | null
  defaultValue?: Date | null
  onChange?: (date: Date | null) => void
  /** A day was picked, with its lunar / holiday info. */
  onSelect?: (date: Date, cell: LunarCell) => void
  onMonthChange?: (year: number, month: number) => void
  min?: Date
  max?: Date
  disabledDate?: (date: Date) => boolean
  /** Intl locale for the month title and weekdays. Default: the active locale. */
  locale?: string
  /** 0 = Sunday, 1 = Monday. */
  weekStartsOn?: 0 | 1
  /** Which day is "today" (fixed in tests and screenshots). Default: now. */
  today?: Date
  /** 農曆 day under each date (初一 shows the month). Default true. */
  showLunar?: boolean
  /** 節氣 names. Default true. */
  showSolarTerms?: boolean
  /** Holiday names and day-off colours. Default true. */
  showHolidays?: boolean
  /** The built-in statutory list (twHolidays). Default true. */
  builtinHolidays?: boolean
  /** Apply the official 人事行政總處 calendar (補假, 調整放假, 補行上班) for the years shipped (2024–2027). Default true. */
  official?: boolean
  /** Built-in named days that aren't days off (元宵、中元、母親節…). Default true. */
  observances?: boolean
  /** Extra / overriding days, e.g. 人事行政總處's 補假 and 調整放假. */
  holidays?: MlLunarHolidays
  className?: string
}

export const LunarCalendar = forwardRef<LunarCalendarHandle, LunarCalendarProps>(function LunarCalendar(
  {
    value,
    defaultValue = null,
    onChange,
    onSelect,
    onMonthChange,
    min,
    max,
    disabledDate,
    locale,
    weekStartsOn = 0,
    today: todayProp,
    showLunar = true,
    showSolarTerms = true,
    showHolidays = true,
    builtinHolidays = true,
    official = true,
    observances = true,
    holidays,
    className,
  },
  ref,
) {
  const loc = useLocale()
  const [model, setModel] = useControllable<Date | null>(value, defaultValue, onChange)
  const [nowDay] = useState(() => startOfDay(new Date()))
  const today = todayProp ? startOfDay(todayProp) : nowDay
  const [view, setViewState] = useState(() => {
    const d = model ?? today
    return { year: d.getFullYear(), month: d.getMonth() }
  })
  const [focused, setFocused] = useState(() => startOfDay(model ?? today))
  const [slide, setSlide] = useState<'next' | 'prev' | null>(null)
  const grid = useRef<HTMLTableElement>(null)
  const pendingFocus = useRef(false)
  const titleId = `ml-lunar-cal-${useId().replace(/[^\w-]/g, '')}`

  const cells = useMemo(
    () => lunarCells(view.year, view.month, { weekStartsOn, showLunar, showSolarTerms, showHolidays, builtinHolidays, official, observances, holidays }),
    [view.year, view.month, weekStartsOn, showLunar, showSolarTerms, showHolidays, builtinHolidays, official, observances, holidays],
  )
  const weeks = Array.from({ length: 6 }, (_, w) => cells.slice(w * 7, w * 7 + 7))
  const lang = locale ?? loc.name
  const isZh = lang.toLowerCase().startsWith('zh')
  const dayFmt = new Intl.DateTimeFormat(lang, { weekday: isZh ? 'narrow' : 'short' })
  // 2023-01-01 was a Sunday.
  const weekdays = Array.from({ length: 7 }, (_, i) => {
    const day = (i + weekStartsOn) % 7
    return { text: dayFmt.format(new Date(2023, 0, 1 + day)), weekend: day === 0 || day === 6 }
  })
  const title = new Intl.DateTimeFormat(lang, { year: 'numeric', month: 'long' }).format(new Date(view.year, view.month, 1))
  const lunarYear = lunarYearsOf(view.year, view.month)
    .map((l) => loc.lunar.year(l.ganZhi, l.zodiacIndex))
    .join(' / ')
  const fullFmt = new Intl.DateTimeFormat(lang, { dateStyle: 'full' })
  const dayLabel = (cell: LunarCell) => {
    const { lunar, names } = lunarDayParts(cell, showSolarTerms)
    return lunar || names.length
      ? `${fullFmt.format(cell.date)}, ${loc.lunar.day(lunar, names, showHolidays && cell.info.off, showHolidays && cell.info.workday)}`
      : fullFmt.format(cell.date)
  }

  const isDisabled = (d: Date) => {
    if (min && d < startOfDay(min)) return true
    if (max && d > startOfDay(max)) return true
    return disabledDate?.(d) ?? false
  }

  function setView(d: Date) {
    const delta = d.getFullYear() * 12 + d.getMonth() - (view.year * 12 + view.month)
    if (delta) setSlide(delta > 0 ? 'next' : 'prev')
    setViewState({ year: d.getFullYear(), month: d.getMonth() })
    onMonthChange?.(d.getFullYear(), d.getMonth())
  }
  const outsideView = (d: Date) => d.getMonth() !== view.month || d.getFullYear() !== view.year

  function select(cell: LunarCell) {
    const d = cell.date
    if (isDisabled(d)) return
    setFocused(d)
    if (d.getMonth() !== view.month) setView(d)
    setModel(d)
    onSelect?.(d, cell)
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

  useImperativeHandle(ref, () => ({ focus: () => moveFocus(new Date(focused)) }), [focused, view])

  // Follow value changes made from outside.
  const modelKey = model ? dayKey(model) : ''
  useEffect(() => {
    if (model && !sameDay(model, focused)) {
      setFocused(startOfDay(model))
      if (outsideView(model)) setView(model)
    }
  }, [modelKey])

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
      const cell = cells.find((c) => sameDay(c.date, d))
      if (cell) select(cell)
    }
  }

  return (
    <div className={cx('ml-lunar-cal', className)}>
      <div className="ml-lunar-cal__head">
        <button type="button" className="ml-lunar-cal__nav" aria-label={loc.calendar.prevMonth} onClick={() => shiftMonth(-1)}>
          <Icon name="chevronLeft" />
        </button>
        <div className="ml-lunar-cal__heading">
          <span id={titleId} className="ml-lunar-cal__title" aria-live="polite">
            {title}
          </span>
          {lunarYear && <span className="ml-lunar-cal__year">{lunarYear}</span>}
        </div>
        <button type="button" className="ml-lunar-cal__nav" aria-label={loc.calendar.nextMonth} onClick={() => shiftMonth(1)}>
          <Icon name="chevronRight" />
        </button>
      </div>
      <table ref={grid} className="ml-lunar-cal__grid" role="grid" aria-labelledby={titleId} onKeyDown={onKeyDown}>
        <thead>
          <tr>
            {weekdays.map((w) => (
              <th key={w.text} scope="col" className={cx('ml-lunar-cal__weekday', { 'ml-lunar-cal__weekday--weekend': w.weekend })}>
                {w.text}
              </th>
            ))}
          </tr>
        </thead>
        <tbody key={`${view.year}-${view.month}`} className={cx('ml-lunar-cal__body', slide && `ml-lunar-cal__body--${slide}`)}>
          {weeks.map((week, w) => (
            <tr key={w}>
              {week.map((c) => (
                <td key={c.key} role="gridcell" aria-selected={sameDay(c.date, model)}>
                  <button
                    type="button"
                    data-day={c.key}
                    tabIndex={sameDay(c.date, focused) ? 0 : -1}
                    disabled={isDisabled(c.date)}
                    aria-label={dayLabel(c)}
                    aria-current={sameDay(c.date, today) ? 'date' : undefined}
                    className={cx('ml-lunar-cal__day', {
                      'ml-lunar-cal__day--outside': c.date.getMonth() !== view.month,
                      'ml-lunar-cal__day--today': sameDay(c.date, today),
                      'ml-lunar-cal__day--selected': sameDay(c.date, model),
                      'ml-lunar-cal__day--weekend': c.weekend,
                      'ml-lunar-cal__day--off': showHolidays && c.info.off,
                      'ml-lunar-cal__day--workday': showHolidays && c.info.workday,
                    })}
                    onClick={() => select(c)}
                  >
                    <span className="ml-lunar-cal__num">{c.date.getDate()}</span>
                    {c.label && (
                      <span
                        className={cx('ml-lunar-cal__label', `ml-lunar-cal__label--${c.labelKind}`, {
                          'ml-lunar-cal__label--off': c.labelKind === 'holiday' && c.info.off,
                        })}
                        aria-hidden="true"
                      >
                        {c.label}
                      </span>
                    )}
                  </button>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
})
