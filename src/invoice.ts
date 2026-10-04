// 統一發票對獎 — framework-free, shared by MlInvoiceChecker (Vue) and InvoiceChecker (React).
//
// Prize rules: 統一發票給獎辦法 第3條 (財政部, 修正 2022-07-21,
// https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=G0340083) and the 財政部稅務入口網 winning-number
// page (https://invoice.etax.nat.gov.tw/, consulted 2026-10-04):
//   特別獎 NT$10,000,000 · 特獎 NT$2,000,000 — all 8 digits equal the 特別獎 / 特獎 number;
//   頭獎 NT$200,000 — all 8 digits equal a 頭獎 number;
//   二獎 40,000 / 三獎 10,000 / 四獎 4,000 / 五獎 1,000 / 六獎 200 — the last 7 / 6 / 5 / 4 / 3 digits
//   equal the last digits of a 頭獎 number. One invoice is paid one (the highest) prize (第6條).
// 增開六獎 (extra 3-digit numbers) is no longer in the current 給獎辦法 and recent draws have none;
// `extraSixth` stays optional for older periods. The separate 雲端發票專屬獎 (第3-1條, matched on
// 字軌 + 8 digits) is not covered.
//
// The winning numbers change every two months (drawn on the 25th of odd months), so they are
// always supplied by the app.

export type InvoicePrizeTier = 'special' | 'grand' | 'first' | 'second' | 'third' | 'fourth' | 'fifth' | 'sixth' | 'extraSixth' | 'cloud'

export interface MlInvoiceDraw {
  /** Shown in the period selector, e.g. 「115年 7–8月」. Must be unique. */
  period: string
  /** 特別獎, 8 digits. */
  special: string
  /** 特獎, 8 digits (one, or up to three). */
  grand: string | string[]
  /** 頭獎, 8 digits each (usually three). */
  first: string[]
  /** 增開六獎, 3 digits each — only for older periods that had them. */
  extraSixth?: string[]
  /**
   * 雲端發票專屬獎: full 8-digit numbers with their prize (財政部 publishes the list and the
   * amounts each period). Only invoices kept on a 載具 (cloud invoices) can claim them.
   */
  cloud?: MlInvoiceCloudPrize[]
}

export interface MlInvoiceCloudPrize {
  /** 8 digits (a 字軌 prefix is ignored). */
  number: string
  /** NT$, as published for that period. */
  amount: number
}

export interface InvoicePrize {
  tier: InvoicePrizeTier
  /** NT$. */
  amount: number
  /** Trailing digits that must match. */
  digits: number
}

export const INVOICE_PRIZES: Record<InvoicePrizeTier, InvoicePrize> = {
  special: { tier: 'special', amount: 10_000_000, digits: 8 },
  grand: { tier: 'grand', amount: 2_000_000, digits: 8 },
  first: { tier: 'first', amount: 200_000, digits: 8 },
  second: { tier: 'second', amount: 40_000, digits: 7 },
  third: { tier: 'third', amount: 10_000, digits: 6 },
  fourth: { tier: 'fourth', amount: 4_000, digits: 5 },
  fifth: { tier: 'fifth', amount: 1_000, digits: 4 },
  sixth: { tier: 'sixth', amount: 200, digits: 3 },
  extraSixth: { tier: 'extraSixth', amount: 200, digits: 3 },
  // The amount varies per number and period; the real one comes from `draw.cloud`.
  cloud: { tier: 'cloud', amount: 0, digits: 8 },
}

/** 頭獎 suffix length → tier. */
const BY_SUFFIX: Record<number, InvoicePrizeTier> = { 8: 'first', 7: 'second', 6: 'third', 5: 'fourth', 4: 'fifth', 3: 'sixth' }

const halfDigits = (s: string) => String(s ?? '').replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
const digitsOf = (s: string) => halfDigits(s).replace(/\D/g, '')
const grandsOf = (draw: MlInvoiceDraw) => (Array.isArray(draw.grand) ? draw.grand : [draw.grand])

/** Length of the common suffix of two digit strings. */
export function invoiceSuffixMatch(a: string, b: string): number {
  let n = 0
  while (n < a.length && n < b.length && a[a.length - 1 - n] === b[b.length - 1 - n]) n++
  return n
}

export interface ParsedInvoiceNumber {
  /** 字軌, two capital letters, or '' when only digits were given. */
  track: string
  /** 8 digits. */
  number: string
}

/** 「AB-12345678」「ab 1234 5678」「ＡＢ１２３４５６７８」「12345678」 → `{ track, number }`, else null. */
export function parseInvoiceNumber(text: string): ParsedInvoiceNumber | null {
  const s = halfDigits(String(text ?? ''))
    .replace(/[Ａ-Ｚａ-ｚ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/[\s\-‐-―]/g, '')
    .toUpperCase()
  const m = /^([A-Z]{2})?(\d{8})$/.exec(s)
  return m ? { track: m[1] ?? '', number: m[2] } : null
}

export type InvoiceCheckStatus = 'win' | 'maybe' | 'none'

export interface InvoiceCandidate {
  /** Which list the number is on. */
  tier: 'special' | 'grand' | 'first' | 'extraSixth' | 'cloud'
  /** The winning number. */
  number: string
  /** NT$ for a 雲端發票專屬獎 number. */
  amount?: number
}

export interface MlInvoiceResult {
  /** `full`: an 8-digit number was checked; `quick`: only its last 3 digits. */
  mode: 'full' | 'quick'
  period: string
  /** The digits checked (8, or 3 in quick mode). */
  number: string
  /**
   * `win` — a prize for sure; `maybe` — quick mode, the last 3 digits match a number whose prize
   * needs more digits (check the whole invoice); `none` — no prize.
   */
  status: InvoiceCheckStatus
  /** Best prize won (full mode, or quick mode when certain), else null. */
  tier: InvoicePrizeTier | null
  /** NT$ of `tier`, else 0. Quick-mode `maybe` gives the minimum (200 when a 頭獎 ends the same). */
  amount: number
  /** Winning numbers that share the trailing digits — the ones to check against the invoice. */
  candidates: InvoiceCandidate[]
}

/** Check a full 8-digit number (track letters allowed) against one draw. Highest prize wins. */
export function checkInvoice(number: string, draw: MlInvoiceDraw): MlInvoiceResult {
  const n = parseInvoiceNumber(number)?.number ?? digitsOf(number).slice(-8)
  const result: MlInvoiceResult = { mode: 'full', period: draw.period, number: n, status: 'none', tier: null, amount: 0, candidates: [] }
  if (n.length !== 8) return result
  let best: InvoicePrize | null = null
  const consider = (tier: InvoicePrizeTier, winning: string, candidate: InvoiceCandidate['tier'], amount = INVOICE_PRIZES[tier].amount) => {
    const prize = { ...INVOICE_PRIZES[tier], amount }
    if (!best || prize.amount > best.amount) best = prize
    if (!result.candidates.some((c) => c.number === winning && c.tier === candidate)) {
      result.candidates.push(candidate === 'cloud' ? { tier: candidate, number: winning, amount } : { tier: candidate, number: winning })
    }
  }
  if (digitsOf(draw.special) === n) consider('special', n, 'special')
  for (const g of grandsOf(draw)) if (digitsOf(g) === n) consider('grand', n, 'grand')
  for (const f of draw.first) {
    const w = digitsOf(f)
    const k = invoiceSuffixMatch(n, w)
    if (w.length === 8 && k >= 3) consider(BY_SUFFIX[k], w, 'first')
  }
  for (const e of draw.extraSixth ?? []) {
    const w = digitsOf(e)
    if (w.length === 3 && n.endsWith(w)) consider('extraSixth', w, 'extraSixth')
  }
  for (const c of draw.cloud ?? []) {
    const w = digitsOf(c.number).slice(-8)
    if (w === n && c.amount > 0) consider('cloud', w, 'cloud', c.amount)
  }
  const won = best as InvoicePrize | null
  if (won) Object.assign(result, { status: 'win', tier: won.tier, amount: won.amount })
  return result
}

/**
 * 末三碼 quick check: `none` means no prize at all; a 增開六獎 match is a sure 200; otherwise any
 * number ending in the same 3 digits makes it `maybe` and is listed in `candidates`.
 */
export function quickCheckInvoice(last3: string, draw: MlInvoiceDraw): MlInvoiceResult {
  const n = digitsOf(last3).slice(-3)
  const result: MlInvoiceResult = { mode: 'quick', period: draw.period, number: n, status: 'none', tier: null, amount: 0, candidates: [] }
  if (n.length !== 3) return result
  const ends = (w: string) => digitsOf(w).endsWith(n)
  if (ends(draw.special)) result.candidates.push({ tier: 'special', number: digitsOf(draw.special) })
  for (const g of grandsOf(draw)) if (ends(g)) result.candidates.push({ tier: 'grand', number: digitsOf(g) })
  for (const f of draw.first) if (ends(f)) result.candidates.push({ tier: 'first', number: digitsOf(f) })
  const extra = (draw.extraSixth ?? []).map(digitsOf).filter((e) => e === n)
  for (const e of extra) result.candidates.push({ tier: 'extraSixth', number: e })
  for (const c of draw.cloud ?? []) {
    const w = digitsOf(c.number).slice(-8)
    if (w.endsWith(n)) result.candidates.push({ tier: 'cloud', number: w, amount: c.amount })
  }
  const firstHit = result.candidates.some((c) => c.tier === 'first')
  if (extra.length && !result.candidates.some((c) => c.tier !== 'extraSixth')) {
    Object.assign(result, { status: 'win', tier: 'extraSixth', amount: 200 })
  } else if (result.candidates.length) {
    Object.assign(result, { status: 'maybe', amount: firstHit || extra.length ? 200 : 0 })
  }
  return result
}

/** The 特別獎, 特獎, 頭獎, 增開六獎 and 雲端發票專屬獎 numbers of a draw, in display order. */
export function invoiceDrawNumbers(draw: MlInvoiceDraw): InvoiceCandidate[] {
  return [
    { tier: 'special' as const, number: digitsOf(draw.special) },
    ...grandsOf(draw).map((g) => ({ tier: 'grand' as const, number: digitsOf(g) })),
    ...draw.first.map((f) => ({ tier: 'first' as const, number: digitsOf(f) })),
    ...(draw.extraSixth ?? []).map((e) => ({ tier: 'extraSixth' as const, number: digitsOf(e) })),
    ...(draw.cloud ?? []).map((c) => ({ tier: 'cloud' as const, number: digitsOf(c.number).slice(-8), amount: c.amount })),
  ]
}

/**
 * How many trailing digits of a winning number to highlight for the number just checked:
 * 頭獎 / 增開六獎 from 3 matching digits; 特別獎 / 特獎 only when every checked digit matches.
 */
export function invoiceHighlight(winning: InvoiceCandidate, checked: string): number {
  if (!checked) return 0
  const k = invoiceSuffixMatch(checked, winning.number)
  if (winning.tier === 'special' || winning.tier === 'grand' || winning.tier === 'cloud') return k === checked.length && k >= 3 ? k : 0
  return k >= 3 ? k : 0
}
