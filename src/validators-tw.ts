// 台灣常用格式檢查 — framework-free, shared by the Vue (`@malilion/ui`) and React
// (`@malilion/ui/react`) entries. Pure checkers (`isTw…`), normalizers / formatters, and
// ready-made MlFormRule creators (`twRules.…()`) whose messages follow the active locale.
//
// Every checker first normalizes its input — trims, turns full-width characters
// (０９１２、Ａ１２３…) into half-width ones, drops spaces / dashes where they are only
// separators, and upper-cases letters — so store the `normalizeTw…()` value, not the raw input.
//
// Sources (consulted 2026-10):
// • 統一編號 — 財政部財政資訊中心「營利事業統一編號檢查碼邏輯修正說明」
//   https://www.fia.gov.tw/singlehtml/3?cntId=c4d9cff38c8642ef8872774ee9987283
//   (附件範例 04595257、10458575、19312376): weights 1,2,1,2,1,2,4,1, add the digits of each
//   product; when the 7th digit is 7 its product (28 → 10) counts as 1 or 0. Since 112-04-01
//   (2023-04-01) the sum only has to be divisible by 5 (was 10) — every old number still passes.
// • 外來人口統一證號 — 內政部移民署「統一證號與國民身分證字號有無差異？」
//   https://www.immigration.gov.tw/5385/12162/238449/382804/ — new format (from 110-01-02):
//   1 letter + 9 digits, 2nd digit 8 (male) / 9 (female), checked like 身分證字號. Old format
//   (being phased out by 120-01-01): 2 letters + 8 digits, 2nd letter A/B (無戶籍國民、大陸
//   及港澳居民) or C/D (外國人); its 2nd letter counts as the last digit of its letter code.
// • 電子發票共通性載具 — 財政部電子發票整合服務平台「電子發票 Turnkey 上線前自行檢測作業」
//   https://www.einvoice.nat.gov.tw/static/ptl/ein_upload/download/5440.pdf — 手機條碼:
//   「必須以 / 為起始…總長度共為 8 碼，除第 1 碼外只會有 0-9 A-Z + - . 這 39 個字元」(Code 39);
//   自然人憑證條碼: 2 位大寫字母 + 14 位數字.
// • 電話 — 數位發展部「公眾電信網路號碼計畫」 https://www-api.moda.gov.tw/File/Get/moda/zh-tw/GvvKwygqxJeenqO
//   (area codes, the first digit and length of local numbers, 09 mobile numbers; see LANDLINE).
// • 郵遞區號 — 中華郵政 3 碼、3+2 碼 (5 digits) and 3+3 碼 (6 digits, since 2020).

import { isEmptyValue, type MlFormRule } from './form-rules'
import type { MlLocale } from './locale-data'
import { findTaiwanDistrictsByZip } from './taiwan-regions'

/* ── shared helpers ───────────────────────────────────── */

/** Full-width ASCII (！–～) and the ideographic space → half-width. */
function halfWidth(value: string): string {
  return value.replace(/[！-～]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0)).replace(/　/g, ' ')
}

const str = (value: unknown) => (typeof value === 'string' ? value : typeof value === 'number' ? String(value) : '')

/** Spaces and every dash look-alike (- ‐ ‑ ‒ – — ―). */
const SEPARATORS = /[\s\-‐-―]/g

/* ── 身分證字號 / 居留證號（統一證號） ──────────────────── */

// Letter → code: A=10 … H=17, J=18 … N=22, P=23 … V=29, X=30, Y=31, W=32, Z=33, I=34, O=35.
// (I, O, W and Z were added after the original 22 letters, hence the odd order.)
const ID_LETTERS = 'ABCDEFGHJKLMNPQRSTUVXYWZIO'
const letterCode = (letter: string) => 10 + ID_LETTERS.indexOf(letter)

/** 1st letter's code (tens ×1, units ×9), 2nd value ×8, then digits ×7…×1, check digit ×1. */
function idChecksumOk(first: string, second: number, digits: string): boolean {
  const code = letterCode(first)
  let sum = Math.floor(code / 10) + (code % 10) * 9 + second * 8
  for (let i = 0; i < 8; i++) sum += Number(digits[i]) * (i < 7 ? 7 - i : 1)
  return sum % 10 === 0
}

/** Trim, half-width, drop spaces / dashes, upper-case: `' a123-456 789 '` → `'A123456789'`. */
export function normalizeTwId(value: string): string {
  return halfWidth(str(value)).replace(SEPARATORS, '').toUpperCase()
}

/** 國民身分證統一編號: letter + 1/2 + 8 digits with a valid check digit. */
export function isTwNationalId(value: string): boolean {
  const id = normalizeTwId(value)
  return /^[A-Z][12]\d{8}$/.test(id) && idChecksumOk(id[0], Number(id[1]), id.slice(2))
}

export interface TwResidentIdOptions {
  /**
   * `'new'` — 新式統一證號 (2021+): letter + 8/9 + 8 digits.
   * `'old'` — 舊式統一證號: 2 letters (2nd A–D) + 8 digits.
   * `'any'` (default) — either.
   */
  format?: 'new' | 'old' | 'any'
}

/** 居留證號／外來人口統一證號, new and/or old format, with a valid check digit. */
export function isTwResidentId(value: string, options: TwResidentIdOptions = {}): boolean {
  const id = normalizeTwId(value)
  const format = options.format ?? 'any'
  if (format !== 'old' && /^[A-Z][89]\d{8}$/.test(id)) return idChecksumOk(id[0], Number(id[1]), id.slice(2))
  if (format !== 'new' && /^[A-Z][A-D]\d{8}$/.test(id)) return idChecksumOk(id[0], letterCode(id[1]) % 10, id.slice(2))
  return false
}

/** 身分證字號 or 居留證號 — for forms that accept citizens and residents alike. */
export function isTwPersonalId(value: string, options: TwResidentIdOptions = {}): boolean {
  return isTwNationalId(value) || isTwResidentId(value, options)
}

/* ── 統一編號 ─────────────────────────────────────────── */

export interface TwBusinessIdOptions {
  /** Only accept numbers that pass the pre-2023 rule (sum divisible by 10). Default false. */
  legacy?: boolean
}

/** Trim, half-width, drop spaces / dashes: `'0459 5257'` → `'04595257'`. */
export function normalizeTwBusinessId(value: string): string {
  return halfWidth(str(value)).replace(SEPARATORS, '')
}

const UBN_WEIGHTS = [1, 2, 1, 2, 1, 2, 4, 1]

/**
 * 營利事業統一編號 (8 digits). Uses the 財政部 rule in force since 2023-04-01 — the weighted
 * digit sum must be divisible by 5 (`legacy: true` restores the old divisible-by-10 rule).
 */
export function isTwBusinessId(value: string, options: TwBusinessIdOptions = {}): boolean {
  const id = normalizeTwBusinessId(value)
  if (!/^\d{8}$/.test(id)) return false
  const divisor = options.legacy ? 10 : 5
  let sum = 0
  for (let i = 0; i < 8; i++) {
    const product = Number(id[i]) * UBN_WEIGHTS[i]
    // 7th digit 7: 7×4 = 28 → 2+8 = 10, which counts as either 1 or 0.
    sum += i === 6 && id[i] === '7' ? 1 : Math.floor(product / 10) + (product % 10)
  }
  return sum % divisor === 0 || (id[6] === '7' && (sum - 1) % divisor === 0)
}

/* ── 電話 ─────────────────────────────────────────────── */

// 公眾電信網路號碼計畫 (數位發展部): area code → allowed first digit of the local number and its
// length. Longest codes first so 0836 / 0826 / 089 / 082 / 049 / 037 win over 08 / 04 / 03.
// Local numbers starting with 4 are partly lent to 全區統一撥接碼 (normally 7 digits), so in the
// 8-digit areas a 4 may also be followed by 6 digits.
const LANDLINE: { area: string; first: RegExp; length: number }[] = [
  { area: '0836', first: /[2-9]/, length: 5 }, // 馬祖
  { area: '0826', first: /6/, length: 5 }, // 烏坵
  { area: '089', first: /[2-9]/, length: 6 }, // 臺東縣
  { area: '082', first: /[2-57-9]/, length: 6 }, // 金門
  { area: '049', first: /[2-9]/, length: 7 }, // 南投縣
  { area: '037', first: /[2-9]/, length: 6 }, // 苗栗縣
  { area: '02', first: /[2-8]/, length: 8 }, // 臺北市、新北市、基隆市
  { area: '02', first: /4/, length: 7 },
  { area: '03', first: /[2-689]/, length: 7 }, // 桃園市、新竹縣市、花蓮縣、宜蘭縣
  { area: '04', first: /[234]/, length: 8 }, // 臺中市
  { area: '04', first: /[478]/, length: 7 }, // 彰化縣
  { area: '05', first: /[2-7]/, length: 7 }, // 嘉義縣市、雲林縣
  { area: '06', first: /[2-79]/, length: 7 }, // 臺南市、澎湖縣
  { area: '07', first: /[2-9]/, length: 7 }, // 高雄市
  { area: '08', first: /[478]/, length: 7 }, // 屏東縣
]

export interface TwPhoneParts {
  type: 'mobile' | 'landline'
  /** `'09'` for mobiles, otherwise the area code, e.g. `'02'`, `'037'`, `'0836'`. */
  area: string
  /** Subscriber number without the area code, e.g. `'23456789'` (mobiles: `'12345678'`). */
  local: string
  /** Extension digits after `#`, `ext`, `分機`…, or `''`. */
  extension: string
  /** Area code + local number, e.g. `'0223456789'`. */
  number: string
}

const EXTENSION = /(?:#|ext\.?|x|分機|轉)\s*(\d{1,6})$/i

/**
 * Digits only, `+886` / `886` / `00886` turned into a leading 0, an extension kept as
 * `#123`: `'+886 (2) 2345-6789 分機 12'` → `'0223456789#12'`.
 */
export function normalizeTwPhone(value: string): string {
  let text = halfWidth(str(value)).trim()
  let extension = ''
  const ext = EXTENSION.exec(text)
  if (ext) {
    extension = `#${ext[1]}`
    text = text.slice(0, ext.index)
  }
  let digits = text.replace(/[\s\-‐-―().]/g, '')
  // Domestic numbers start with 0, so a leading 886 can only be the country code.
  const intl = /^(?:\+|00)?886(\d{8,})$/.exec(digits)
  if (intl) digits = intl[1].startsWith('0') ? intl[1] : `0${intl[1]}`
  return digits + extension
}

/** Split a Taiwan phone number into its parts, or null when it isn't one. */
export function parseTwPhone(value: string): TwPhoneParts | null {
  const match = /^(0\d+)(?:#(\d+))?$/.exec(normalizeTwPhone(value))
  if (!match) return null
  const [, number, extension = ''] = match
  if (/^09\d{8}$/.test(number)) {
    return extension ? null : { type: 'mobile', area: '09', local: number.slice(2), extension: '', number }
  }
  for (const { area, first, length } of LANDLINE) {
    if (!number.startsWith(area)) continue
    const local = number.slice(area.length)
    if (local.length === length && first.test(local[0])) return { type: 'landline', area, local, extension, number }
  }
  return null
}

/** 手機: 09 + 8 digits; also `+886 912 345 678`, `0912-345-678`. */
export function isTwMobile(value: string): boolean {
  return parseTwPhone(value)?.type === 'mobile'
}

export interface TwLandlineOptions {
  /** Accept an extension (`#123`, `ext 123`, `分機 123`). Default true. */
  extension?: boolean
}

/** 市話: a real area code followed by a local number of the right length. */
export function isTwLandline(value: string, options: TwLandlineOptions = {}): boolean {
  const parts = parseTwPhone(value)
  return parts?.type === 'landline' && (options.extension !== false || !parts.extension)
}

/** 手機 or 市話. */
export function isTwPhone(value: string, options: TwLandlineOptions = {}): boolean {
  return isTwMobile(value) || isTwLandline(value, options)
}

/** `'0912345678'` → `'0912-345-678'` (`international: true` → `'+886 912 345 678'`). Invalid input comes back unchanged. */
export function formatTwMobile(value: string, options: { international?: boolean } = {}): string {
  const parts = parseTwPhone(value)
  if (parts?.type !== 'mobile') return value
  const n = parts.number
  return options.international ? `+886 ${n.slice(1, 4)} ${n.slice(4, 7)} ${n.slice(7)}` : `${n.slice(0, 4)}-${n.slice(4, 7)}-${n.slice(7)}`
}

/**
 * Pretty-print a mobile or landline number: `'0223456789#12'` → `'02-2345-6789 #12'`
 * (`parens: true` → `'(02) 2345-6789 #12'`). Invalid input comes back unchanged.
 */
export function formatTwPhone(value: string, options: { parens?: boolean } = {}): string {
  const parts = parseTwPhone(value)
  if (!parts) return value
  if (parts.type === 'mobile') return formatTwMobile(parts.number)
  const { local } = parts
  const split = local.length >= 7 ? local.length - 4 : local.length === 6 ? 3 : 0
  const body = split ? `${local.slice(0, split)}-${local.slice(split)}` : local
  const head = options.parens ? `(${parts.area}) ` : `${parts.area}-`
  return head + body + (parts.extension ? ` #${parts.extension}` : '')
}

/* ── 電子發票載具 ─────────────────────────────────────── */

/** Trim, half-width, upper-case — `-` `+` `.` are part of a 手機條碼, so they stay. */
export function normalizeTwCarrier(value: string): string {
  return halfWidth(str(value)).replace(/\s/g, '').toUpperCase()
}

/** 電子發票手機條碼: `/` + 7 characters from 0-9 A-Z + - . (Code 39), e.g. `/ABC+123`. */
export function isTwMobileBarcode(value: string): boolean {
  return /^\/[0-9A-Z.+-]{7}$/.test(normalizeTwCarrier(value))
}

/** 自然人憑證條碼載具: 2 upper-case letters + 14 digits, e.g. `AB12345678901234`. */
export function isTwCitizenCert(value: string): boolean {
  return /^[A-Z]{2}\d{14}$/.test(normalizeTwCarrier(value))
}

/* ── 郵遞區號 ─────────────────────────────────────────── */

export interface TwPostalCodeOptions {
  /** Accepted lengths: 3 (3 碼), 5 (3+2 碼), 6 (3+3 碼). Default all three. */
  digits?: 3 | 5 | 6 | (3 | 5 | 6)[]
}

/** Trim, half-width, drop spaces / dashes: `'100-01'` → `'10001'`. */
export function normalizeTwPostalCode(value: string): string {
  return halfWidth(str(value)).replace(SEPARATORS, '')
}

/** 郵遞區號 shape only: 3, 5 or 6 digits, not starting with 0. */
export function isTwPostalCode(value: string, options: TwPostalCodeOptions = {}): boolean {
  const code = normalizeTwPostalCode(value)
  const allowed = options.digits === undefined ? [3, 5, 6] : ([] as number[]).concat(options.digits)
  return /^[1-9]\d+$/.test(code) && allowed.includes(code.length)
}

/**
 * Like isTwPostalCode, and the first 3 digits must be a real 3 碼郵遞區號 (中華郵政 table,
 * islands included). Opt-in on purpose: only apps that call this bundle the region table.
 */
export function isKnownTwPostalCode(value: string, options: TwPostalCodeOptions = {}): boolean {
  return isTwPostalCode(value, options) && findTaiwanDistrictsByZip(normalizeTwPostalCode(value).slice(0, 3)).length > 0
}

/* ── form rules ───────────────────────────────────────── */

export interface TwRuleOptions {
  /** Replace the localized message. */
  message?: string
}

type TwMessageKey = keyof MlLocale['twValidate']

/** Empty values pass (pair with `{ required: true }`); the message follows the form's locale. */
function twRule(check: (value: string) => boolean, key: TwMessageKey, message?: string): MlFormRule {
  return {
    validator: (value) => isEmptyValue(value) || check(str(value)),
    message: message ?? ((locale) => locale.twValidate?.[key] ?? locale.form.pattern),
  }
}

/**
 * Ready-made MlFormRule creators for MlForm (Vue) and Form (React):
 * `rules: { id: [{ required: true }, twRules.nationalId()] }`.
 */
export const twRules = {
  /** 身分證字號 */
  nationalId: (options: TwRuleOptions = {}) => twRule(isTwNationalId, 'nationalId', options.message),
  /** 居留證號（統一證號）, new and/or old format */
  residentId: (options: TwRuleOptions & TwResidentIdOptions = {}) =>
    twRule((v) => isTwResidentId(v, options), 'residentId', options.message),
  /** 身分證字號或居留證號 */
  personalId: (options: TwRuleOptions & TwResidentIdOptions = {}) =>
    twRule((v) => isTwPersonalId(v, options), 'personalId', options.message),
  /** 統一編號 (current divisible-by-5 rule; `legacy: true` for the old one) */
  businessId: (options: TwRuleOptions & TwBusinessIdOptions = {}) =>
    twRule((v) => isTwBusinessId(v, options), 'businessId', options.message),
  /** 手機 */
  mobile: (options: TwRuleOptions = {}) => twRule(isTwMobile, 'mobile', options.message),
  /** 市話 (extension allowed unless `extension: false`) */
  landline: (options: TwRuleOptions & TwLandlineOptions = {}) =>
    twRule((v) => isTwLandline(v, options), 'landline', options.message),
  /** 手機或市話 */
  phone: (options: TwRuleOptions & TwLandlineOptions = {}) => twRule((v) => isTwPhone(v, options), 'phone', options.message),
  /** 電子發票手機條碼 */
  mobileBarcode: (options: TwRuleOptions = {}) => twRule(isTwMobileBarcode, 'mobileBarcode', options.message),
  /** 自然人憑證條碼 */
  citizenCert: (options: TwRuleOptions = {}) => twRule(isTwCitizenCert, 'citizenCert', options.message),
  /** 郵遞區號格式 (3 / 5 / 6 digits) */
  postalCode: (options: TwRuleOptions & TwPostalCodeOptions = {}) =>
    twRule((v) => isTwPostalCode(v, options), 'postalCode', options.message),
}

/**
 * 郵遞區號 whose first 3 digits must exist in the 中華郵政 table (message 「查無此郵遞區號」).
 * Put it after `twRules.postalCode()` so badly shaped input gets the format message first.
 * Kept out of `twRules` so the table is only bundled by apps that use this rule.
 */
export function twKnownPostalCodeRule(options: TwRuleOptions & TwPostalCodeOptions = {}): MlFormRule {
  return twRule((v) => isKnownTwPostalCode(v, options), 'postalCodeUnknown', options.message)
}
