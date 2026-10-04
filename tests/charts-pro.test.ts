// MlTreemap, MlSankey, MlGantt and MlCandlestick: their framework-free maths, then the Vue components.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { h, nextTick } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import { MlCandlestick, MlConfigProvider, MlGantt, MlSankey, MlTreemap, en } from '../src'
import { squarify, treemapLayout, treemapNeighbour, type MlTreemapDatum, type TreemapRect } from '../src/components/treemap'
import { sankeyLayout, sankeyNeighbour, sankeyRibbon, type MlSankeyLink, type MlSankeyNode } from '../src/components/sankey'
import {
  ganttArrow,
  ganttDate,
  ganttDay,
  ganttFormat,
  ganttISO,
  ganttLink,
  ganttMove,
  ganttParts,
  ganttRange,
  ganttResize,
  ganttRows,
  ganttSpans,
  ganttTicks,
  ganttWeekends,
  type MlGanttTask,
  ganttTipLeft,
} from '../src/components/gantt'
import {
  candleChange,
  candleTime,
  candleTimeLabel,
  clampRange,
  initialRange,
  isIntraday,
  movingAverage,
  panRange,
  priceScale,
  timeTicks,
  volumeScale,
  zoomRange,
  type MlCandle,
} from '../src/components/candlestick'

let wrapper: VueWrapper | undefined
afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
  document.body.innerHTML = ''
  vi.useRealTimers()
})

const area = (r: TreemapRect) => r.w * r.h
const overlap = (a: TreemapRect, b: TreemapRect) =>
  Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y))

/* ── Treemap ────────────────────────────────────────────── */
describe('squarify', () => {
  const values = [500, 433, 78, 25, 25, 7, 300, 120, 60, 1]
  const bounds = { x: 10, y: 20, w: 600, h: 300 }
  const rects = squarify(values, bounds)
  const total = values.reduce((a, b) => a + b, 0)

  it('areas are proportional to the values and fill the box', () => {
    rects.forEach((r, i) => expect(area(r)).toBeCloseTo((values[i] / total) * bounds.w * bounds.h, 4))
    expect(rects.reduce((s, r) => s + area(r), 0)).toBeCloseTo(bounds.w * bounds.h, 4)
  })

  it('never overlaps and stays in bounds', () => {
    for (const r of rects) {
      expect(r.x).toBeGreaterThanOrEqual(bounds.x - 1e-6)
      expect(r.y).toBeGreaterThanOrEqual(bounds.y - 1e-6)
      expect(r.x + r.w).toBeLessThanOrEqual(bounds.x + bounds.w + 1e-6)
      expect(r.y + r.h).toBeLessThanOrEqual(bounds.y + bounds.h + 1e-6)
    }
    for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) expect(overlap(rects[i], rects[j])).toBeLessThan(1e-6)
  })

  it('keeps tiles squarish (better than slicing)', () => {
    const worst = Math.max(...rects.filter((r) => area(r) > 0).map((r) => Math.max(r.w / r.h, r.h / r.w)))
    // Slicing 10 values into a 600×300 strip would give ratios over 100.
    expect(worst).toBeLessThan(12)
    const big = rects[0]
    expect(Math.max(big.w / big.h, big.h / big.w)).toBeLessThan(2.5)
  })

  it('handles zeros, negatives and empty input', () => {
    const r = squarify([0, 5, -3, 5], { x: 0, y: 0, w: 100, h: 50 })
    expect(area(r[0])).toBe(0)
    expect(area(r[2])).toBe(0)
    expect(area(r[1])).toBeCloseTo(2500)
    expect(squarify([], bounds)).toEqual([])
    expect(squarify([0, 0], bounds).every((x) => area(x) === 0)).toBe(true)
  })
})

const budget: MlTreemapDatum[] = [
  {
    label: '社會福利',
    children: [
      { label: '年金', value: 300 },
      { label: '長照', value: 120 },
      { label: '托育', value: 80 },
    ],
    value: 0,
  },
  { label: '教育', value: 320, tone: 'tech' },
  { label: '國防', value: 260 },
  { label: '交通', value: 90, id: 'traffic' },
]

describe('treemapLayout', () => {
  const layout = treemapLayout(budget, 600, 320)

  it('lays out leaves of groups inside the group, below the header', () => {
    expect(layout.total).toBe(300 + 120 + 80 + 320 + 260 + 90)
    expect(layout.groups).toHaveLength(1)
    const g = layout.groups[0]
    expect(g.value).toBe(500)
    const kids = layout.tiles.filter((t) => t.group === '社會福利')
    expect(kids).toHaveLength(3)
    for (const k of kids) {
      expect(k.x).toBeGreaterThanOrEqual(g.x)
      expect(k.y).toBeGreaterThanOrEqual(g.y + (g.header ? 22 : 0) - 1e-6)
      expect(k.x + k.w).toBeLessThanOrEqual(g.x + g.w + 1e-6)
      expect(k.y + k.h).toBeLessThanOrEqual(g.y + g.h + 1e-6)
    }
    expect(kids[0].groupShare).toBeCloseTo(0.6)
    expect(kids[0].weight).toBe(1)
    expect(kids[2].weight).toBe(0)
  })

  it('tones: own tone, then the palette; children inherit; keys use id', () => {
    const tones = Object.fromEntries(layout.tiles.map((t) => [t.label, t.tone]))
    expect(tones['年金']).toBe('gold')
    expect(tones['教育']).toBe('tech')
    expect(tones['國防']).toBe('bean')
    expect(layout.tiles.find((t) => t.label === '交通')!.key).toBe('traffic')
    const one = treemapLayout(budget, 600, 320, { palette: ['steel'] })
    expect(one.tiles.filter((t) => t.label !== '教育').every((t) => t.tone === 'steel')).toBe(true)
  })

  it('neighbours follow the geometry', () => {
    const rects: TreemapRect[] = [
      { x: 0, y: 0, w: 50, h: 50 },
      { x: 50, y: 0, w: 50, h: 50 },
      { x: 0, y: 50, w: 50, h: 50 },
      { x: 50, y: 50, w: 50, h: 50 },
    ]
    expect(treemapNeighbour(rects, 0, 'right')).toBe(1)
    expect(treemapNeighbour(rects, 0, 'down')).toBe(2)
    expect(treemapNeighbour(rects, 3, 'left')).toBe(2)
    expect(treemapNeighbour(rects, 3, 'up')).toBe(1)
    expect(treemapNeighbour(rects, 1, 'right')).toBe(-1)
    expect(treemapNeighbour(rects, 9, 'right')).toBe(-1)
  })
})

describe('MlTreemap', () => {
  it('renders tiles, groups, a data table and the summary', () => {
    wrapper = mount(MlTreemap, { props: { data: budget, format: (v: number) => `${v} 億` } })
    expect(wrapper.findAll('.ml-treemap__tile')).toHaveLength(6)
    expect(wrapper.find('.ml-treemap__head').text()).toContain('社會福利')
    expect(wrapper.findAll('table tbody tr')).toHaveLength(6)
    expect(wrapper.find('[role="group"]').attributes('aria-label')).toContain('合計 1170 億')
    expect(wrapper.find('.ml-treemap__tile').attributes('role')).toBe('img')
    expect(wrapper.find('.ml-treemap__tile').attributes('aria-label')).toContain('%')
  })

  it('hover shows a tooltip with the share of the total', async () => {
    wrapper = mount(MlTreemap, { props: { data: budget } })
    const edu = wrapper.findAll('.ml-treemap__tile').find((t) => t.attributes('aria-label')!.includes('教育'))!
    await edu.trigger('pointerenter')
    const tip = wrapper.find('.ml-treemap__tip')
    expect(tip.text()).toContain('教育')
    expect(tip.text()).toContain('27.4%')
  })

  it('selectable: click, Enter and Escape drive v-model:selected', async () => {
    wrapper = mount(MlTreemap, { props: { data: budget, selectable: true, selected: null } })
    const tiles = wrapper.findAll('.ml-treemap__tile')
    expect(tiles[0].attributes('role')).toBe('button')
    await tiles[1].trigger('click')
    const key = wrapper.emitted('update:selected')![0][0]
    expect(typeof key).toBe('string')
    expect(wrapper.emitted('select')![0][1]).toBe(true)
    await wrapper.setProps({ selected: key as string })
    expect(wrapper.findAll('.ml-treemap__tile--selected')).toHaveLength(1)
    await wrapper.find('.ml-treemap__plot').trigger('keydown', { key: 'Escape' })
    expect(wrapper.emitted('update:selected')!.at(-1)).toEqual([null])
    expect(wrapper.emitted('select')!.at(-1)![1]).toBe(false)
  })

  it('arrow keys move focus between tiles', async () => {
    wrapper = mount(MlTreemap, { props: { data: budget, selectable: true }, attachTo: document.body })
    const plot = wrapper.find('.ml-treemap__plot')
    const first = wrapper.find('.ml-treemap__tile[tabindex="0"]')
    ;(first.element as HTMLElement).focus()
    await plot.trigger('keydown', { key: 'ArrowRight' })
    await nextTick()
    const now = wrapper.find('.ml-treemap__tile[tabindex="0"]')
    expect(now.element).not.toBe(first.element)
    expect(document.activeElement).toBe(now.element)
    await plot.trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('update:selected')).toHaveLength(1)
  })
})

/* ── Sankey ─────────────────────────────────────────────── */
const energy: MlSankeyNode[] = [
  { id: 'coal', label: '燃煤' },
  { id: 'gas', label: '燃氣' },
  { id: 'solar', label: '太陽能' },
  { id: 'grid', label: '電網' },
  { id: 'home', label: '住宅' },
  { id: 'industry', label: '工業' },
]
const flows: MlSankeyLink[] = [
  { source: 'coal', target: 'grid', value: 40 },
  { source: 'gas', target: 'grid', value: 45 },
  { source: 'solar', target: 'grid', value: 10 },
  { source: 'solar', target: 'home', value: 5 },
  { source: 'grid', target: 'home', value: 30 },
  { source: 'grid', target: 'industry', value: 65 },
]

describe('sankeyLayout', () => {
  const L = sankeyLayout(energy, flows, { width: 600, height: 300, nodeWidth: 12, nodePadding: 10 })
  const node = (id: string) => L.nodes.find((n) => n.id === id)!

  it('columns follow the longest path from the sources', () => {
    expect(L.columns).toBe(3)
    expect(['coal', 'gas', 'solar'].map((id) => node(id).column)).toEqual([0, 0, 0])
    expect(node('grid').column).toBe(1)
    expect(node('home').column).toBe(2)
    expect(node('grid').x).toBeCloseTo(294)
    expect(node('home').x).toBeCloseTo(588)
  })

  it('heights are proportional to max(in, out) and columns fit', () => {
    expect(node('grid').in).toBe(95)
    expect(node('grid').out).toBe(95)
    expect(node('solar').value).toBe(15)
    const k = node('grid').h / 95
    expect(node('coal').h / 40).toBeCloseTo(k)
    expect(node('home').h / 35).toBeCloseTo(k)
    for (const n of L.nodes) {
      expect(n.y).toBeGreaterThanOrEqual(-1e-6)
      expect(n.y + n.h).toBeLessThanOrEqual(300 + 1e-6)
    }
    // No two nodes of a column overlap.
    for (const a of L.nodes)
      for (const b of L.nodes)
        if (a !== b && a.column === b.column) expect(a.y + a.h <= b.y + 1e-6 || b.y + b.h <= a.y + 1e-6).toBe(true)
  })

  it('ribbons stack within their nodes and join edges', () => {
    const outGrid = L.links.filter((l) => l.source === node('grid').index)
    const total = outGrid.reduce((s, l) => s + l.width, 0)
    expect(total).toBeCloseTo(node('grid').h)
    for (const l of L.links) {
      expect(l.x0).toBeCloseTo(L.nodes[l.source].x + 12)
      expect(l.x1).toBeCloseTo(L.nodes[l.target].x)
      expect(l.y0 - l.width / 2).toBeGreaterThanOrEqual(L.nodes[l.source].y - 1e-6)
      expect(l.y1 + l.width / 2).toBeLessThanOrEqual(L.nodes[l.target].y + L.nodes[l.target].h + 1e-6)
      expect(l.d.startsWith('M')).toBe(true)
    }
    expect(sankeyRibbon(0, 10, 100, 30, 4)).toBe('M0 8C50 8 50 28 100 28L100 32C50 32 50 12 0 12Z')
  })

  it('ignores cycles, self-loops, unknown ids and non-positive values', () => {
    const bad = sankeyLayout(
      [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }, { id: 'c', label: 'C' }],
      [
        { source: 'a', target: 'b', value: 5 },
        { source: 'b', target: 'c', value: 5 },
        { source: 'c', target: 'a', value: 2 },
        { source: 'a', target: 'a', value: 1 },
        { source: 'a', target: 'zz', value: 1 },
        { source: 'b', target: 'c', value: 0 },
      ],
    )
    expect(bad.links).toHaveLength(2)
    expect(bad.ignored).toHaveLength(4)
    expect(bad.ignored).toContainEqual({ source: 'c', target: 'a', value: 2 })
    expect(bad.nodes.map((n) => n.column)).toEqual([0, 1, 2])
  })

  it('the later link of a cycle is the one left out', () => {
    const L2 = sankeyLayout(
      [{ id: 's', label: 'S' }, { id: 'p', label: 'P' }, { id: 'c', label: 'C' }, { id: 'h', label: 'H' }],
      [
        { source: 's', target: 'p', value: 5 },
        { source: 'p', target: 'c', value: 3 },
        { source: 'c', target: 'h', value: 1 },
        { source: 'h', target: 'p', value: 1 },
      ],
    )
    expect(L2.ignored).toEqual([{ source: 'h', target: 'p', value: 1 }])
    const L3 = sankeyLayout(
      [{ id: 's', label: 'S' }, { id: 'h', label: 'H' }, { id: 'p', label: 'P' }, { id: 'c', label: 'C' }],
      [
        { source: 's', target: 'h', value: 5 },
        { source: 'h', target: 'p', value: 5 },
        { source: 'p', target: 'c', value: 3 },
        { source: 'c', target: 'h', value: 1 },
      ],
    )
    expect(L3.ignored).toEqual([{ source: 'c', target: 'h', value: 1 }])
    expect(L3.nodes.map((x) => x.column)).toEqual([0, 1, 2, 3])
  })

  it('relaxation lines up a chain', () => {
    const chain = sankeyLayout(
      [{ id: 'a', label: 'A' }, { id: 'x', label: 'X' }, { id: 'b', label: 'B' }, { id: 'c', label: 'C' }],
      [
        { source: 'a', target: 'b', value: 10 },
        { source: 'x', target: 'c', value: 30 },
      ],
      { height: 200 },
    )
    const mid = (i: number) => chain.nodes[i].y + chain.nodes[i].h / 2
    // A feeds B, X feeds C: their centres end up level with each other.
    expect(Math.abs(mid(0) - mid(2))).toBeLessThan(2)
    expect(Math.abs(mid(1) - mid(3))).toBeLessThan(2)
  })

  it('keyboard neighbours', () => {
    const grid = node('grid').index
    expect(sankeyNeighbour(L.nodes, grid, 'right')).toBeGreaterThan(-1)
    expect(L.nodes[sankeyNeighbour(L.nodes, grid, 'right')].column).toBe(2)
    expect(L.nodes[sankeyNeighbour(L.nodes, grid, 'left')].column).toBe(0)
    expect(sankeyNeighbour(L.nodes, grid, 'up')).toBe(-1)
    const top = L.nodes.filter((n) => n.column === 0).sort((a, b) => a.y - b.y)
    expect(sankeyNeighbour(L.nodes, top[0].index, 'down')).toBe(top[1].index)
  })
})

describe('MlSankey', () => {
  it('renders nodes, ribbons with gradients, labels and a table', () => {
    wrapper = mount(MlSankey, { props: { nodes: energy, links: flows } })
    expect(wrapper.findAll('.ml-sankey__node')).toHaveLength(6)
    expect(wrapper.findAll('.ml-sankey__link')).toHaveLength(6)
    expect(wrapper.findAll('linearGradient')).toHaveLength(6)
    expect(wrapper.find('.ml-sankey__link').attributes('fill')).toMatch(/^url\(#ml-sankey-/)
    expect(wrapper.find('.ml-sankey__label').text()).toContain('燃煤')
    expect(wrapper.findAll('table tbody tr')).toHaveLength(6)
    expect(wrapper.find('svg').attributes('viewBox')).toBe('0 0 640 320')
  })

  it('hovering a node lights its flows and dims the rest', async () => {
    wrapper = mount(MlSankey, { props: { nodes: energy, links: flows } })
    const solar = wrapper.findAll('.ml-sankey__node')[2]
    await solar.trigger('pointerenter')
    expect(wrapper.findAll('.ml-sankey__link--on')).toHaveLength(2)
    expect(wrapper.findAll('.ml-sankey__link--dim')).toHaveLength(4)
    expect(wrapper.find('.ml-sankey__tip').text()).toContain('太陽能')
    await wrapper.findAll('.ml-sankey__link')[0].trigger('pointerenter')
    expect(wrapper.findAll('.ml-sankey__link--on')).toHaveLength(1)
    expect(wrapper.find('.ml-sankey__tip').text()).toContain('燃煤 → 電網')
    await wrapper.find('.ml-sankey__stage').trigger('pointerleave')
    expect(wrapper.find('.ml-sankey__tip').exists()).toBe(false)
  })

  it('arrow keys move focus over the nodes', async () => {
    wrapper = mount(MlSankey, { props: { nodes: energy, links: flows }, attachTo: document.body })
    const first = wrapper.find('.ml-sankey__node[tabindex="0"]')
    ;(first.element as SVGElement).focus()
    await first.trigger('focus')
    await wrapper.find('svg').trigger('keydown', { key: 'ArrowRight' })
    await nextTick()
    const now = wrapper.find('.ml-sankey__node[tabindex="0"]')
    expect(now.attributes('aria-label')).toContain('電網')
    expect(wrapper.findAll('.ml-sankey__link--on')).toHaveLength(5)
  })
})

/* ── Gantt ──────────────────────────────────────────────── */
describe('gantt dates', () => {
  it('reads local dates without time-zone drift', () => {
    expect(ganttDay('1970-01-02')).toBe(1)
    expect(ganttDay('2026-03-02')).toBe(ganttDay(new Date(2026, 2, 2, 23, 59)))
    expect(ganttDay(new Date(2026, 2, 2, 0, 0))).toBe(ganttDay(new Date(2026, 2, 2, 23, 0)))
    expect(ganttISO(ganttDay('2026-3-9'))).toBe('2026-03-09')
    expect(ganttDay('nope')).toBeNaN()
    const d = ganttDate(ganttDay('2026-03-02'))
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]).toEqual([2026, 2, 2, 0])
    expect(ganttFormat(ganttDay('2026-12-31'))).toBe('2026/12/31')
  })

  it('weekdays, month lengths and leap years', () => {
    expect(ganttParts(ganttDay('2026-03-02')).weekday).toBe(1) // Monday
    expect(ganttParts(ganttDay('2024-02-29'))).toEqual({ year: 2024, month: 1, date: 29, weekday: 4 })
    expect(ganttDay('2024-03-01') - ganttDay('2024-02-28')).toBe(2)
    expect(ganttDay('2026-03-01') - ganttDay('2026-02-28')).toBe(1)
    // DST change in many zones: still one day apart.
    expect(ganttDay('2026-03-09') - ganttDay('2026-03-08')).toBe(1)
    expect(ganttDay('2026-11-02') - ganttDay('2026-11-01')).toBe(1)
  })

  it('spans, moves and resizes', () => {
    const [a, m] = ganttSpans([
      { id: 'a', label: 'A', start: '2026-03-05', end: '2026-03-02' },
      { id: 'm', label: 'M', start: '2026-03-10', end: 'whatever', milestone: true },
      { id: 'x', label: 'X', start: 'bad', end: '2026-01-01' },
    ])
    expect(a.end - a.start).toBe(3)
    expect(m.start).toBe(m.end)
    expect(ganttMove({ start: 10, end: 12 }, 3)).toEqual({ start: 13, end: 15 })
    expect(ganttResize({ start: 10, end: 12 }, -5)).toEqual({ start: 10, end: 10 })
    expect(ganttResize({ start: 10, end: 12 }, 2)).toEqual({ start: 10, end: 14 })
  })

  it('ranges align to the scale', () => {
    const spans = [{ start: ganttDay('2026-03-04'), end: ganttDay('2026-04-10') }]
    const day = ganttRange(spans, 'day')
    expect(day.from).toBe(ganttDay('2026-03-02'))
    expect(day.to).toBe(ganttDay('2026-04-14'))
    const week = ganttRange(spans, 'week')
    expect(ganttParts(week.from).weekday).toBe(1)
    expect(ganttParts(week.to).weekday).toBe(1)
    expect(week.from).toBeLessThanOrEqual(spans[0].start - 7)
    const month = ganttRange(spans, 'month')
    expect(ganttISO(month.from)).toBe('2026-03-01')
    expect(ganttISO(month.to)).toBe('2026-05-01')
  })

  it('ticks cover the range without gaps', () => {
    for (const scale of ['day', 'week', 'month'] as const) {
      const from = ganttDay('2025-12-29')
      const to = ganttDay('2026-03-02')
      const { top, bottom } = ganttTicks(from, to, scale)
      for (const row of [top, bottom]) {
        expect(row[0].day).toBe(from)
        expect(row.reduce((s, t) => s + t.days, 0)).toBe(to - from)
        row.slice(1).forEach((t, i) => expect(t.day).toBe(row[i].day + row[i].days))
      }
    }
    expect(ganttTicks(ganttDay('2026-01-01'), ganttDay('2026-03-01'), 'month').bottom.map((t) => t.month)).toEqual([0, 1])
    expect(ganttWeekends(ganttDay('2026-03-02'), ganttDay('2026-03-09')).map(ganttISO)).toEqual(['2026-03-07', '2026-03-08'])
  })

  it('rows: ungrouped first, groups collapse', () => {
    const spans = ganttSpans([
      { id: '1', label: '設計', start: '2026-03-02', end: '2026-03-04', group: '產品' },
      { id: '2', label: '開工', start: '2026-03-01', end: '2026-03-01' },
      { id: '3', label: '開發', start: '2026-03-05', end: '2026-03-12', group: '產品' },
    ])
    const rows = ganttRows(spans)
    expect(rows.map((r) => (r.kind === 'group' ? `[${r.label}]` : r.span.task.id))).toEqual(['2', '[產品]', '1', '3'])
    const g = rows[1]
    expect(g.kind === 'group' && [g.count, ganttISO(g.start), ganttISO(g.end)]).toEqual([2, '2026-03-02', '2026-03-12'])
    expect(ganttRows(spans, ['產品'])).toHaveLength(2)
  })

  it('finish → start connectors', () => {
    expect(ganttLink(100, 18, 160, 54, 36)).toBe('M100 18H108V54H160')
    expect(ganttLink(100, 18, 90, 54, 36)).toBe('M100 18H108V36H82V54H90')
    expect(ganttArrow(160, 54)).toBe('M160 54l-6 -4v8Z')
  })
})

const launch: MlGanttTask[] = [
  { id: 'kick', label: '專案啟動', start: '2026-03-02', end: '2026-03-02', milestone: true },
  { id: 'ux', label: '使用者研究', start: '2026-03-02', end: '2026-03-06', progress: 1, group: '設計' },
  { id: 'ui', label: '介面設計', start: '2026-03-09', end: '2026-03-13', progress: 0.5, group: '設計', deps: ['ux'] },
  { id: 'dev', label: '前端開發', start: '2026-03-16', end: '2026-03-27', progress: 0.2, group: '開發', deps: ['ui'], tone: 'tech' },
]

describe('MlGantt', { timeout: 30_000 }, () => {
  it('renders names, header, bars, milestones, dependencies and a table', () => {
    wrapper = mount(MlGantt, { props: { tasks: launch, today: '2026-03-10' } })
    expect(wrapper.findAll('.ml-gantt__name')).toHaveLength(4)
    expect(wrapper.findAll('.ml-gantt__group').map((g) => g.text())).toEqual(['設計2', '開發1'])
    expect(wrapper.findAll('.ml-gantt__bar')).toHaveLength(3)
    expect(wrapper.findAll('.ml-gantt__milestone')).toHaveLength(1)
    expect(wrapper.findAll('.ml-gantt__dep')).toHaveLength(2)
    expect(wrapper.findAll('.ml-gantt__weekend').length).toBeGreaterThan(0)
    expect(wrapper.find('.ml-gantt__scale').text()).toContain('2026 年 3 月')
    expect(wrapper.find('.ml-gantt__scale--fine').text()).toContain('週一')
    expect(wrapper.find('.ml-gantt__today').exists()).toBe(true)
    expect(wrapper.findAll('table tbody tr')).toHaveLength(4)
    expect(wrapper.find('.ml-gantt__bar').attributes('aria-label')).toContain('2026/3/2 – 2026/3/6')
  })

  it('week and month scales label their cells', () => {
    wrapper = mount(MlGantt, { props: { tasks: launch, scale: 'week', today: false } })
    expect(wrapper.find('.ml-gantt__scale--fine').text()).toContain('3/2')
    expect(wrapper.find('.ml-gantt__weekend').exists()).toBe(false)
    expect(wrapper.find('.ml-gantt__today').exists()).toBe(false)
    wrapper.unmount()
    wrapper = mount(MlGantt, { props: { tasks: launch, scale: 'month', today: false } })
    expect(wrapper.find('.ml-gantt__scale').text()).toContain('2026 年')
    expect(wrapper.find('.ml-gantt__scale--fine').text()).toContain('3月')
  })

  it('groups collapse and expand', async () => {
    wrapper = mount(MlGantt, { props: { tasks: launch } })
    const toggle = wrapper.find('.ml-gantt__group')
    expect(toggle.attributes('aria-expanded')).toBe('true')
    await toggle.trigger('click')
    expect(wrapper.find('.ml-gantt__group').attributes('aria-expanded')).toBe('false')
    expect(wrapper.findAll('.ml-gantt__bar')).toHaveLength(1)
    expect(wrapper.findAll('.ml-gantt__dep')).toHaveLength(0)
  })

  it('keyboard: ↑ ↓ move between bars; editable ← → move and resize', async () => {
    wrapper = mount(MlGantt, { props: { tasks: launch, editable: true }, attachTo: document.body })
    const body = wrapper.find('.ml-gantt__body')
    await body.trigger('keydown', { key: 'ArrowDown' })
    await nextTick()
    expect((document.activeElement as HTMLElement).dataset.id).toBe('ux')
    await body.trigger('keydown', { key: 'ArrowRight' })
    const [task, range] = wrapper.emitted('change')![0] as [MlGanttTask, { start: Date; end: Date }]
    expect(task.id).toBe('ux')
    expect(ganttISO(ganttDay(range.start))).toBe('2026-03-03')
    expect(ganttISO(ganttDay(range.end))).toBe('2026-03-07')
    await body.trigger('keydown', { key: 'ArrowLeft', shiftKey: true })
    const [, r2] = wrapper.emitted('change')![1] as [MlGanttTask, { start: Date; end: Date }]
    expect(ganttISO(ganttDay(r2.start))).toBe('2026-03-02')
    expect(ganttISO(ganttDay(r2.end))).toBe('2026-03-05')
    expect(wrapper.find('[aria-live]').text()).toContain('使用者研究')
  })

  it('dragging a bar or its edge snaps to whole days', async () => {
    wrapper = mount(MlGantt, { props: { tasks: launch, editable: true }, attachTo: document.body })
    const bar = wrapper.findAll('.ml-gantt__bar')[1]
    bar.element.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, clientX: 100, pointerId: 1 }))
    window.dispatchEvent(new PointerEvent('pointermove', { clientX: 166, pointerId: 1 }))
    await nextTick()
    expect(wrapper.find('.ml-gantt__bar--draft').exists()).toBe(true)
    window.dispatchEvent(new PointerEvent('pointerup', { clientX: 166, pointerId: 1 }))
    const [task, range] = wrapper.emitted('change')![0] as [MlGanttTask, { start: Date; end: Date }]
    expect(task.id).toBe('ui')
    expect(ganttISO(ganttDay(range.start))).toBe('2026-03-11')
    const handle = wrapper.findAll('.ml-gantt__handle')[0]
    handle.element.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, clientX: 100, pointerId: 2 }))
    window.dispatchEvent(new PointerEvent('pointermove', { clientX: 36, pointerId: 2 }))
    window.dispatchEvent(new PointerEvent('pointerup', { clientX: 36, pointerId: 2 }))
    const [t2, r2] = wrapper.emitted('change')![1] as [MlGanttTask, { start: Date; end: Date }]
    expect(t2.id).toBe('ux')
    expect(ganttISO(ganttDay(r2.start))).toBe('2026-03-02')
    expect(ganttISO(ganttDay(r2.end))).toBe('2026-03-04')
  })

  it('not editable: no handles, arrows do nothing', async () => {
    wrapper = mount(MlGantt, { props: { tasks: launch } })
    expect(wrapper.find('.ml-gantt__handle').exists()).toBe(false)
    await wrapper.find('.ml-gantt__body').trigger('keydown', { key: 'ArrowRight' })
    expect(wrapper.emitted('change')).toBeUndefined()
  })

  it('English month and weekday names', () => {
    wrapper = mount({ render: () => h(MlConfigProvider, { locale: en }, () => h(MlGantt, { tasks: launch })) })
    expect(wrapper.find('.ml-gantt__scale').text()).toContain('March 2026')
    expect(wrapper.find('.ml-gantt__scale--fine').text()).toContain('Mon')
  })
})

/* ── Candlestick ────────────────────────────────────────── */
describe('candlestick maths', () => {
  it('moving averages', () => {
    expect(movingAverage([1, 2, 3, 4, 5], 3)).toEqual([null, null, 2, 3, 4])
    expect(movingAverage([10, 20], 1)).toEqual([10, 20])
    expect(movingAverage([1, 2], 5)).toEqual([null, null])
  })

  it('ranges clamp, zoom around an anchor and pan', () => {
    expect(clampRange({ start: -5, count: 20 }, 100)).toEqual({ start: 0, count: 20 })
    expect(clampRange({ start: 95, count: 20 }, 100)).toEqual({ start: 80, count: 20 })
    expect(clampRange({ start: 0, count: 2 }, 100)).toEqual({ start: 0, count: 8 })
    expect(clampRange({ start: 0, count: 50 }, 5)).toEqual({ start: 0, count: 5 })
    expect(clampRange({ start: 3, count: 4 }, 0)).toEqual({ start: 0, count: 0 })
    expect(initialRange(100, 30)).toEqual({ start: 70, count: 30 })
    // Zoom in on the right edge keeps the last candle visible.
    expect(zoomRange({ start: 70, count: 30 }, 0.5, 100, 1)).toEqual({ start: 85, count: 15 })
    // Anchored in the middle: the middle candle stays put.
    const z = zoomRange({ start: 40, count: 20 }, 2, 100, 0.5)
    expect(z).toEqual({ start: 30, count: 40 })
    expect(zoomRange({ start: 0, count: 100 }, 2, 100)).toEqual({ start: 0, count: 100 })
    expect(zoomRange({ start: 0, count: 9 }, 0.95, 100, 0).count).toBe(8)
    expect(panRange({ start: 10, count: 20 }, -50, 100)).toEqual({ start: 0, count: 20 })
    expect(panRange({ start: 10, count: 20 }, 5, 100)).toEqual({ start: 15, count: 20 })
  })

  it('price and volume scales', () => {
    const candles: MlCandle[] = [
      { time: 1, open: 101, high: 104.2, low: 99.5, close: 103, volume: 1200 },
      { time: 2, open: 103, high: 106, low: 102, close: 102.5, volume: 3400 },
    ]
    const s = priceScale(candles, [null, 98.7])
    expect(s.lo).toBeLessThanOrEqual(98.7)
    expect(s.hi).toBeGreaterThanOrEqual(106)
    expect(s.values.length).toBeGreaterThan(2)
    expect(volumeScale(candles)).toBeGreaterThanOrEqual(3400)
    expect(volumeScale([])).toBe(1)
    expect(candleChange(candles, 1).change).toBe(-0.5)
    expect(candleChange(candles, 1).percent).toBeCloseTo((-0.5 / 103) * 100)
    expect(candleChange(candles, 0).change).toBe(2)
  })

  it('times and axis labels', () => {
    expect(candleTime('2026-03-02')).toBe(new Date(2026, 2, 2).getTime())
    const day = 86_400_000
    expect(isIntraday([0, day, 2 * day])).toBe(false)
    expect(isIntraday([0, 300_000])).toBe(true)
    const t = new Date(2026, 2, 2, 9, 5).getTime()
    expect(candleTimeLabel(t, false)).toBe('3/2')
    expect(candleTimeLabel(t, true, t - 300_000)).toBe('09:05')
    expect(candleTimeLabel(t, true, t - day)).toBe('3/2')
    expect(timeTicks({ start: 0, count: 20 }, 10, 50)).toEqual([0, 5, 10, 15])
    expect(timeTicks({ start: 3, count: 10 }, 100)).toEqual([3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
  })
})

/** A deterministic random walk of daily candles from 2026-01-05. */
function walk(n: number, start = 600): MlCandle[] {
  const out: MlCandle[] = []
  let price = start
  let seed = 7
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
  const d = new Date(2026, 0, 5)
  for (let i = 0; i < n; i++) {
    const open = price
    const close = Math.round((open + (rnd() - 0.48) * 14) * 2) / 2
    const high = Math.max(open, close) + Math.round(rnd() * 8) / 2
    const low = Math.min(open, close) - Math.round(rnd() * 8) / 2
    out.push({ time: `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`, open, high, low, close, volume: Math.round(20000 + rnd() * 30000) })
    price = close
    d.setDate(d.getDate() + 1)
  }
  return out
}

describe('MlCandlestick', { timeout: 30_000 }, () => {
  const data = walk(120)

  it('shows the latest window with volume, MAs, axis and table', () => {
    wrapper = mount(MlCandlestick, { props: { data, visible: 40, ma: [5, 20] } })
    expect(wrapper.findAll('.ml-candle__k')).toHaveLength(40)
    expect(wrapper.findAll('.ml-candle__vol')).toHaveLength(40)
    expect(wrapper.findAll('.ml-candle__ma')).toHaveLength(2)
    expect(wrapper.findAll('.ml-candle__ma-key').map((k) => k.text())).toEqual([expect.stringMatching(/^MA5\d/), expect.stringMatching(/^MA20\d/)])
    expect(wrapper.findAll('table tbody tr')).toHaveLength(120)
    expect(wrapper.find('.ml-candle__legend').text()).toContain(String(data[119].close))
    expect(wrapper.classes()).toContain('ml-candle--up-red')
  })

  it('Taiwan colours by default, flipped with upColor', () => {
    wrapper = mount(MlCandlestick, { props: { data: data.slice(0, 20), upColor: 'green', volume: false } })
    expect(wrapper.classes()).toContain('ml-candle--up-green')
    expect(wrapper.find('.ml-candle__vol').exists()).toBe(false)
    const ups = data.slice(0, 20).filter((c) => c.close > c.open).length
    expect(wrapper.findAll('.ml-candle__k--up')).toHaveLength(ups)
  })

  it('zoom buttons, keyboard crosshair and panning past the edge', async () => {
    wrapper = mount(MlCandlestick, { props: { data, visible: 40 } })
    const [zin, zout, reset] = wrapper.findAll('.ml-candle__tool')
    await zin.trigger('click')
    expect(wrapper.findAll('.ml-candle__k')).toHaveLength(30)
    await zout.trigger('click')
    await zout.trigger('click')
    expect(wrapper.findAll('.ml-candle__k')).toHaveLength(53)
    await reset.trigger('click')
    expect(wrapper.findAll('.ml-candle__k')).toHaveLength(40)
    const plot = wrapper.find('.ml-candle__plot')
    await plot.trigger('keydown', { key: 'ArrowLeft' })
    expect(wrapper.find('.ml-candle__cross').exists()).toBe(true)
    expect(wrapper.find('.ml-candle__legend').text()).toContain(String(data[119].close))
    await plot.trigger('keydown', { key: 'ArrowLeft' })
    expect(wrapper.find('[aria-live]').text()).toContain(String(data[118].close))
    await plot.trigger('keydown', { key: 'Home' })
    expect(wrapper.find('.ml-candle__legend').text()).toContain('2026/1/5')
    expect(wrapper.find('.ml-candle__plot').attributes('aria-label')).toContain('2026/1/5')
    await plot.trigger('keydown', { key: '+' })
    expect(wrapper.findAll('.ml-candle__k')).toHaveLength(30)
    await plot.trigger('keydown', { key: 'Escape' })
    expect(wrapper.find('.ml-candle__cross').exists()).toBe(false)
  })

  it('drag pans the window and the wheel zooms', async () => {
    wrapper = mount(MlCandlestick, { props: { data, visible: 40 }, attachTo: document.body })
    const plot = wrapper.find('.ml-candle__plot')
    // happy-dom has no layout: the plot is 600px wide → 540px of candles, 13.5px each.
    plot.element.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, clientX: 300, pointerId: 1 }))
    window.dispatchEvent(new PointerEvent('pointermove', { clientX: 435, pointerId: 1 }))
    window.dispatchEvent(new PointerEvent('pointerup', { clientX: 435, pointerId: 1 }))
    await nextTick()
    // Dragged 135px right = 10 candles back: the window now ends on candle 109.
    const end = new Date(2026, 0, 5 + 109)
    expect(wrapper.find('.ml-candle__plot').attributes('aria-label')).toContain(`至 ${end.getFullYear()}/${end.getMonth() + 1}/${end.getDate()}`)
    const before = wrapper.findAll('.ml-candle__k').length
    const wheel = new WheelEvent('wheel', { deltaY: -100, clientX: 300, bubbles: true, cancelable: true })
    plot.element.dispatchEvent(wheel)
    await nextTick()
    expect(wrapper.findAll('.ml-candle__k').length).toBeLessThan(before)
    expect(wheel.defaultPrevented).toBe(true)
  })

  it('appending a candle keeps the window pinned to the end', async () => {
    wrapper = mount(MlCandlestick, { props: { data: data.slice(0, 100), visible: 30 } })
    await wrapper.setProps({ data: data.slice(0, 101) })
    expect(wrapper.find('.ml-candle__legend').text()).toContain(String(data[100].close))
  })
})

describe('ganttTipLeft', () => {
  it('keeps the tooltip inside the visible timeline', () => {
    expect(ganttTipLeft(300, null)).toBe(300)
    expect(ganttTipLeft(300, { scroll: 0, width: 400 })).toBe(300)
    expect(ganttTipLeft(390, { scroll: 0, width: 400 })).toBe(308)
    expect(ganttTipLeft(20, { scroll: 0, width: 400 })).toBe(92)
    expect(ganttTipLeft(20, { scroll: 200, width: 400 })).toBe(292)
    // Too narrow to clamp: leave it centred on the bar.
    expect(ganttTipLeft(50, { scroll: 0, width: 150 })).toBe(50)
  })
})
