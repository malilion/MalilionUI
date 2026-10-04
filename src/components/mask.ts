// Shared logic of MlInputMask / MlAmountInput and their React twins:
// pattern masks (phone numbers, 身分證, card numbers…), thousands-separated
// amounts, 中文大寫金額 and keeping the caret in place while reformatting.

/** What one mask character accepts. `upper` uppercases what's typed. */
export interface MlMaskToken {
  pattern: RegExp
  upper?: boolean
}

/**
 * Built-in slots: `9` digit · `a` letter · `A` letter (uppercased) ·
 * `*` letter or digit · `X` letter or digit (uppercased). Anything else is a
 * literal; `\` escapes a slot character (`\9` is a literal 9).
 */
export const MASK_TOKENS: Record<string, MlMaskToken> = {
  '9': { pattern: /[0-9]/ },
  a: { pattern: /[a-z]/i },
  A: { pattern: /[a-z]/i, upper: true },
  '*': { pattern: /[0-9a-z]/i },
  X: { pattern: /[0-9a-z]/i, upper: true },
}

export type MlMaskPreset = 'mobile' | 'phone' | 'id' | 'ubn' | 'card' | 'date' | 'roc-date' | 'time' | 'carrier' | 'zip'

export interface MlMaskPresetDef {
  mask: string
  tokens?: Record<string, MlMaskToken>
}

/** Common Taiwan formats. */
export const MASK_PRESETS: Record<MlMaskPreset, MlMaskPresetDef> = {
  /** 手機 0912-345-678 */
  mobile: { mask: '9999-999-999' },
  /** 市話 (02) 2345-6789 */
  phone: { mask: '(99) 9999-9999' },
  /** 身分證／居留證 A123456789 */
  id: { mask: 'AX99999999' },
  /** 統一編號 */
  ubn: { mask: '99999999' },
  /** 信用卡 */
  card: { mask: '9999 9999 9999 9999' },
  date: { mask: '9999/99/99' },
  /** 民國日期 115/10/04 */
  'roc-date': { mask: '999/99/99' },
  time: { mask: '99:99' },
  /** 手機條碼載具 /ABC+123 */
  carrier: { mask: '/CCCCCCC', tokens: { C: { pattern: /[0-9A-Z.+-]/i, upper: true } } },
  /** 3+3 郵遞區號 */
  zip: { mask: '999-999' },
}

export type MaskPart = { slot: MlMaskToken; literal?: undefined } | { slot?: undefined; literal: string }

export function parseMask(mask: string, tokens: Record<string, MlMaskToken> = MASK_TOKENS): MaskPart[] {
  const parts: MaskPart[] = []
  for (let i = 0; i < mask.length; i++) {
    const c = mask[i]
    if (c === '\\' && i + 1 < mask.length) parts.push({ literal: mask[++i] })
    else if (tokens[c]) parts.push({ slot: tokens[c] })
    else parts.push({ literal: c })
  }
  return parts
}

export interface MaskResult {
  /** What the input shows. Literals only appear once a slot after them is filled. */
  formatted: string
  /** Just the characters typed into slots. */
  raw: string
  /** Every slot is filled. */
  complete: boolean
}

/**
 * Fit text into the mask. Characters a slot doesn't accept are skipped, and a
 * typed literal ("-" in a phone number) is absorbed by the matching literal.
 */
export function applyMask(text: string, parts: MaskPart[]): MaskResult {
  let formatted = ''
  let raw = ''
  let pending = ''
  let p = 0
  for (let i = 0; i < text.length && p < parts.length; i++) {
    const c = text[i]
    // Literals before the next slot wait until that slot gets a character.
    while (p < parts.length && parts[p].literal !== undefined) {
      if (c === parts[p].literal) break
      pending += parts[p++].literal
    }
    if (p >= parts.length) break
    const part = parts[p]
    if (part.literal !== undefined) {
      pending += part.literal
      p++
      continue
    }
    if (!part.slot.pattern.test(c)) continue
    const ch = part.slot.upper ? c.toUpperCase() : c
    formatted += pending + ch
    pending = ''
    raw += ch
    p++
  }
  const slots = parts.filter((x) => x.slot).length
  return { formatted, raw, complete: slots > 0 && raw.length === slots }
}

/** "____-___-___" — the mask with every slot shown as `char`. */
export function maskPlaceholder(parts: MaskPart[], char = '_') {
  return parts.map((x) => x.literal ?? char).join('')
}

/** Phones get the numeric keypad when every slot is a digit. */
export function maskInputMode(parts: MaskPart[]): 'numeric' | 'text' {
  return parts.every((x) => x.literal !== undefined || x.slot.pattern.source === '[0-9]') ? 'numeric' : 'text'
}

/** Resolve the mask / preset / custom-token props to parts. */
export function resolveMask(mask?: string, preset?: MlMaskPreset, tokens?: Record<string, MlMaskToken>) {
  const def = preset ? MASK_PRESETS[preset] : undefined
  return parseMask(mask ?? def?.mask ?? '', { ...MASK_TOKENS, ...def?.tokens, ...tokens })
}

/* ── Amounts ─────────────────────────────────────────── */

export interface AmountOptions {
  /** Digits after the decimal point. 0 = whole numbers. */
  decimals?: number
  separator?: string
  allowNegative?: boolean
}

export interface AmountResult {
  display: string
  value: number | null
}

/** Group an unsigned digit string: 1234567 → 1,234,567. */
export function groupDigits(digits: string, separator = ',') {
  return separator ? digits.replace(/\B(?=(\d{3})+(?!\d))/g, separator) : digits
}

/**
 * Reformat what's being typed: digits grouped, at most one point and
 * `decimals` fraction digits, no leading zeros. A trailing "." or "-" is kept
 * so the next keystroke can complete it.
 */
export function formatAmountInput(text: string, { decimals = 0, separator = ',', allowNegative = false }: AmountOptions = {}): AmountResult {
  const negative = allowNegative && /^\s*[-−]/.test(text)
  let body = text.replace(/[^0-9.]/g, '')
  let int = body
  let frac: string | undefined
  const dot = body.indexOf('.')
  if (dot >= 0) {
    int = body.slice(0, dot)
    frac = decimals > 0 ? body.slice(dot + 1).replace(/\./g, '').slice(0, decimals) : undefined
  }
  int = int.replace(/^0+(?=\d)/, '')
  if (!int && frac !== undefined) int = '0'
  body = int + (frac !== undefined ? `.${frac}` : '')
  const display = (negative ? '-' : '') + groupDigits(int, separator) + (frac !== undefined ? `.${frac}` : '')
  const value = int ? Number((negative ? '-' : '') + body.replace(/\.$/, '')) : null
  return { display, value: value === 0 && negative ? 0 : value }
}

/** How an amount looks at rest: grouped and padded to `decimals`. */
export function formatAmount(value: number | null | undefined, { decimals = 0, separator = ',' }: AmountOptions = {}) {
  if (value === null || value === undefined || !Number.isFinite(value)) return ''
  const fixed = Math.abs(value).toFixed(decimals)
  const [int, frac] = fixed.split('.')
  return (value < 0 && Number(fixed) !== 0 ? '-' : '') + groupDigits(int, separator) + (frac ? `.${frac}` : '')
}

const CN_DIGITS = '零壹貳參肆伍陸柒捌玖'
const CN_UNITS = ['', '拾', '佰', '仟']
const CN_GROUPS = ['', '萬', '億', '兆']

function cnInteger(digits: string) {
  if (/^0*$/.test(digits)) return ''
  digits = digits.replace(/^0+/, '')
  let out = ''
  let zero = false
  for (let i = 0; i < digits.length; i++) {
    const d = +digits[i]
    const place = digits.length - 1 - i
    if (d === 0) zero = true
    else {
      if (zero && out) out += '零'
      zero = false
      out += CN_DIGITS[d] + CN_UNITS[place % 4]
    }
    if (place % 4 === 0 && place > 0 && Number(digits.slice(Math.max(0, i - 3), i + 1)) > 0) out += CN_GROUPS[place / 4]
  }
  return out
}

/**
 * 中文大寫金額 as written on checks and 匯款單: 12345.6 → 壹萬貳仟參佰肆拾伍元陸角.
 * Whole amounts end in 整. Rounded to the 分; returns '' past 9999 兆.
 */
export function amountInChinese(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return ''
  const [int, frac] = Math.abs(value).toFixed(2).split('.')
  if (int.length > 16) return ''
  const jiao = +frac[0]
  const fen = +frac[1]
  const yuan = cnInteger(int)
  if (!yuan && !jiao && !fen) return '零元整'
  let out = yuan ? `${yuan}元` : ''
  if (jiao) out += `${CN_DIGITS[jiao]}角`
  else if (fen && yuan) out += '零'
  if (fen) out += `${CN_DIGITS[fen]}分`
  else out += '整'
  return (value < 0 ? '負' : '') + out
}

/* ── Caret ───────────────────────────────────────────── */

/** Whether a character carries meaning (separators and literals don't). */
export type Significant = (c: string) => boolean

/** How many meaningful characters come before the caret. */
export function countSignificant(text: string, caret: number, significant: Significant) {
  let n = 0
  for (let i = 0; i < Math.min(caret, text.length); i++) if (significant(text[i])) n++
  return n
}

/**
 * Where the caret goes in the reformatted text: right after the same number
 * of meaningful characters. With `skipLiterals` (typing forward) it also
 * hops over the separators that follow.
 */
export function caretAfter(text: string, count: number, significant: Significant, skipLiterals = false) {
  let i = 0
  let n = 0
  while (i < text.length && n < count) {
    if (significant(text[i])) n++
    i++
  }
  if (skipLiterals) while (i < text.length && !significant(text[i])) i++
  return i
}

export const amountSignificant: Significant = (c) => /[0-9.\-]/.test(c)

/** A mask's meaningful characters: anything that isn't one of its literals. */
export function maskSignificant(parts: MaskPart[]): Significant {
  const literals = new Set(parts.map((x) => x.literal).filter((x): x is string => x !== undefined))
  return (c) => !literals.has(c)
}

/** Backspace right after a separator should eat the character before it. */
export function deleteBeforeSeparator(text: string, caret: number, significant: Significant) {
  let i = caret
  while (i > 0 && !significant(text[i - 1])) i--
  if (i === 0) return { text, caret }
  return { text: text.slice(0, i - 1) + text.slice(i), caret: i - 1 }
}

export interface ReformatInput {
  /** The input's value right after the browser applied the keystroke. */
  value: string
  caret: number
  /** InputEvent.inputType. */
  inputType?: string
  /** What the input showed before the keystroke. */
  previous: string
}

/**
 * One reformat step shared by both frameworks: run `format` on the new value
 * and work out where the caret belongs. A Backspace that only removed a
 * separator removes the character before it instead.
 */
export function reformat({ value, caret, inputType, previous }: ReformatInput, format: (text: string) => string, significant: Significant) {
  let text = value
  let at = caret
  if (inputType === 'deleteContentBackward' && format(text) === previous && text.length < previous.length) {
    ;({ text, caret: at } = deleteBeforeSeparator(previous, at + 1, significant))
  }
  const count = countSignificant(text, at, significant)
  const next = format(text)
  const forward = !!inputType?.startsWith('insert')
  return { text: next, caret: caretAfter(next, count, significant, forward) }
}
