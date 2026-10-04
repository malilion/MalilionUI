// View helpers shared by MlInvoiceChecker (Vue) and InvoiceChecker (React) — framework-free.
import {
  INVOICE_PRIZES,
  checkInvoice,
  invoiceDrawNumbers,
  invoiceHighlight,
  quickCheckInvoice,
  type InvoiceCandidate,
  type MlInvoiceDraw,
  type MlInvoiceResult,
} from '../invoice'
import type { MlLocale } from '../locale-data'

export type InvoiceMode = 'quick' | 'full'

export interface InvoiceHistoryItem {
  id: number
  result: MlInvoiceResult
}

/** Digits needed by a mode. */
export const invoiceLength = (mode: InvoiceMode) => (mode === 'quick' ? 3 : 8)

/** Check `digits` in the given mode. */
export const runInvoiceCheck = (mode: InvoiceMode, digits: string, draw: MlInvoiceDraw) =>
  mode === 'quick' ? quickCheckInvoice(digits, draw) : checkInvoice(digits, draw)

/** The draw for a period (or the first one). */
export const pickDraw = (draws: MlInvoiceDraw[], period: string | undefined) => draws.find((d) => d.period === period) ?? draws[0]

/** Headline + detail of a result. */
export function invoiceMessage(result: MlInvoiceResult | null, t: MlLocale['invoice']) {
  if (!result) return { message: t.waiting, detail: '' }
  if (result.status === 'win' && result.tier) return { message: t.win(t.prizes[result.tier], t.amount(result.amount)), detail: '' }
  if (result.status === 'maybe') return { message: t.maybe, detail: result.amount ? t.atLeast(t.amount(result.amount)) : '' }
  return { message: t.none, detail: '' }
}

/** One line in the history list. */
export function invoiceVerdict(result: MlInvoiceResult, t: MlLocale['invoice']) {
  if (result.status === 'win' && result.tier) return `${t.prizes[result.tier]} ${t.amount(result.amount)}`
  return result.status === 'maybe' ? t.maybeShort : t.noneShort
}

/** 「•••••123」 for quick checks. */
export const invoiceShownNumber = (result: MlInvoiceResult) => (result.mode === 'quick' ? `•••••${result.number}` : result.number)

export interface InvoiceRow {
  tier: InvoiceCandidate['tier']
  /** Prize words shown next to the tier name. */
  amount: number
  numbers: { number: string; head: string; hit: string }[]
}

/** The draw's numbers grouped by tier, each split into the plain head and the highlighted tail. */
export function invoiceRows(draw: MlInvoiceDraw, checked: string): InvoiceRow[] {
  const rows: InvoiceRow[] = []
  for (const c of invoiceDrawNumbers(draw)) {
    let row = rows.find((r) => r.tier === c.tier)
    if (!row) {
      row = { tier: c.tier, amount: c.amount ?? INVOICE_PRIZES[c.tier].amount, numbers: [] }
      rows.push(row)
    }
    // 雲端發票專屬獎 numbers can carry different prizes: show the largest.
    if (c.amount !== undefined) row.amount = Math.max(row.amount, c.amount)
    const k = invoiceHighlight(c, checked)
    row.numbers.push({ number: c.number, head: c.number.slice(0, c.number.length - k), hit: k ? c.number.slice(-k) : '' })
  }
  return rows
}
