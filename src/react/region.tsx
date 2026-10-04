import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  countyLabel,
  districtLabel,
  regionCounties,
  regionKey,
  regionLang,
  resolveRegion,
  searchLabel,
  toValue,
  type RegionLang,
} from '../components/region'
import { getTaiwanCounty, matchTaiwanDistrict, type MlTaiwanRegionValue, type TaiwanDistrict } from '../taiwan-regions'
import type { MlSelectOption, MlSize } from '../types'
import { Icon } from './basic'
import { Field } from './form'
import { useLocale } from './locale'
import { Combobox } from './select'
import { cx, describedBy, useControllable } from './utils'
import { useFormField } from './validation'

export {
  getTaiwanCounties,
  getTaiwanCounty,
  getTaiwanDistricts,
  findTaiwanDistrict,
  findTaiwanDistrictsByZip,
  searchTaiwanRegions,
  matchTaiwanDistrict,
  formatTaiwanAddress,
  normalizeTaiwanName,
} from '../taiwan-regions'
export type { MlTaiwanRegionValue, TaiwanCounty, TaiwanDistrict, TaiwanRegionOptions, TaiwanAddressParts } from '../taiwan-regions'

export interface TaiwanRegionProps {
  /** A complete 縣市 + 鄉鎮市區 pick, or null. */
  value?: MlTaiwanRegionValue | null
  defaultValue?: MlTaiwanRegionValue | null
  onChange?: (value: MlTaiwanRegionValue | null, district: TaiwanDistrict | null) => void
  /** `select`: two linked selects (縣市 → 鄉鎮市區). `search`: one searchable field. */
  variant?: 'select' | 'search'
  /** Show the 3-digit postal code next to each 鄉鎮市區. Default true. */
  zip?: boolean
  /** Also offer 釣魚臺 (290), 東沙群島 (817) and 南沙群島 (819). */
  includeIslands?: boolean
  /** Names in Chinese or English. Default: follows the locale (zh-* → Chinese). */
  lang?: RegionLang
  clearable?: boolean
  label?: ReactNode
  hint?: string
  error?: string
  index?: string
  size?: MlSize
  required?: boolean
  disabled?: boolean
  id?: string
  countyPlaceholder?: string
  districtPlaceholder?: string
  /** Placeholder of the search variant. */
  placeholder?: string
  noMatchText?: string
  /** `name` of the 縣市 select (select variant). */
  name?: string
  className?: string
}

const countyName = (v: MlTaiwanRegionValue | null | undefined) =>
  v?.county ? (getTaiwanCounty(v.county, { includeIslands: true })?.name ?? '') : ''

export function TaiwanRegion({
  value,
  defaultValue = null,
  onChange,
  variant = 'select',
  zip = true,
  includeIslands = false,
  lang: langProp,
  clearable,
  label,
  hint,
  error: errorProp,
  index,
  size = 'md',
  required: requiredProp,
  disabled,
  id,
  countyPlaceholder,
  districtPlaceholder,
  placeholder,
  noMatchText,
  name,
  className,
}: TaiwanRegionProps) {
  const loc = useLocale()
  const lang = regionLang(loc.name, langProp)
  const { error, required } = useFormField({ error: errorProp, required: requiredProp })
  const auto = useId()
  const controlId = id ?? `ml-region-${auto.replace(/[^\w-]/g, '')}`
  const [model, setModel] = useControllable<MlTaiwanRegionValue | null>(value, defaultValue)
  const counties = useMemo(() => regionCounties(includeIslands), [includeIslands])
  const current = resolveRegion(model)

  /** The 縣市 picked before a 鄉鎮市區 is — the value stays null until both are chosen. */
  const [pending, setPending] = useState(() => countyName(model))
  const emitted = useRef<MlTaiwanRegionValue | null | undefined>(model)
  useEffect(() => {
    if (model === emitted.current) return
    emitted.current = model
    setPending(countyName(model))
  }, [model])
  const county = current?.county ?? pending
  const districts = counties.find((c) => c.name === county)?.districts ?? []

  function commit(d: TaiwanDistrict | undefined) {
    const next = d ? toValue(d) : null
    emitted.current = next
    setModel(next)
    onChange?.(next, d ?? null)
  }

  const byKey = useMemo(() => {
    const map = new Map<string, TaiwanDistrict>()
    for (const c of counties) for (const d of c.districts) map.set(regionKey(d.county, d.name), d)
    return map
  }, [counties])

  if (variant === 'search') {
    const options: MlSelectOption[] = [...byKey].map(([key, d]) => ({ value: key, label: searchLabel(d, lang, zip) }))
    return (
      <Combobox
        id={id}
        className={className}
        value={current ? regionKey(current.county, current.name) : null}
        onChange={(v) => commit(typeof v === 'string' ? byKey.get(v) : undefined)}
        options={options}
        filter={(o, q) => {
          const d = byKey.get(String(o.value))
          return !!d && matchTaiwanDistrict(d, q)
        }}
        searchable
        clearable={clearable}
        label={label}
        hint={hint}
        error={errorProp}
        index={index}
        size={size}
        required={requiredProp}
        disabled={disabled}
        placeholder={placeholder ?? loc.region.search}
        noMatchText={noMatchText}
        name={name}
        prefix={<Icon name="search" />}
      />
    )
  }

  const describe = describedBy(controlId, hint, error)
  return (
    <Field controlId={controlId} label={label} hint={hint} error={error} index={index} required={required} className={className}>
      <div className={cx('ml-region', { 'ml-region--clearable': clearable })}>
        <div className={cx('ml-input', `ml-input--${size}`, 'ml-region__county', { 'ml-input--error': error, 'ml-input--disabled': disabled })}>
          <select
            id={controlId}
            name={name}
            className="ml-input__control"
            value={county}
            onChange={(e) => {
              setPending(e.target.value)
              if (model) commit(undefined)
            }}
            required={required}
            disabled={disabled}
            aria-label={label ? undefined : loc.region.county}
            aria-invalid={error ? true : undefined}
            aria-describedby={describe}
          >
            <option value="" disabled>
              {countyPlaceholder ?? loc.region.pickCounty}
            </option>
            {counties.map((c) => (
              <option key={c.name} value={c.name}>
                {countyLabel(c, lang)}
              </option>
            ))}
          </select>
          <Icon name="chevronDown" className="ml-input__chevron" />
        </div>
        <div className={cx('ml-input', `ml-input--${size}`, 'ml-region__district', { 'ml-input--error': error, 'ml-input--disabled': disabled || !county })}>
          <select
            id={`${controlId}-district`}
            className="ml-input__control"
            value={current?.name ?? ''}
            onChange={(e) => commit(districts.find((d) => d.name === e.target.value))}
            required={required}
            disabled={disabled || !county}
            aria-label={typeof label === 'string' && label ? `${label} ${loc.region.district}` : loc.region.district}
            aria-invalid={error ? true : undefined}
            aria-describedby={describe}
          >
            <option value="" disabled>
              {districtPlaceholder ?? loc.region.pickDistrict}
            </option>
            {districts.map((d) => (
              <option key={d.name} value={d.name}>
                {districtLabel(d, lang, zip)}
              </option>
            ))}
          </select>
          <Icon name="chevronDown" className="ml-input__chevron" />
        </div>
        {clearable && county && !disabled && (
          <button
            type="button"
            className="ml-region__clear"
            aria-label={loc.common.clear}
            onClick={() => {
              setPending('')
              commit(undefined)
            }}
          >
            <Icon name="close" />
          </button>
        )}
      </div>
    </Field>
  )
}
