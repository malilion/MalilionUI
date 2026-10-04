// View helpers shared by MlBankPicker (Vue) and BankPicker (React) — framework-free.
import { formatTwBank, getTwBank, getTwBanks, matchTwBank, normalizeTwBankAccount, type TwBankKind } from '../tw-banks'
import type { MlSelectOption } from '../types'

export type BankLang = 'zh' | 'en'

/** ConfigProvider locale → which names to show. */
export const bankLang = (localeName: string, lang?: BankLang): BankLang =>
  lang ?? (localeName.toLowerCase().startsWith('zh') ? 'zh' : 'en')

/** Combobox options: value = code, label 「822 中國信託商業銀行」. */
export function bankOptions(kinds: TwBankKind[] | undefined, lang: BankLang, short: boolean): MlSelectOption[] {
  return getTwBanks({ kinds }).map((b) => ({ value: b.code, label: formatTwBank(b, { lang, short }) }))
}

/** Combobox filter: code prefix, any name, English name or alias. */
export function bankFilter(option: MlSelectOption, query: string): boolean {
  const bank = getTwBank(String(option.value))
  return !!bank && matchTwBank(bank, query)
}

/** Most digits an account field takes. */
export const BANK_ACCOUNT_MAX = 16

/**
 * Typing into the grouped account field: keep the digits (capped at `max`) and work out where
 * the caret goes in the re-grouped text, so editing in the middle doesn't jump to the end.
 */
export function bankAccountInput(raw: string, caret: number | null, max: number, group = 4) {
  const digits = normalizeTwBankAccount(raw).slice(0, max)
  const before = Math.min(normalizeTwBankAccount(raw.slice(0, caret ?? raw.length)).length, digits.length)
  // Position after `before` digits in the grouped text: one space per completed group before it.
  const pos = before + Math.max(0, Math.floor((before - 1) / group))
  const display = digits.replace(new RegExp(`(\\d{${group}})(?=\\d)`, 'g'), '$1 ')
  return { digits, display, caret: before === 0 ? 0 : Math.min(pos, display.length) }
}
