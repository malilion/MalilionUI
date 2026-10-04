import { useRef, useState, type CSSProperties, type FocusEvent, type KeyboardEvent } from 'react'
import { chartStops, percentText } from '../components/charts'
import { treemapLayout, treemapNeighbour, type MlTreemapDatum, type TreemapDirection, type TreemapRect, type TreemapTile } from '../components/treemap'
import type { MlChartTone } from '../types'
import { useChartWidth } from './chart-width'
import { useLocale } from './locale'
import { cx, useControllable } from './utils'

export { squarify, treemapLayout } from '../components/treemap'
export type { MlTreemapDatum, TreemapRect, TreemapTile, TreemapGroup, TreemapLayout } from '../components/treemap'

export interface TreemapProps {
  data: MlTreemapDatum[]
  /** Height in px; the width follows the container. Default 320. */
  height?: number
  /** Tone for every item without its own, or a palette handed out in order. */
  tone?: MlChartTone | MlChartTone[]
  format?: (value: number) => string
  /** Names (and values when there is room) on the tiles. Default true. */
  labels?: boolean
  /** Default true. */
  tooltip?: boolean
  /** Click / Enter selects a tile (`selected` holds its `id ?? label`). */
  selectable?: boolean
  selected?: string | null
  defaultSelected?: string | null
  onSelectedChange?: (key: string | null) => void
  onSelect?: (item: MlTreemapDatum, selected: boolean) => void
  /** Accessible summary of the chart. */
  label?: string
  className?: string
}

const KEYS: Record<string, TreemapDirection> = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' }

export function Treemap({
  data,
  height = 320,
  tone,
  format,
  labels = true,
  tooltip = true,
  selectable = false,
  selected: selectedProp,
  defaultSelected = null,
  onSelectedChange,
  onSelect,
  label,
  className,
}: TreemapProps) {
  const loc = useLocale()
  const fmt = (v: number) => (format ? format(v) : v.toLocaleString())
  const [plot, width] = useChartWidth<HTMLDivElement>()
  const [selected, setSelected] = useControllable<string | null>(selectedProp, defaultSelected, onSelectedChange)
  const [hovered, setHovered] = useState<number | null>(null)
  const [focused, setFocused] = useState<number | null>(null)
  const items = useRef<(HTMLDivElement | null)[]>([])

  const palette = tone === undefined ? undefined : Array.isArray(tone) ? tone : [tone]
  const layout = treemapLayout(data, width, height, { palette })
  const tiles = layout.tiles.filter((t) => t.w > 0 && t.h > 0)
  const box = (r: TreemapRect) => ({
    left: `${((r.x / width) * 100).toFixed(3)}%`,
    top: `${((r.y / height) * 100).toFixed(3)}%`,
    width: `${((r.w / width) * 100).toFixed(3)}%`,
    height: `${((r.h / height) * 100).toFixed(3)}%`,
  })
  const showName = (t: TreemapTile) => labels && t.w >= 44 && t.h >= 24
  const showValue = (t: TreemapTile) => labels && t.w >= 44 && t.h >= 42
  const tileText = (t: TreemapTile) =>
    `${t.group ? `${t.group} / ` : ''}${t.label}：${fmt(t.value)}（${percentText(t.share)}）${selected === t.key ? `，${loc.treemap.selected}` : ''}`

  const active = hovered ?? focused
  const sel = tiles.findIndex((t) => t.key === selected)
  const current = focused !== null && tiles[focused] ? focused : sel < 0 ? 0 : sel

  function move(i: number) {
    if (i < 0 || !tiles[i]) return
    setFocused(i)
    items.current[i]?.focus()
  }

  function select(i: number) {
    const t = tiles[i]
    if (!selectable || !t) return
    const on = selected !== t.key
    setSelected(on ? t.key : null)
    onSelect?.(t.datum, on)
  }

  function clear() {
    const t = tiles.find((x) => x.key === selected)
    if (!selectable || !t) return
    setSelected(null)
    onSelect?.(t.datum, false)
  }

  function onKeyDown(event: KeyboardEvent) {
    if (KEYS[event.key]) move(treemapNeighbour(tiles, current, KEYS[event.key]))
    else if (event.key === 'Home') move(0)
    else if (event.key === 'End') move(tiles.length - 1)
    else if (event.key === 'Enter' || event.key === ' ') select(current)
    else if (event.key === 'Escape') clear()
    else return
    event.preventDefault()
  }

  function onBlur(event: FocusEvent<HTMLDivElement>) {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(null)
  }

  const tipTile = tooltip && active !== null ? tiles[active] : undefined
  const tip = tipTile
    ? {
        t: tipTile,
        side: tipTile.x + tipTile.w / 2 > width * 0.6 ? 'left' : 'right',
        left: `${(((tipTile.x + tipTile.w / 2) / width) * 100).toFixed(3)}%`,
        top: `${(((tipTile.y + tipTile.h / 2) / height) * 100).toFixed(3)}%`,
      }
    : null
  const summary = `${label ?? loc.treemap.summary(tiles.length, fmt(layout.total))}. ${loc.treemap.hint}`
  const hasGroups = layout.groups.length > 0

  return (
    <figure className={cx('ml-treemap', { 'ml-treemap--selectable': selectable }, className)} style={{ '--_tm-h': `${height}px` } as CSSProperties}>
      <div ref={plot} className="ml-treemap__plot" role="group" aria-label={summary} onKeyDown={onKeyDown} onBlur={onBlur} onPointerLeave={() => setHovered(null)}>
        {layout.groups.map((g, i) => (
          <div key={`g${i}`} className={`ml-treemap__group ml-treemap__group--${g.tone}`} style={{ ...box(g), '--_tm-c0': chartStops[g.tone][0] } as CSSProperties} aria-hidden="true">
            {g.header && (
              <span className="ml-treemap__head">
                <b>{g.label}</b>
                <small>{fmt(g.value)}</small>
              </span>
            )}
          </div>
        ))}
        {tiles.map((t, i) => (
          <div
            key={`${t.top}-${t.key}`}
            ref={(el) => {
              items.current[i] = el
            }}
            data-index={i}
            className={cx('ml-treemap__tile', `ml-treemap__tile--${t.tone}`, {
              'ml-treemap__tile--on': active === i,
              'ml-treemap__tile--selected': selected === t.key,
              'ml-treemap__tile--dim': selected !== null && selected !== t.key,
            })}
            style={{ ...box(t), '--_tm-i': i, '--_tm-w': t.weight.toFixed(3), '--_tm-c0': chartStops[t.tone][0], '--_tm-c1': chartStops[t.tone][1] } as CSSProperties}
            role={selectable ? 'button' : 'img'}
            aria-pressed={selectable ? selected === t.key : undefined}
            aria-label={tileText(t)}
            tabIndex={current === i ? 0 : -1}
            onPointerEnter={() => setHovered(i)}
            onFocus={() => setFocused(i)}
            onClick={() => select(i)}
          >
            {showName(t) && <span className="ml-treemap__label">{t.label}</span>}
            {showValue(t) && <span className="ml-treemap__value">{fmt(t.value)}</span>}
          </div>
        ))}
        {tip && (
          <div className={`ml-treemap__tip ml-treemap__tip--${tip.side}`} style={{ left: tip.left, top: tip.top }} aria-hidden="true">
            <p className="ml-treemap__tip-title">
              <i style={{ background: chartStops[tip.t.tone][0] }} />
              {tip.t.label}
            </p>
            {tip.t.group && (
              <p className="ml-treemap__tip-row">
                <span>{loc.treemap.group}</span>
                <b>{tip.t.group}</b>
              </p>
            )}
            <p className="ml-treemap__tip-row">
              <span>{loc.treemap.value}</span>
              <b>{fmt(tip.t.value)}</b>
            </p>
            <p className="ml-treemap__tip-row">
              <span>{loc.treemap.share}</span>
              <b>{percentText(tip.t.share)}</b>
            </p>
            {tip.t.group && (
              <p className="ml-treemap__tip-row">
                <span>{loc.treemap.ofGroup}</span>
                <b>{percentText(tip.t.groupShare)}</b>
              </p>
            )}
          </div>
        )}
      </div>
      <div className="ml-visually-hidden">
      <table>
        <caption>{loc.treemap.table}</caption>
        <thead>
          <tr>
            {hasGroups && <th scope="col">{loc.treemap.group}</th>}
            <th scope="col">{loc.treemap.item}</th>
            <th scope="col">{loc.treemap.value}</th>
            <th scope="col">{loc.treemap.share}</th>
          </tr>
        </thead>
        <tbody>
          {layout.tiles.map((t) => (
            <tr key={`${t.top}-${t.key}`}>
              {hasGroups && <td>{t.group ?? ''}</td>}
              <th scope="row">{t.label}</th>
              <td>{fmt(t.value)}</td>
              <td>{percentText(t.share)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </figure>
  )
}
