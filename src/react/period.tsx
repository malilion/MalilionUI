// Internal: the month / quarter / year grid behind DatePicker / DateRangePicker `type`.
// Twin of src/components/MlPeriodPanel.vue — not re-exported from the React entry.
import { forwardRef, useEffect, useId, useImperativeHandle, useRef, useState, type KeyboardEvent } from 'react'
import {
  addPeriods,
  comparePeriods,
  formatDecade,
  formatPeriod,
  periodColumns,
  periodDisabled,
  periodGrid,
  periodKey,
  periodPage,
  periodStart,
  quarterOf,
  samePeriod,
  withCalendar,
  yearCellText,
  type MlCalendarSystem,
  type PeriodType,
} from '../components/dates'
import type { MlDateRange } from '../types'
import { Icon } from './basic'
import { useLocale } from './locale'
import { cx, useControllable } from './utils'

const NO_RANGE: MlDateRange = [null, null]
const PER_PAGE: Record<PeriodType, number> = { month: 12, quarter: 4, year: 10 }

export interface PeriodPanelProps {
  type: PeriodType
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
  /** Called with each period's first day. */
  disabledDate?: (date: Date) => boolean
  locale?: string
  /** 'roc' numbers the years 民國 (115) instead of Gregorian (2026). */
  calendar?: MlCalendarSystem
}

export const PeriodPanel = forwardRef<{ focus(): void }, PeriodPanelProps>(function PeriodPanel(
  { type, mode = 'single', value, defaultValue = null, onChange, range, defaultRange = NO_RANGE, onRangeChange, min, max, disabledDate, locale, calendar },
  ref,
) {
  const loc = useLocale()
  const [model, setModel] = useControllable(value, defaultValue, onChange)
  const [rng, setRange] = useControllable(range, defaultRange, onRangeChange)
  const [now] = useState(() => new Date())
  const anchor = mode === 'range' ? rng[0] : model
  /** Year shown (month / quarter panels) or first year of the decade (year panel). */
  const [page, setPage] = useState(() => periodPage(anchor ?? now, type, calendar))
  /** The period that owns the roving tabindex. */
  const [focused, setFocused] = useState(() => periodStart(anchor ?? now, type))
  const [hovered, setHovered] = useState<Date | null>(null)
  /** Direction of the last page change, so the new grid slides in from that side. */
  const [slide, setSlide] = useState<'next' | 'prev' | null>(null)
  const grid = useRef<HTMLTableElement>(null)
  const pendingFocus = useRef(false)
  const titleId = `ml-period-${useId().replace(/[^\w-]/g, '')}`

  const cols = periodColumns(type)
  const cells = periodGrid(type, page)
  const rows = Array.from({ length: cells.length / cols }, (_, r) => cells.slice(r * cols, r * cols + cols))
  const perPage = PER_PAGE[type]
  const lang = locale ?? loc.name
  const t = loc.date.period
  const roc = calendar === 'roc' ? loc.date.roc : undefined
  const title = type === 'year' ? formatDecade(page, t, roc) : formatPeriod(new Date(page, 0, 1), 'year', t, roc)
  const prevLabel = type === 'year' ? loc.calendar.prevDecade : loc.calendar.prevYear
  const nextLabel = type === 'year' ? loc.calendar.nextDecade : loc.calendar.nextYear
  const shortMonth = new Intl.DateTimeFormat(lang, { month: 'short' })
  const longMonth = new Intl.DateTimeFormat(lang, withCalendar({ year: 'numeric', month: 'long' }, calendar))

  const cellText = (d: Date) =>
    type === 'month' ? shortMonth.format(d) : type === 'quarter' ? t.quarterCell(quarterOf(d)) : yearCellText(d.getFullYear(), calendar)
  const cellLabel = (d: Date) => (type === 'month' ? longMonth.format(d) : formatPeriod(d, type, t, roc))
  const isOutside = (d: Date) => type === 'year' && periodPage(d, 'year', calendar) !== page
  const isCurrent = (d: Date) => samePeriod(d, now, type)
  const isDisabled = (d: Date) => periodDisabled(d, type, min, max, disabledDate)
  const isSelected = (d: Date) => (mode === 'single' ? samePeriod(d, model, type) : samePeriod(d, rng[0], type) || samePeriod(d, rng[1], type))
  /** Between the range ends — or, while picking the end, between start and the hovered period. */
  const inRange = (d: Date) => {
    if (mode !== 'range') return false
    const [start, end] = rng
    const other = end ?? (start ? hovered : null)
    if (!start || !other) return false
    const [lo, hi] = comparePeriods(start, other, type) <= 0 ? [start, other] : [other, start]
    return comparePeriods(d, lo, type) > 0 && comparePeriods(d, hi, type) < 0
  }

  function setView(d: Date) {
    const next = periodPage(d, type, calendar)
    if (next !== page) setSlide(next > page ? 'next' : 'prev')
    setPage(next)
  }

  function select(d: Date) {
    if (isDisabled(d)) return
    setFocused(d)
    if (isOutside(d)) setView(d)
    if (mode === 'single') return setModel(d)
    const [start, end] = rng
    if (!start || end) setRange([d, null])
    else setRange(comparePeriods(d, start, type) < 0 ? [d, periodStart(start, type)] : [periodStart(start, type), d])
  }

  function shiftPage(delta: number) {
    const target = addPeriods(focused, type, delta * perPage)
    setView(target)
    setFocused(target)
  }

  function moveFocus(d: Date) {
    pendingFocus.current = true
    setFocused(d)
    if (periodPage(d, type, calendar) !== page) setView(d)
  }

  useEffect(() => {
    if (!pendingFocus.current) return
    pendingFocus.current = false
    grid.current?.querySelector<HTMLElement>(`[data-period="${periodKey(focused, type)}"]`)?.focus()
  })

  /** Move keyboard focus into the grid (used by the pickers when they open). */
  useImperativeHandle(ref, () => ({ focus: () => moveFocus(new Date(focused)) }), [focused, page])

  // Follow value changes made from outside.
  const anchorKey = anchor ? periodKey(anchor, type) : ''
  useEffect(() => {
    if (anchor && !samePeriod(anchor, focused, type)) {
      setFocused(periodStart(anchor, type))
      setView(anchor)
    }
  }, [anchorKey])

  function onKeyDown(event: KeyboardEvent) {
    const d = focused
    const at = (n: number) => addPeriods(d, type, n)
    // Position in the row: the year panel starts one year before its decade.
    const index = type === 'year' ? d.getFullYear() - page + 1 : comparePeriods(d, new Date(page, 0, 1), type)
    const col = index % cols
    const moves: Record<string, () => Date> = {
      ArrowLeft: () => at(-1),
      ArrowRight: () => at(1),
      ArrowUp: () => at(-cols),
      ArrowDown: () => at(cols),
      PageUp: () => at(-perPage),
      PageDown: () => at(perPage),
      Home: () => at(-col),
      End: () => at(cols - 1 - col),
    }
    if (moves[event.key]) {
      event.preventDefault()
      // Disabled cells can't take focus: skip past them, or stay put at the edge of min / max.
      let next = moves[event.key]()
      const dir = comparePeriods(next, d, type) < 0 ? -1 : 1
      for (let i = 0; isDisabled(next) && i < perPage; i++) next = addPeriods(next, type, dir)
      if (!isDisabled(next)) moveFocus(next)
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      select(d)
    }
  }

  return (
    <div className={cx('ml-calendar', `ml-calendar--${mode}`, 'ml-calendar--period', `ml-calendar--${type}`)}>
      <div className="ml-calendar__head">
        <button type="button" className="ml-calendar__nav" aria-label={prevLabel} onClick={() => shiftPage(-1)}>
          <Icon name="chevronLeft" />
        </button>
        <span id={titleId} className="ml-calendar__title" aria-live="polite">
          {title}
        </span>
        <button type="button" className="ml-calendar__nav" aria-label={nextLabel} onClick={() => shiftPage(1)}>
          <Icon name="chevronRight" />
        </button>
      </div>
      <table ref={grid} className="ml-calendar__grid ml-calendar__grid--period" role="grid" aria-labelledby={titleId} onKeyDown={onKeyDown}>
        <tbody key={`${type}-${page}`} className={cx('ml-calendar__body', slide && `ml-calendar__body--${slide}`)}>
          {rows.map((row, r) => (
            <tr key={r}>
              {row.map((d) => (
                <td
                  key={periodKey(d, type)}
                  className={cx({
                    'ml-calendar__cell--range': inRange(d),
                    'ml-calendar__cell--start': mode === 'range' && samePeriod(d, rng[0], type) && !!(rng[1] || hovered),
                    'ml-calendar__cell--end': mode === 'range' && samePeriod(d, rng[1], type),
                  })}
                  aria-selected={isSelected(d)}
                  role="gridcell"
                >
                  <button
                    type="button"
                    data-period={periodKey(d, type)}
                    tabIndex={samePeriod(d, focused, type) ? 0 : -1}
                    disabled={isDisabled(d)}
                    aria-label={cellLabel(d)}
                    aria-current={isCurrent(d) ? 'date' : undefined}
                    className={cx('ml-calendar__period', {
                      'ml-calendar__period--outside': isOutside(d),
                      'ml-calendar__period--today': isCurrent(d),
                      'ml-calendar__period--selected': isSelected(d),
                    })}
                    onClick={() => select(d)}
                    onMouseEnter={() => setHovered(d)}
                    onMouseLeave={() => setHovered(null)}
                  >
                    {cellText(d)}
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
