// Sankey layout (framework-free, shared by MlSankey and the React <Sankey>).
// Columns follow the longest path from the sources; node heights are
// proportional to max(in, out); a few rounds of barycentric relaxation pull
// connected nodes level with each other to cut down crossings. Sankey flows
// must be acyclic: a link that would close a cycle is left out (`ignored`).
import type { MlChartTone } from '../types'
import { tonePalette } from './charts'

export interface MlSankeyNode {
  id: string
  label: string
  tone?: MlChartTone
}

export interface MlSankeyLink {
  source: string
  target: string
  value: number
}

export interface SankeyNodeBox {
  index: number
  id: string
  label: string
  tone: MlChartTone
  column: number
  x: number
  y: number
  w: number
  h: number
  /** Sum of incoming / outgoing link values. */
  in: number
  out: number
  /** max(in, out): what the node's height shows. */
  value: number
}

export interface SankeyRibbon {
  /** Index into the `links` you passed. */
  index: number
  source: number
  target: number
  value: number
  /** Ribbon thickness. */
  width: number
  x0: number
  x1: number
  /** Centre line at each end. */
  y0: number
  y1: number
  /** Filled ribbon (two cubic edges). */
  d: string
}

export interface SankeyLayout {
  nodes: SankeyNodeBox[]
  links: SankeyRibbon[]
  /** Links left out: unknown ids, self-loops, values ≤ 0, and back-links that would close a cycle. */
  ignored: MlSankeyLink[]
  columns: number
}

export interface SankeyOptions {
  width?: number
  height?: number
  nodeWidth?: number
  nodePadding?: number
  iterations?: number
  palette?: MlChartTone[]
}

const f = (n: number) => +n.toFixed(1)

/** The ribbon between two node edges: a band whose top and bottom edges are cubic curves. */
export function sankeyRibbon(x0: number, y0: number, x1: number, y1: number, width: number) {
  const xm = f((x0 + x1) / 2)
  const h = width / 2
  return `M${f(x0)} ${f(y0 - h)}C${xm} ${f(y0 - h)} ${xm} ${f(y1 - h)} ${f(x1)} ${f(y1 - h)}L${f(x1)} ${f(y1 + h)}C${xm} ${f(y1 + h)} ${xm} ${f(y0 + h)} ${f(x0)} ${f(y0 + h)}Z`
}

export function sankeyLayout(nodes: MlSankeyNode[], links: MlSankeyLink[], options: SankeyOptions = {}): SankeyLayout {
  const { width = 600, height = 320, nodeWidth = 14, nodePadding = 12, iterations = 8, palette = tonePalette } = options
  const pal = palette.length ? palette : tonePalette
  const n = nodes.length
  const index = new Map<string, number>()
  nodes.forEach((node, i) => {
    if (!index.has(node.id)) index.set(node.id, i)
  })

  // 1. Keep well-formed links.
  const ignored: MlSankeyLink[] = []
  const valid: { i: number; s: number; t: number; v: number }[] = []
  links.forEach((l, i) => {
    const s = index.get(l.source)
    const t = index.get(l.target)
    if (s === undefined || t === undefined || s === t || !(Number.isFinite(l.value) && l.value > 0)) ignored.push(l)
    else valid.push({ i, s, t, v: l.value })
  })

  // 2. Keep links in the order given; one that would close a cycle with the
  //    links kept so far (its target already reaches its source) is dropped.
  const reach: number[][] = nodes.map(() => [])
  const reaches = (from: number, to: number) => {
    const seen = new Uint8Array(n)
    const stack = [from]
    seen[from] = 1
    while (stack.length) {
      const u = stack.pop()!
      if (u === to) return true
      for (const v of reach[u]) if (!seen[v]) (seen[v] = 1), stack.push(v)
    }
    return false
  }
  const kept: typeof valid = []
  for (const l of valid) {
    if (reaches(l.t, l.s)) ignored.push(links[l.i])
    else {
      kept.push(l)
      reach[l.s].push(l.t)
    }
  }

  // 3. Columns: longest path from a source (Kahn's order).
  const indeg = new Array(n).fill(0)
  const outs: (typeof kept)[] = nodes.map(() => [])
  const ins: (typeof kept)[] = nodes.map(() => [])
  for (const l of kept) {
    indeg[l.t]++
    outs[l.s].push(l)
    ins[l.t].push(l)
  }
  const column = new Array(n).fill(0)
  const queue = nodes.map((_, i) => i).filter((i) => indeg[i] === 0)
  for (let q = 0; q < queue.length; q++) {
    const u = queue[q]
    for (const l of outs[u]) {
      column[l.t] = Math.max(column[l.t], column[u] + 1)
      if (--indeg[l.t] === 0) queue.push(l.t)
    }
  }
  const columns = n ? Math.max(...column) + 1 : 0

  // 4. Heights: one px-per-unit factor that fits the fullest column.
  const sum = (list: typeof kept) => list.reduce((s, l) => s + l.v, 0)
  const boxes: SankeyNodeBox[] = nodes.map((node, i) => {
    const vin = sum(ins[i])
    const vout = sum(outs[i])
    return { index: i, id: node.id, label: node.label, tone: node.tone ?? pal[i % pal.length], column: column[i], x: 0, y: 0, w: nodeWidth, h: 0, in: vin, out: vout, value: Math.max(vin, vout) }
  })
  const byColumn: SankeyNodeBox[][] = Array.from({ length: columns }, () => [])
  for (const b of boxes) byColumn[b.column].push(b)
  let ky = Infinity
  for (const col of byColumn) {
    const total = col.reduce((s, b) => s + b.value, 0)
    if (total > 0) ky = Math.min(ky, Math.max(0, height - (col.length - 1) * nodePadding) / total)
  }
  if (!Number.isFinite(ky)) ky = 0
  const span = Math.max(0, width - nodeWidth)
  for (const b of boxes) {
    b.h = Math.max(1, b.value * ky)
    b.x = columns > 1 ? (b.column / (columns - 1)) * span : span / 2
  }

  // 5. Start stacked and centred, then relax towards connected neighbours.
  const resolve = (col: SankeyNodeBox[]) => {
    col.sort((a, b) => a.y - b.y || a.index - b.index)
    let y = 0
    for (const b of col) {
      if (b.y < y) b.y = y
      y = b.y + b.h + nodePadding
    }
    y = height
    for (let k = col.length - 1; k >= 0; k--) {
      const b = col[k]
      if (b.y + b.h > y) b.y = y - b.h
      y = b.y - nodePadding
    }
    if (col.length && col[0].y < 0) {
      // Too tall to fit (only with 1px minimum heights): stack from the top.
      let top = 0
      for (const b of col) {
        b.y = top
        top += b.h + nodePadding
      }
    }
  }
  for (const col of byColumn) {
    const used = col.reduce((s, b) => s + b.h, 0) + (col.length - 1) * nodePadding
    let y = Math.max(0, (height - used) / 2)
    for (const b of col) {
      b.y = y
      y += b.h + nodePadding
    }
  }
  const centre = (b: SankeyNodeBox) => b.y + b.h / 2
  for (let it = 0; it < iterations; it++) {
    const alpha = 0.9 * Math.pow(0.9, it)
    for (let c = 1; c < columns; c++) {
      for (const b of byColumn[c]) {
        const w = sum(ins[b.index])
        if (w > 0) b.y += ((ins[b.index].reduce((s, l) => s + centre(boxes[l.s]) * l.v, 0) / w) - centre(b)) * alpha
      }
      resolve(byColumn[c])
    }
    for (let c = columns - 2; c >= 0; c--) {
      for (const b of byColumn[c]) {
        const w = sum(outs[b.index])
        if (w > 0) b.y += ((outs[b.index].reduce((s, l) => s + centre(boxes[l.t]) * l.v, 0) / w) - centre(b)) * alpha
      }
      resolve(byColumn[c])
    }
  }

  // 6. Ribbons: stack each node's links in the order of the nodes at their other end.
  const ribbons = new Map<number, SankeyRibbon>()
  for (const b of boxes) {
    let y = b.y
    for (const l of [...outs[b.index]].sort((p, q) => centre(boxes[p.t]) - centre(boxes[q.t]) || p.i - q.i)) {
      const w = l.v * ky
      ribbons.set(l.i, { index: l.i, source: l.s, target: l.t, value: l.v, width: w, x0: b.x + b.w, x1: 0, y0: y + w / 2, y1: 0, d: '' })
      y += w
    }
  }
  for (const b of boxes) {
    let y = b.y
    for (const l of [...ins[b.index]].sort((p, q) => centre(boxes[p.s]) - centre(boxes[q.s]) || p.i - q.i)) {
      const r = ribbons.get(l.i)!
      r.x1 = b.x
      r.y1 = y + r.width / 2
      y += r.width
    }
  }
  const out = [...ribbons.values()].sort((a, b) => a.index - b.index)
  for (const r of out) r.d = sankeyRibbon(r.x0, r.y0, r.x1, r.y1, r.width)
  return { nodes: boxes, links: out, ignored, columns }
}

export type SankeyDirection = 'left' | 'right' | 'up' | 'down'

/** Keyboard move between nodes: up / down within a column, left / right to the closest node in the next column. -1 if none. */
export function sankeyNeighbour(nodes: SankeyNodeBox[], from: number, direction: SankeyDirection) {
  const here = nodes[from]
  if (!here) return -1
  const mid = (b: SankeyNodeBox) => b.y + b.h / 2
  if (direction === 'up' || direction === 'down') {
    const col = nodes.filter((b) => b.column === here.column).sort((a, b) => a.y - b.y)
    const k = col.indexOf(here) + (direction === 'down' ? 1 : -1)
    return col[k]?.index ?? -1
  }
  const step = direction === 'right' ? 1 : -1
  const cols = [...new Set(nodes.map((b) => b.column))].sort((a, b) => a - b)
  const next = step > 0 ? cols.find((c) => c > here.column) : [...cols].reverse().find((c) => c < here.column)
  if (next === undefined) return -1
  return nodes
    .filter((b) => b.column === next)
    .reduce((best, b) => (Math.abs(mid(b) - mid(here)) < Math.abs(mid(best) - mid(here)) ? b : best)).index
}

/** Links touching a node (both directions), as indexes into `links`. */
export function sankeyLinksOf(layout: SankeyLayout, node: number) {
  return new Set(layout.links.filter((l) => l.source === node || l.target === node).map((l) => l.index))
}
