import { useRef, useState, type CSSProperties, type FocusEvent, type KeyboardEvent } from 'react'
import { chartStops, percentText } from '../components/charts'
import { sankeyLayout, sankeyNeighbour, type MlSankeyLink, type MlSankeyNode, type SankeyDirection } from '../components/sankey'
import type { MlChartTone } from '../types'
import { useSvgId } from './basic'
import { useLocale } from './locale'
import { cx } from './utils'

export { sankeyLayout, sankeyRibbon } from '../components/sankey'
export type { MlSankeyNode, MlSankeyLink, SankeyLayout, SankeyNodeBox, SankeyRibbon } from '../components/sankey'

export interface SankeyProps {
  nodes: MlSankeyNode[]
  links: MlSankeyLink[]
  /** viewBox size; the diagram scales to its container's width. Default 640 × 320. */
  width?: number
  height?: number
  /** Default 14. */
  nodeWidth?: number
  /** Vertical gap between nodes in a column. Default 14. */
  nodePadding?: number
  /** Tone for every node without its own, or a palette handed out in order. */
  tone?: MlChartTone | MlChartTone[]
  format?: (value: number) => string
  /** Node names (and totals) beside the nodes. Default true. */
  labels?: boolean
  /** Default true. */
  tooltip?: boolean
  /** Accessible summary of the chart. */
  label?: string
  className?: string
}

const KEYS: Record<string, SankeyDirection> = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' }
type Active = { kind: 'node' | 'link'; i: number }

export function Sankey({
  nodes,
  links,
  width = 640,
  height = 320,
  nodeWidth = 14,
  nodePadding = 14,
  tone,
  format,
  labels = true,
  tooltip = true,
  label,
  className,
}: SankeyProps) {
  const loc = useLocale()
  const fmt = (v: number) => (format ? format(v) : v.toLocaleString())
  const uid = useSvgId('ml-sankey')
  const [hovered, setHovered] = useState<Active | null>(null)
  const [focused, setFocused] = useState<number | null>(null)
  const items = useRef<(SVGGElement | null)[]>([])

  const layout = sankeyLayout(nodes, links, {
    width,
    height,
    nodeWidth,
    nodePadding,
    palette: tone === undefined ? undefined : Array.isArray(tone) ? tone : [tone],
  })
  const color = (i: number) => chartStops[layout.nodes[i].tone][0]
  const active: Active | null = hovered ?? (focused === null ? null : { kind: 'node', i: focused })

  let lit: { links: Set<number>; nodes: Set<number> } | null = null
  if (active) {
    lit = { links: new Set(), nodes: new Set() }
    for (const l of layout.links) {
      if (active.kind === 'link' ? l.index === active.i : l.source === active.i || l.target === active.i) {
        lit.links.add(l.index)
        lit.nodes.add(l.source)
        lit.nodes.add(l.target)
      }
    }
    if (active.kind === 'node') lit.nodes.add(active.i)
  }

  const lastColumn = layout.columns - 1
  const labelAt = (i: number) => {
    const b = layout.nodes[i]
    const right = b.column < lastColumn || layout.columns === 1
    return { x: right ? b.x + b.w + 6 : b.x - 6, y: b.y + b.h / 2, anchor: (right ? 'start' : 'end') as 'start' | 'end' }
  }
  const current = focused !== null && layout.nodes[focused] ? focused : 0

  function move(i: number) {
    if (i < 0 || !layout.nodes[i]) return
    setFocused(i)
    items.current[i]?.focus()
  }

  function onKeyDown(event: KeyboardEvent) {
    if (KEYS[event.key]) move(sankeyNeighbour(layout.nodes, current, KEYS[event.key]))
    else if (event.key === 'Home') move(0)
    else if (event.key === 'End') move(layout.nodes.length - 1)
    else if (event.key === 'Escape') {
      setHovered(null)
      setFocused(null)
    } else return
    event.preventDefault()
  }

  function onBlur(event: FocusEvent<SVGSVGElement>) {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(null)
  }

  const nodeText = (i: number) => {
    const b = layout.nodes[i]
    return `${b.label}：${loc.sankey.incoming} ${fmt(b.in)}，${loc.sankey.outgoing} ${fmt(b.out)}`
  }

  const pct = (n: number, of: number) => `${((n / of) * 100).toFixed(3)}%`
  let tip: { title: string; color: string; side: string; left: string; top: string; rows: string[][] } | null = null
  if (tooltip && active?.kind === 'node' && layout.nodes[active.i]) {
    const b = layout.nodes[active.i]
    const right = b.x + b.w / 2 < width * 0.6
    tip = {
      title: b.label,
      color: color(active.i),
      side: right ? 'right' : 'left',
      left: pct(right ? b.x + b.w : b.x, width),
      top: pct(b.y + b.h / 2, height),
      rows: [...(b.in ? [[loc.sankey.incoming, fmt(b.in)]] : []), ...(b.out ? [[loc.sankey.outgoing, fmt(b.out)]] : [])],
    }
  } else if (tooltip && active?.kind === 'link') {
    const l = layout.links.find((x) => x.index === active.i)
    if (l) {
      const mx = (l.x0 + l.x1) / 2
      tip = {
        title: loc.sankey.flow(layout.nodes[l.source].label, layout.nodes[l.target].label),
        color: color(l.source),
        side: mx > width * 0.6 ? 'left' : 'right',
        left: pct(mx, width),
        top: pct((l.y0 + l.y1) / 2, height),
        rows: [
          [loc.sankey.value, fmt(l.value)],
          [loc.sankey.ofSource, percentText(layout.nodes[l.source].out ? l.value / layout.nodes[l.source].out : 0)],
        ],
      }
    }
  }

  const summary = `${label ?? loc.sankey.summary(layout.nodes.length, layout.links.length)}. ${loc.sankey.hint}`

  return (
    <figure className={cx('ml-sankey', { 'ml-sankey--active': lit }, className)}>
      <div className="ml-sankey__stage" onPointerLeave={() => setHovered(null)}>
        <svg className="ml-sankey__svg" viewBox={`0 0 ${width} ${height}`} role="group" aria-label={summary} onKeyDown={onKeyDown} onBlur={onBlur}>
          <defs>
            {layout.links.map((l) => (
              <linearGradient key={l.index} id={`${uid}-${l.index}`} gradientUnits="userSpaceOnUse" x1={l.x0} x2={l.x1} y1="0" y2="0">
                <stop offset="0" stopColor={color(l.source)} />
                <stop offset="1" stopColor={color(l.target)} />
              </linearGradient>
            ))}
          </defs>
          <g className="ml-sankey__links" aria-hidden="true">
            {layout.links.map((l, k) => (
              <path
                key={l.index}
                className={cx('ml-sankey__link', { 'ml-sankey__link--on': lit?.links.has(l.index), 'ml-sankey__link--dim': lit && !lit.links.has(l.index) })}
                d={l.d}
                fill={`url(#${uid}-${l.index})`}
                style={{ '--_sk-i': k } as CSSProperties}
                onPointerEnter={() => setHovered({ kind: 'link', i: l.index })}
              />
            ))}
          </g>
          {layout.nodes.map((b, i) => {
            const at = labelAt(i)
            return (
              <g
                key={b.id + i}
                ref={(el) => {
                  items.current[i] = el
                }}
                data-index={i}
                className={cx('ml-sankey__node', `ml-sankey__node--${b.tone}`, { 'ml-sankey__node--on': lit?.nodes.has(i), 'ml-sankey__node--dim': lit && !lit.nodes.has(i) })}
                role="img"
                aria-label={nodeText(i)}
                tabIndex={current === i ? 0 : -1}
                style={{ '--_sk-i': b.column, '--_sk-c0': chartStops[b.tone][0], '--_sk-c1': chartStops[b.tone][1] } as CSSProperties}
                onPointerEnter={() => setHovered({ kind: 'node', i })}
                onFocus={() => setFocused(i)}
              >
                <rect className="ml-sankey__bar" x={b.x} y={b.y} width={b.w} height={b.h} />
                {labels && (
                  <text className="ml-sankey__label" x={at.x} y={at.y} textAnchor={at.anchor}>
                    {b.label}
                    <tspan className="ml-sankey__num" dx="5">
                      {fmt(b.value)}
                    </tspan>
                  </text>
                )}
              </g>
            )
          })}
        </svg>
        {tip && (
          <div className={`ml-sankey__tip ml-sankey__tip--${tip.side}`} style={{ left: tip.left, top: tip.top }} aria-hidden="true">
            <p className="ml-sankey__tip-title">
              <i style={{ background: tip.color }} />
              {tip.title}
            </p>
            {tip.rows.map((r) => (
              <p key={r[0]} className="ml-sankey__tip-row">
                <span>{r[0]}</span>
                <b>{r[1]}</b>
              </p>
            ))}
          </div>
        )}
      </div>
      <div className="ml-visually-hidden">
      <table>
        <caption>{loc.sankey.table}</caption>
        <thead>
          <tr>
            <th scope="col">{loc.sankey.source}</th>
            <th scope="col">{loc.sankey.target}</th>
            <th scope="col">{loc.sankey.value}</th>
          </tr>
        </thead>
        <tbody>
          {layout.links.map((l) => (
            <tr key={l.index}>
              <th scope="row">{layout.nodes[l.source].label}</th>
              <td>{layout.nodes[l.target].label}</td>
              <td>{fmt(l.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </figure>
  )
}
