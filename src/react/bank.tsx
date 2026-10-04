import { useId, useMemo, type ReactNode } from 'react'
import { BANK_ACCOUNT_MAX, bankAccountInput, bankFilter, bankLang, bankOptions, type BankLang } from '../components/bank'
import { getTwBank, normalizeTwBankAccount, type TwBank, type TwBankKind } from '../tw-banks'
import type { MlSize } from '../types'
import { Icon } from './basic'
import { Field } from './form'
import { useLocale } from './locale'
import { Combobox } from './select'
import { cx, describedBy, useControllable } from './utils'

export {
  getTwBanks,
  getTwBank,
  isKnownTwBankCode,
  matchTwBank,
  searchTwBanks,
  formatTwBank,
  formatTwBankAccount,
  normalizeTwBankAccount,
  TW_BANK_KINDS_DEFAULT,
} from '../tw-banks'
export type { TwBank, TwBankKind, TwBankOptions } from '../tw-banks'
export type { BankLang } from '../components/bank'

export interface BankPickerProps {
  /** The 3-digit bank code, or null. */
  value?: string | null
  defaultValue?: string | null
  onChange?: (code: string | null, bank: TwBank | null) => void
  /** Which institutions to offer. Default: banks, foreign bank branches, 信用合作社 and 中華郵政. */
  kinds?: TwBankKind[]
  /** Show the common short name (中國信託) instead of the registered one (中國信託商業銀行). */
  short?: boolean
  /** Names in Chinese or English. Default: follows the locale (zh-* → Chinese). */
  lang?: BankLang
  /** Add an account-number field (`account` / `onAccountChange`, digits only). */
  withAccount?: boolean
  account?: string
  defaultAccount?: string
  onAccountChange?: (account: string) => void
  clearable?: boolean
  label?: ReactNode
  hint?: string
  error?: string
  index?: string
  size?: MlSize
  required?: boolean
  disabled?: boolean
  id?: string
  placeholder?: string
  noMatchText?: string
  /** `name` of the hidden input posting the bank code. */
  name?: string
  accountLabel?: ReactNode
  accountPlaceholder?: string
  /** Replaces the digit-count hint under the account field. */
  accountHint?: string
  accountError?: string
  /** `name` of the hidden input posting the account digits. */
  accountName?: string
  /** Most digits accepted. Default 16. */
  accountMaxLength?: number
  className?: string
}

export function BankPicker({
  value,
  defaultValue = null,
  onChange,
  kinds,
  short = false,
  lang: langProp,
  withAccount = false,
  account: accountProp,
  defaultAccount = '',
  onAccountChange,
  clearable,
  label,
  hint,
  error,
  index,
  size = 'md',
  required,
  disabled,
  id,
  placeholder,
  noMatchText,
  name,
  accountLabel,
  accountPlaceholder,
  accountHint,
  accountError,
  accountName,
  accountMaxLength = BANK_ACCOUNT_MAX,
  className,
}: BankPickerProps) {
  const loc = useLocale()
  const lang = bankLang(loc.name, langProp)
  const auto = useId()
  const accountId = id ? `${id}-account` : `ml-bank-account-${auto.replace(/[^\w-]/g, '')}`
  const [model, setModel] = useControllable<string | null>(value, defaultValue)
  const [account, setAccount] = useControllable<string>(accountProp, defaultAccount, onAccountChange)
  const options = useMemo(() => bankOptions(kinds, lang, short), [kinds, lang, short])

  const pick = (v: unknown) => {
    const bank = typeof v === 'string' ? (getTwBank(v) ?? null) : null
    setModel(bank?.code ?? null)
    onChange?.(bank?.code ?? null, bank)
  }

  const combobox = (cls?: string, lbl?: ReactNode) => (
    <Combobox
      id={id}
      className={cls}
      value={model}
      onChange={pick}
      options={options}
      filter={bankFilter}
      searchable
      clearable={clearable}
      label={lbl}
      hint={hint}
      error={error}
      index={index}
      size={size}
      required={required}
      disabled={disabled}
      placeholder={placeholder ?? loc.bank.search}
      noMatchText={noMatchText}
      name={name}
      prefix={<Icon name="search" />}
    />
  )

  if (!withAccount) return combobox(cx('ml-bank-picker__bank', className), label)

  const digits = normalizeTwBankAccount(account ?? '')
  const display = bankAccountInput(digits, null, accountMaxLength).display
  const hintText = accountHint ?? loc.bank.accountHint(digits.length)
  return (
    <div className={cx('ml-bank-picker', `ml-bank-picker--${size}`, className)}>
      {combobox('ml-bank-picker__bank', label ?? loc.bank.label)}
      <Field className="ml-bank-picker__account" controlId={accountId} label={accountLabel ?? loc.bank.account} hint={hintText} error={accountError}>
        <div className={cx('ml-input', `ml-input--${size}`, { 'ml-input--error': accountError, 'ml-input--disabled': disabled })}>
          <input
            id={accountId}
            className="ml-input__control ml-bank-picker__account-input"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={display}
            placeholder={accountPlaceholder ?? loc.bank.accountPlaceholder}
            disabled={disabled}
            aria-invalid={accountError ? true : undefined}
            aria-describedby={describedBy(accountId, hintText, accountError)}
            onChange={(e) => {
              const el = e.target
              const next = bankAccountInput(el.value, el.selectionStart, accountMaxLength)
              el.value = next.display
              el.setSelectionRange?.(next.caret, next.caret)
              setAccount(next.digits)
            }}
          />
        </div>
        {accountName && <input type="hidden" name={accountName} value={digits} />}
      </Field>
    </div>
  )
}
