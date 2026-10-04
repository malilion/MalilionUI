// 民國紀年 helpers for forms and APIs that speak "115/10/04" or "1151004".
// The pickers take `calendar="roc"`; these cover text in and out.

import { fromRocYear, toRocYear } from './components/dates'

export { ROC_OFFSET, fromRocYear, toRocYear, type MlCalendarSystem } from './components/dates'

const pad = (n: number, width = 2) => String(n).padStart(width, '0')

/**
 * 2026-10-04 → "115/10/04". `separator: ''` gives the 7-digit form government
 * systems use ("1151004"); the year is zero-padded to 3 digits there.
 * Dates before 民國元年 return "".
 */
export function formatRocDate(date: Date, separator = '/') {
  const y = toRocYear(date.getFullYear())
  if (y < 1) return ''
  return [separator ? String(y) : pad(y, 3), pad(date.getMonth() + 1), pad(date.getDate())].join(separator)
}

/**
 * Reads 民國 dates: "115/10/04", "115-10-4", "115.10.04", "1151004", "0991231",
 * "民國115年10月4日". Returns null for anything that isn't a real day.
 */
export function parseRocDate(text: string): Date | null {
  const s = text.trim().replace(/^民國\s*/, '')
  let m = /^(\d{1,3})\s*[/.\-年]\s*(\d{1,2})\s*[/.\-月]\s*(\d{1,2})\s*日?$/.exec(s)
  if (!m) m = /^(\d{2,3})(\d{2})(\d{2})$/.exec(s)
  if (!m) return null
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])]
  if (y < 1) return null
  const date = new Date(fromRocYear(y), mo - 1, d)
  // Reject 2/30, 13/01… which Date would quietly roll over.
  return date.getMonth() === mo - 1 && date.getDate() === d ? date : null
}
