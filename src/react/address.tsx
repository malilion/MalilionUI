import { useId, useState, type ClipboardEvent } from 'react'
import { emptyTaiwanAddress, formatTwAddress, parseTwAddress, rebaseZip, twZipStatus, type MlTaiwanAddressValue, type ParsedTaiwanAddress } from '../components/address'
import type { RegionLang } from '../components/region'
import type { MlTaiwanRegionValue } from '../taiwan-regions'
import type { MlSize } from '../types'
import { Icon } from './basic'
import { Input } from './form'
import { InputMask } from './keypad'
import { useLocale } from './locale'
import { TaiwanRegion } from './region'
import { cx, useControllable } from './utils'

export interface TaiwanAddressProps {
  value?: MlTaiwanAddressValue
  defaultValue?: MlTaiwanAddressValue
  onChange?: (value: MlTaiwanAddressValue) => void
  /** A whole address was pasted into the road field and split into parts. */
  onPaste?: (parts: ParsedTaiwanAddress) => void
  label?: string
  hint?: string
  error?: string
  size?: MlSize
  required?: boolean
  disabled?: boolean
  /** Show the postal code field (3+3). */
  zip?: boolean
  /** The assembled address under the fields. */
  preview?: boolean
  /** Also show the address in Chunghwa Post's English order. */
  english?: boolean
  /** 縣市 / 鄉鎮市區 names in Chinese or English. Default: follows the locale. */
  lang?: RegionLang
  includeIslands?: boolean
  className?: string
}

const FIELDS = [
  ['section', 'ml-address__short'],
  ['lane', 'ml-address__short'],
  ['alley', 'ml-address__short'],
  ['number', 'ml-address__number'],
  ['floor', 'ml-address__short'],
  ['room', 'ml-address__short'],
] as const

export function TaiwanAddress({
  value,
  defaultValue,
  onChange,
  onPaste,
  label,
  hint,
  error,
  size = 'md',
  required,
  disabled,
  zip = true,
  preview = true,
  english = false,
  lang,
  includeIslands,
  className,
}: TaiwanAddressProps) {
  const loc = useLocale()
  const [initial] = useState(() => defaultValue ?? emptyTaiwanAddress())
  const [model, setModel] = useControllable(value, initial, onChange)
  const [pasted, setPasted] = useState(false)
  const errorId = `ml-address-${useId().replace(/[^\w-]/g, '')}-error`

  const region: MlTaiwanRegionValue | null = model.county && model.district ? { county: model.county, district: model.district, zip: model.zip.slice(0, 3) } : null
  const zipStatus = twZipStatus(model.zip, model.county, model.district)
  const zipError = zipStatus === 'mismatch' ? loc.address.zipMismatch : zipStatus === 'invalid' ? loc.address.zipInvalid : undefined
  const full = model.county && model.district ? formatTwAddress(model) : ''
  const fullEn = english && full ? formatTwAddress(model, { lang: 'en' }) : ''

  const set = (key: keyof MlTaiwanAddressValue, v: string) => {
    setPasted(false)
    setModel({ ...model, [key]: v })
  }
  const paste = (e: ClipboardEvent<HTMLInputElement>) => {
    const parts = parseTwAddress(e.clipboardData?.getData('text') ?? '')
    if (!parts.county && !(parts.road && parts.number)) return
    e.preventDefault()
    const next = { ...model }
    for (const [k, v] of Object.entries(parts)) if (k !== 'rest' && v) (next as Record<string, string>)[k] = v as string
    setModel(next)
    setPasted(true)
    onPaste?.(parts)
  }

  return (
    <fieldset className={cx('ml-address', `ml-address--${size}`, className, { 'ml-address--error': error })} disabled={disabled} aria-describedby={error ? errorId : undefined}>
      {label && (
        <legend className="ml-field__label">
          {label}
          {required && (
            <span className="ml-field__required" aria-hidden="true">
              *
            </span>
          )}
        </legend>
      )}
      <div className="ml-address__row">
        <TaiwanRegion
          className="ml-address__region"
          value={region}
          zip
          lang={lang}
          includeIslands={includeIslands}
          size={size}
          disabled={disabled}
          required={required}
          onChange={(v) => {
            setPasted(false)
            setModel({ ...model, county: v?.county ?? '', district: v?.district ?? '', zip: rebaseZip(model.zip, v?.zip ?? '') })
          }}
        />
        {zip && (
          <InputMask
            className="ml-address__zip"
            value={model.zip}
            preset="zip"
            unmask={false}
            label={loc.address.zip}
            error={zipError}
            size={size}
            disabled={disabled}
            onChange={(v) => set('zip', v)}
          />
        )}
      </div>
      <div className="ml-address__row ml-address__row--street">
        <Input
          className="ml-address__road"
          value={model.road}
          label={loc.address.road}
          placeholder={loc.address.roadPlaceholder}
          size={size}
          disabled={disabled}
          required={required}
          onChange={(v) => set('road', v)}
          onPaste={paste}
        />
        {FIELDS.map(([key, cls]) => (
          <Input
            key={key}
            className={cls}
            value={model[key] ?? ''}
            aria-label={loc.address[key]}
            inputMode="text"
            size={size}
            disabled={disabled}
            required={required && key === 'number'}
            suffix={loc.address[key]}
            onChange={(v) => set(key, v)}
          />
        ))}
      </div>
      {preview && full && (
        <p className="ml-address__preview" aria-live="polite">
          <span className="ml-address__preview-label">{loc.address.preview}</span>
          <span className="ml-address__line">{full}</span>
          {fullEn && (
            <>
              <span className="ml-address__preview-label">{loc.address.english}</span>
              <span className="ml-address__line ml-address__line--en">{fullEn}</span>
            </>
          )}
        </p>
      )}
      {pasted && (
        <p className="ml-address__note" role="status">
          {loc.address.pasteHint}
        </p>
      )}
      {error ? (
        <p id={errorId} className="ml-field__error">
          <Icon name="warning" />
          {error}
        </p>
      ) : hint ? (
        <p className="ml-field__hint">{hint}</p>
      ) : zip && zipStatus === 'partial' ? (
        <p className="ml-field__hint">{loc.address.zipHint}</p>
      ) : null}
    </fieldset>
  )
}
