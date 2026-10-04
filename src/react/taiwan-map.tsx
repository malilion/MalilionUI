import { useMemo, useRef, useState, type CSSProperties, type FocusEvent, type KeyboardEvent } from 'react'
import {
  TAIWAN_MAP_FRAMES,
  TAIWAN_MAP_SHAPES,
  TAIWAN_MAP_SIZE,
  taiwanMapAnchor,
  taiwanMapFormat,
  taiwanMapLang,
  taiwanMapName,
  taiwanMapNeighbour,
  taiwanMapScale,
  taiwanMapSelection,
  taiwanMapShortName,
  taiwanMapValues,
  type MlTaiwanMapData,
  type MlTaiwanMapLang,
  type MlTaiwanMapScale,
  type MlTaiwanMapTone,
  type TaiwanMapDirection,
} from '../components/taiwan-map'
import { useLocale } from './locale'
import { cx, useControllable } from './utils'

export {
  TAIWAN_MAP_SHAPES,
  TAIWAN_MAP_FRAMES,
  TAIWAN_MAP_SIZE,
  taiwanMapCounty,
  taiwanMapNeighbour,
  taiwanMapScale,
  taiwanMapValues,
} from '../components/taiwan-map'
export type {
  MlTaiwanMapData,
  MlTaiwanMapDatum,
  MlTaiwanMapTone,
  MlTaiwanMapScale,
  MlTaiwanMapLang,
  MlTaiwanMapBucket,
  TaiwanMapShape,
  TaiwanMapFrame,
  TaiwanMapDirection,
  TaiwanMapScaleResult,
} from '../components/taiwan-map'

export interface TaiwanMapProps {
  /** One value per 縣市: `{ 臺北市: 12 }` or `[{ county, value }]`. 台/臺 and English names both work. */
  data?: MlTaiwanMapData
  tone?: MlTaiwanMapTone
  /** `linear`: shade ∝ value. `quantile`: bands with about as many 縣市 each. */
  scale?: MlTaiwanMapScale
  /** Number of colour bands (linear: a gradient when unset; quantile: default 5). */
  steps?: number
  /** Fix the scale's min / max instead of using the data's. */
  domain?: [number, number]
  /** Show the colour legend (when there is data). Default true. */
  legend?: boolean
  /** Value text in the tooltip, legend and data table. */
  format?: (value: number, county?: string) => string
  /** Name of the value in the tooltip and data table (default 「數值」). */
  valueLabel?: string
  /** Click / Enter selects 縣市. Default true. */
  selectable?: boolean
  /** Select several 縣市; `selected` is then an array. */
  multiple?: boolean
  /** Selected 縣市 (controlled). */
  selected?: string | string[] | null
  defaultSelected?: string | string[] | null
  onSelectedChange?: (selected: string | string[] | null) => void
  /** A 縣市 was clicked / picked with Enter. */
  onSelect?: (county: string, selected: boolean) => void
  /** 縣市 drawn with an emphasised outline (not a selection). */
  highlight?: string | string[]
  /** 縣市 that can't be selected. */
  disabled?: string[]
  /** Draw short names (臺北, 竹市…) on the map. */
  labels?: boolean
  /** Tooltip on hover / focus. Default true. */
  tooltip?: boolean
  /** Map height in px; the width follows the map's aspect ratio (and never overflows). Default 480. */
  height?: number
  /** Names in Chinese or English. Default: follows the locale. */
  lang?: MlTaiwanMapLang
  /** Accessible summary of the map. */
  label?: string
  className?: string
}

const [W, H] = TAIWAN_MAP_SIZE
const KEYS: Record<string, TaiwanMapDirection> = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' }

export function TaiwanMap({
  data,
  tone = 'gold',
  scale = 'linear',
  steps,
  domain,
  legend = true,
  format,
  valueLabel,
  selectable = true,
  multiple = false,
  selected: selectedProp,
  defaultSelected = null,
  onSelectedChange,
  onSelect,
  highlight,
  disabled,
  labels = false,
  tooltip = true,
  height = 480,
  lang: langProp,
  label,
  className,
}: TaiwanMapProps) {
  const loc = useLocale()
  const lang = taiwanMapLang(loc.name, langProp)
  const fmt = (v: number, county?: string) => (format ? format(v, county) : taiwanMapFormat(v))
  const [selected, setSelected] = useControllable<string | string[] | null>(selectedProp, defaultSelected, onSelectedChange)
  const [hovered, setHovered] = useState<string | null>(null)
  const [focused, setFocused] = useState<string | null>(null)
  const [keyboard, setKeyboard] = useState(false)
  const [tipHidden, setTipHidden] = useState(false)
  const svg = useRef<SVGSVGElement>(null)

  const values = useMemo(() => taiwanMapValues(data), [data])
  const scaleInfo = useMemo(() => taiwanMapScale([...values.values()], { scale, steps, domain }), [values, scale, steps, domain])
  const selection = taiwanMapSelection(selected)
  const highlights = taiwanMapSelection(highlight ?? null)
  const disabledSet = new Set(taiwanMapSelection(disabled ?? null))

  const counties = TAIWAN_MAP_SHAPES.map((s, i) => {
    const value = values.get(s.name)
    return {
      ...s,
      i,
      inset: TAIWAN_MAP_FRAMES.some((f) => f.county === s.name),
      value,
      label: taiwanMapName(s.name, lang),
      short: taiwanMapShortName(s.name, lang),
      t: value === undefined ? undefined : scaleInfo.shade(value),
      text: value === undefined ? loc.taiwanMap.noData : fmt(value, s.name),
      selected: selection.includes(s.name),
      highlighted: highlights.includes(s.name),
      disabled: disabledSet.has(s.name),
    }
  })
  const outlined = counties.filter((c) => c.selected || c.highlighted)
  const hasEmpty = counties.some((c) => c.value === undefined)
  const showLegend = legend && values.size > 0
  const summary = label ?? loc.taiwanMap.summary(values.size, fmt(scaleInfo.min), fmt(scaleInfo.max))
  const rover = focused ?? selection.find((n) => counties.some((c) => c.name === n)) ?? TAIWAN_MAP_SHAPES[0].name

  const tipName = tooltip && !tipHidden ? (hovered ?? focused) : null
  const tipCounty = tipName ? counties.find((c) => c.name === tipName) : undefined
  const tipAt = tipCounty ? taiwanMapAnchor(tipCounty.name) : undefined
  /** Labels stay about 11px on screen whatever the map's height (view-box units). */
  const labelSize = +((11 * H) / height).toFixed(1)
  const ring = keyboard && focused ? counties.find((c) => c.name === focused) : undefined

  const toggle = (name: string) => {
    if (!selectable || disabledSet.has(name)) return
    const on = selection.includes(name)
    if (multiple) setSelected(on ? selection.filter((n) => n !== name) : [...selection, name])
    else setSelected(on ? null : name)
    onSelect?.(name, !on)
  }

  const focusCounty = (name: string | undefined) => {
    if (!name) return
    setFocused(name)
    setKeyboard(true)
    setTipHidden(false)
    svg.current?.querySelector<SVGPathElement>(`[data-county="${name}"]`)?.focus()
  }

  const onKeyDown = (event: KeyboardEvent<SVGSVGElement>) => {
    const current = focused
    if (!current) return
    if (KEYS[event.key]) focusCounty(taiwanMapNeighbour(current, KEYS[event.key]) ?? current)
    else if (event.key === 'Home') focusCounty(TAIWAN_MAP_SHAPES[0].name)
    else if (event.key === 'End') focusCounty(TAIWAN_MAP_SHAPES[TAIWAN_MAP_SHAPES.length - 1].name)
    else if (event.key === 'Enter' || event.key === ' ') toggle(current)
    else if (event.key === 'Escape') setTipHidden(true)
    else return
    event.preventDefault()
  }

  const onFocus = (name: string, event: FocusEvent<SVGPathElement>) => {
    setFocused(name)
    setTipHidden(false)
    let visible = true
    try {
      visible = event.currentTarget.matches(':focus-visible')
    } catch {
      /* very old engines */
    }
    setKeyboard(visible)
  }
  const onBlur = (event: FocusEvent<SVGPathElement>) => {
    const next = event.relatedTarget as Node | null
    if (next && svg.current?.contains(next)) return
    setFocused(null)
    setKeyboard(false)
  }

  return (
    <figure
      className={cx('ml-twmap', `ml-twmap--${tone}`, { 'ml-twmap--selectable': selectable, 'ml-twmap--labels': labels }, className)}
      style={{ '--_h': `${height}px`, '--_ratio': `${W} / ${H}` } as CSSProperties}
    >
      <div className="ml-twmap__stage" onPointerLeave={() => setHovered(null)}>
        <svg ref={svg} className="ml-twmap__svg" viewBox={`0 0 ${W} ${H}`} role="group" aria-label={summary} onKeyDown={onKeyDown}>
          <g className="ml-twmap__frames" aria-hidden="true">
            {TAIWAN_MAP_FRAMES.map((f) => (
              <rect key={f.county} className="ml-twmap__frame" x={f.x} y={f.y} width={f.w} height={f.h} rx="4" />
            ))}
          </g>
          {counties.map((c) => (
            <path
              key={c.name}
              data-county={c.name}
              className={cx('ml-twmap__county', {
                'ml-twmap__county--empty': c.t === undefined,
                'ml-twmap__county--selected': c.selected,
                'ml-twmap__county--highlight': c.highlighted,
                'ml-twmap__county--disabled': c.disabled,
                'ml-twmap__county--hover': hovered === c.name,
              })}
              d={c.d}
              style={{ '--_i': c.i, ...(c.t === undefined ? {} : { '--_t': c.t.toFixed(3) }) } as CSSProperties}
              tabIndex={c.name === rover ? 0 : -1}
              role={selectable ? 'button' : 'img'}
              aria-label={loc.taiwanMap.cell(c.label, c.text)}
              aria-pressed={selectable ? c.selected : undefined}
              aria-disabled={c.disabled ? true : undefined}
              onClick={() => toggle(c.name)}
              onPointerEnter={() => setHovered(c.name)}
              onFocus={(e) => onFocus(c.name, e)}
              onBlur={onBlur}
            />
          ))}
          <g className="ml-twmap__outlines" aria-hidden="true">
            {outlined.map((c) => (
              <path
                key={c.name}
                className={cx('ml-twmap__outline', c.selected ? 'ml-twmap__outline--selected' : 'ml-twmap__outline--highlight')}
                d={c.d}
              />
            ))}
            {ring && <path className="ml-twmap__ring" d={ring.d} />}
          </g>
          {labels && (
            <g className="ml-twmap__labels" aria-hidden="true" style={{ fontSize: `${labelSize}px` }}>
              {counties.map((c) => (
                <text
                  key={c.name}
                  className={cx('ml-twmap__label', {
                    'ml-twmap__label--on': !c.inset && c.t !== undefined && c.t > 0.55,
                    'ml-twmap__label--inset': c.inset,
                  })}
                  x={c.x}
                  y={c.y}
                >
                  {c.short}
                </text>
              ))}
            </g>
          )}
        </svg>
        {tipCounty && tipAt && (
          <div
            className={cx('ml-twmap__tip', `ml-twmap__tip--${tipAt[0] > W * 0.6 ? 'left' : 'right'}`)}
            style={{ left: `${((tipAt[0] / W) * 100).toFixed(2)}%`, top: `${((tipAt[1] / H) * 100).toFixed(2)}%` }}
            aria-hidden="true"
          >
            <p className="ml-twmap__tip-title">{tipCounty.label}</p>
            <p className="ml-twmap__tip-row">
              <span>{valueLabel ?? loc.taiwanMap.value}</span>
              <b>{tipCounty.text}</b>
            </p>
          </div>
        )}
      </div>
      {showLegend && (
        <div className="ml-twmap__legend" aria-hidden="true">
          {scaleInfo.buckets ? (
            scaleInfo.buckets.map((b) => (
              <span key={b.t} className="ml-twmap__step">
                <i className="ml-twmap__swatch" style={{ '--_t': b.t.toFixed(3) } as CSSProperties} />
                {`${fmt(b.from)} – ${fmt(b.to)}`}
              </span>
            ))
          ) : (
            <span className="ml-twmap__range">
              <span className="ml-twmap__min">{fmt(scaleInfo.min)}</span>
              <i className="ml-twmap__ramp" />
              <span className="ml-twmap__max">{fmt(scaleInfo.max)}</span>
            </span>
          )}
          {hasEmpty && (
            <span className="ml-twmap__step">
              <i className="ml-twmap__swatch ml-twmap__swatch--empty" />
              {loc.taiwanMap.noData}
            </span>
          )}
        </div>
      )}
      <table className="ml-visually-hidden">
        <caption>{loc.taiwanMap.table}</caption>
        <thead>
          <tr>
            <th scope="col">{loc.taiwanMap.county}</th>
            <th scope="col">{valueLabel ?? loc.taiwanMap.value}</th>
          </tr>
        </thead>
        <tbody>
          {counties.map((c) => (
            <tr key={c.name}>
              <th scope="row">{c.label}</th>
              <td>{c.text}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}
