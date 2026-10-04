// Treemap layout (framework-free, shared by MlTreemap and the React <Treemap>).
// Squarified algorithm: Bruls, Huizing & van Wijk, "Squarified Treemaps" (2000).
import type { MlChartTone } from '../types'
import { tonePalette } from './charts'

export interface MlTreemapDatum {
  label: string
  /** Leaf size. A group's value is the sum of its children (its own `value` is ignored then). */
  value: number
  tone?: MlChartTone
  /** Key for `v-model:selected`; defaults to the label. */
  id?: string
  /** One nesting level: shown as a group with a header. */
  children?: MlTreemapDatum[]
}

export interface TreemapRect {
  x: number
  y: number
  w: number
  h: number
}

/** Positive, finite values only (anything else counts as 0). */
const size = (v: number) => (Number.isFinite(v) && v > 0 ? v : 0)

/** Worst aspect ratio of a row of areas laid along a side of length `side`. */
function worst(row: number[], side: number) {
  if (!row.length) return Infinity
  const s = row.reduce((a, b) => a + b, 0)
  const max = Math.max(...row)
  const min = Math.min(...row)
  const s2 = s * s
  const w2 = side * side
  return Math.max((w2 * max) / s2, s2 / (w2 * min))
}

/**
 * Squarified treemap: one rectangle per value (same order as the input) that
 * fills `rect` with areas proportional to the values. Zero / negative values
 * get an empty rectangle at the corner.
 */
export function squarify(values: number[], rect: TreemapRect): TreemapRect[] {
  const out: TreemapRect[] = values.map(() => ({ x: rect.x, y: rect.y, w: 0, h: 0 }))
  const total = values.reduce((s, v) => s + size(v), 0)
  if (total <= 0 || rect.w <= 0 || rect.h <= 0) return out
  const scale = (rect.w * rect.h) / total
  const order = values
    .map((v, i) => ({ i, a: size(v) * scale }))
    .filter((d) => d.a > 0)
    .sort((a, b) => b.a - a.a || a.i - b.i)
  let free = { ...rect }
  let row: typeof order = []

  const place = (items: typeof order, last: boolean) => {
    const sum = items.reduce((s, d) => s + d.a, 0)
    if (free.w >= free.h) {
      // Lay the row as a column down the left edge.
      const w = last ? free.w : Math.min(free.w, sum / free.h)
      let y = free.y
      items.forEach((d, k) => {
        const h = k === items.length - 1 ? free.y + free.h - y : d.a / w
        out[d.i] = { x: free.x, y, w, h }
        y += h
      })
      free = { x: free.x + w, y: free.y, w: free.w - w, h: free.h }
    } else {
      // Lay the row along the top edge.
      const h = last ? free.h : Math.min(free.h, sum / free.w)
      let x = free.x
      items.forEach((d, k) => {
        const w = k === items.length - 1 ? free.x + free.w - x : d.a / h
        out[d.i] = { x, y: free.y, w, h }
        x += w
      })
      free = { x: free.x, y: free.y + h, w: free.w, h: free.h - h }
    }
  }

  for (let k = 0; k < order.length; k++) {
    const d = order[k]
    const side = Math.min(free.w, free.h)
    if (!row.length || worst([...row.map((r) => r.a), d.a], side) <= worst(row.map((r) => r.a), side)) row.push(d)
    else {
      place(row, false)
      row = [d]
    }
  }
  if (row.length) place(row, true)
  return out
}

export interface TreemapTile extends TreemapRect {
  /** Key for selection: `id ?? label`. */
  key: string
  label: string
  value: number
  tone: MlChartTone
  /** Index of the top-level item. */
  top: number
  /** Group label when this tile sits inside a group. */
  group?: string
  /** value ÷ everything. */
  share: number
  /** value ÷ its group (1 for top-level leaves). */
  groupShare: number
  /** 0–1: rank inside its group (1 = biggest), for shading. */
  weight: number
  datum: MlTreemapDatum
}

export interface TreemapGroup extends TreemapRect {
  label: string
  value: number
  tone: MlChartTone
  share: number
  /** Whether the header strip fits. */
  header: boolean
}

export interface TreemapLayout {
  tiles: TreemapTile[]
  groups: TreemapGroup[]
  total: number
}

const datumValue = (d: MlTreemapDatum) => (d.children?.length ? d.children.reduce((s, c) => s + size(c.value), 0) : size(d.value))

/**
 * Lay out one level of groups: top-level items (and groups) fill the area,
 * children fill their group below a `header`-px strip, inset by `gap`.
 * `palette` colours top-level items that have no tone of their own.
 */
export function treemapLayout(
  data: MlTreemapDatum[],
  width: number,
  height: number,
  { palette = tonePalette, header = 22, gap = 2 }: { palette?: MlChartTone[]; header?: number; gap?: number } = {},
): TreemapLayout {
  const values = data.map(datumValue)
  const total = values.reduce((s, v) => s + v, 0)
  const rects = squarify(values, { x: 0, y: 0, w: width, h: height })
  const tiles: TreemapTile[] = []
  const groups: TreemapGroup[] = []
  const pal = palette.length ? palette : tonePalette
  data.forEach((d, i) => {
    const r = rects[i]
    const tone = d.tone ?? pal[i % pal.length]
    const share = total > 0 ? values[i] / total : 0
    if (!d.children?.length) {
      tiles.push({ ...r, key: d.id ?? d.label, label: d.label, value: size(d.value), tone, top: i, share, groupShare: 1, weight: 1, datum: d })
      return
    }
    const showHeader = r.h > header * 2 && r.w > 40
    groups.push({ ...r, label: d.label, value: values[i], tone, share, header: showHeader })
    const inner = {
      x: r.x + gap,
      y: r.y + (showHeader ? header : gap),
      w: Math.max(0, r.w - gap * 2),
      h: Math.max(0, r.h - (showHeader ? header : gap) - gap),
    }
    const kids = squarify(d.children.map((c) => c.value), inner)
    const ranked = d.children.map((c, j) => ({ j, v: size(c.value) })).sort((a, b) => b.v - a.v)
    const rank = new Map(ranked.map((x, k) => [x.j, k]))
    d.children.forEach((c, j) => {
      const v = size(c.value)
      const k = rank.get(j) ?? 0
      tiles.push({
        ...kids[j],
        key: c.id ?? c.label,
        label: c.label,
        value: v,
        tone: c.tone ?? tone,
        top: i,
        group: d.label,
        share: total > 0 ? v / total : 0,
        groupShare: values[i] > 0 ? v / values[i] : 0,
        weight: ranked.length > 1 ? 1 - k / (ranked.length - 1) : 1,
        datum: c,
      })
    })
  })
  return { tiles, groups, total }
}

export type TreemapDirection = 'left' | 'right' | 'up' | 'down'

/**
 * The tile to move to from tile `from` in a direction: the closest centre that
 * lies that way, favouring tiles straight ahead over diagonal ones. -1 if none.
 */
export function treemapNeighbour(rects: TreemapRect[], from: number, direction: TreemapDirection) {
  const c = (r: TreemapRect) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 })
  const here = rects[from]
  if (!here) return -1
  const o = c(here)
  let best = -1
  let bestScore = Infinity
  rects.forEach((r, i) => {
    if (i === from || r.w <= 0 || r.h <= 0) return
    const p = c(r)
    const dx = p.x - o.x
    const dy = p.y - o.y
    const along = direction === 'right' ? dx : direction === 'left' ? -dx : direction === 'down' ? dy : -dy
    const across = direction === 'left' || direction === 'right' ? Math.abs(dy) : Math.abs(dx)
    // The tile must start beyond the current one's edge (or at least its centre must be ahead).
    if (along <= 0.5) return
    // Overlapping spans on the cross axis read as "straight ahead".
    const overlap =
      direction === 'left' || direction === 'right'
        ? Math.min(r.y + r.h, here.y + here.h) - Math.max(r.y, here.y)
        : Math.min(r.x + r.w, here.x + here.w) - Math.max(r.x, here.x)
    const score = along + across * (overlap > 0 ? 0.5 : 2.5)
    if (score < bestScore) {
      bestScore = score
      best = i
    }
  })
  return best
}
