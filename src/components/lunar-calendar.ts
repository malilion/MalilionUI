// View helpers shared by MlLunarCalendar (Vue) and LunarCalendar (React) — framework-free.
import { solarTermOn, toLunar, twHolidays, twOfficialDays, type LunarDate, type TwHoliday } from '../tw-calendar'
import { dayKey, monthGrid } from './dates'

/** One app-supplied day: a name, and whether it is a day off (default true). `off: false` on a weekend marks a 補行上班 day. */
export interface MlLunarHoliday {
  name?: string
  off?: boolean
}

/**
 * Days to add or override — e.g. the official 人事行政總處 calendar with its 補假 and 調整放假:
 * `{ '2026-02-20': '調整放假', '2026-01-31': { name: '補行上班', off: false } }` or a `TwHoliday[]`.
 * A string means a day off with that name.
 */
export type MlLunarHolidays = Record<string, string | MlLunarHoliday> | TwHoliday[]

export interface LunarDayInfo {
  /** Holiday / named-day labels (short forms), app entries first. */
  names: string[]
  /** A day off (statutory, or as the app says). */
  off: boolean
  /** The app marked this weekend day as a working day. */
  workday: boolean
}

export interface LunarCell {
  date: Date
  key: string
  lunar: LunarDate | null
  /** 節氣 of the day, if any. */
  term?: string
  info: LunarDayInfo
  /** Text under the day number, and what it is. */
  label: string
  labelKind: 'holiday' | 'term' | 'month' | 'day' | ''
  weekend: boolean
}

export interface LunarCellOptions {
  weekStartsOn: number
  showLunar: boolean
  showSolarTerms: boolean
  showHolidays: boolean
  /** Use the built-in statutory list (twHolidays). */
  builtinHolidays: boolean
  /** Apply the shipped official calendars (補假, 調整放假, 補行上班) for the years they cover. */
  official?: boolean
  /** Built-in named days that are not days off (元宵、母親節…). */
  observances: boolean
  holidays?: MlLunarHolidays
}

type Entry = { names: string[]; off?: boolean }

/** Merge the built-in list for the given years with the app's entries. */
export function lunarHolidayMap(years: number[], options: Pick<LunarCellOptions, 'builtinHolidays' | 'observances' | 'holidays' | 'official'>) {
  const map = new Map<string, Entry>()
  if (options.builtinHolidays) {
    for (const y of years) {
      for (const h of twHolidays(y, { observances: options.observances })) {
        const e = map.get(h.date) ?? { names: [] }
        e.names.push(h.short ?? h.name)
        if (h.off) e.off = true
        map.set(h.date, e)
      }
    }
  }
  if (options.official) {
    for (const y of years) {
      for (const d of twOfficialDays(y) ?? []) {
        const e = map.get(d.date) ?? { names: [] }
        // Built-in names are kept (they are shorter); official ones fill in 補假 / 補行上班.
        if (d.name && !e.names.length) e.names.push(d.name)
        e.off = d.off
        map.set(d.date, e)
      }
    }
  }
  const custom = options.holidays
  const items: [string, string | MlLunarHoliday][] = Array.isArray(custom)
    ? custom.map((h) => [h.date, { name: h.short ?? h.name, off: h.off }])
    : Object.entries(custom ?? {})
  for (const [date, raw] of items) {
    const item: MlLunarHoliday = typeof raw === 'string' ? { name: raw, off: true } : raw
    const e = map.get(date) ?? { names: [] }
    if (item.name && !e.names.includes(item.name)) e.names.unshift(item.name)
    e.off = item.off ?? (item.name ? true : e.off)
    map.set(date, e)
  }
  return map
}

/** The 42 cells of a month view. */
export function lunarCells(year: number, month: number, options: LunarCellOptions): LunarCell[] {
  const days = monthGrid(year, month, options.weekStartsOn)
  const years = [...new Set(days.map((d) => d.getFullYear()))]
  const map = options.showHolidays ? lunarHolidayMap(years, options) : new Map<string, Entry>()
  return days.map((date) => {
    const key = dayKey(date)
    const lunar = toLunar(date)
    const term = solarTermOn(date)
    const entry = map.get(key)
    const weekend = date.getDay() === 0 || date.getDay() === 6
    const info: LunarDayInfo = {
      names: entry?.names ?? [],
      off: !!entry?.off,
      workday: weekend && entry?.off === false,
    }
    let label = ''
    let labelKind: LunarCell['labelKind'] = ''
    if (info.names.length) {
      label = info.names[0]
      labelKind = 'holiday'
    } else if (options.showSolarTerms && term) {
      label = term
      labelKind = 'term'
    } else if (options.showLunar && lunar) {
      label = lunar.day === 1 ? lunar.monthName : lunar.dayName
      labelKind = lunar.day === 1 ? 'month' : 'day'
    }
    return { date, key, lunar, term, info, label, labelKind, weekend }
  })
}

/** Lunar year(s) covered by a month: one, or two around 春節. */
export function lunarYearsOf(year: number, month: number) {
  const first = toLunar(new Date(year, month, 1))
  const last = toLunar(new Date(year, month + 1, 0))
  const out: LunarDate[] = []
  if (first) out.push(first)
  if (last && (!first || last.year !== first.year)) out.push(last)
  return out
}

/** Screen-reader text of a day after the date: lunar date, names (and 節氣), day off. */
export function lunarDayParts(cell: LunarCell, showSolarTerms: boolean) {
  const lunar = cell.lunar ? `${cell.lunar.monthName}${cell.lunar.dayName}` : ''
  const names = [...cell.info.names]
  if (showSolarTerms && cell.term && !names.includes(cell.term)) names.push(cell.term)
  return { lunar, names }
}
