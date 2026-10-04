// Markup parity for MlTreemap / MlSankey / MlGantt / MlCandlestick ↔ Treemap / Sankey / Gantt / Candlestick (see parity.test.tsx).
import { describe, expect, it } from 'vitest'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { renderToStaticMarkup } from 'react-dom/server'
import * as V from '../../src'
import MlConfigProvider from '../../src/components/MlConfigProvider.vue'
import * as R from '../../src/react'
import { ConfigProvider } from '../../src/react/locale'
import { en } from '../../src/locale-data'
import type { MlCandle, MlGanttTask, MlSankeyLink, MlSankeyNode, MlTreemapDatum } from '../../src'
import { react, signature, vue } from './parity-utils'

const budget: MlTreemapDatum[] = [
  { label: '社福', value: 0, children: [{ label: '年金', value: 300 }, { label: '長照', value: 120 }, { label: '托育', value: 6 }] },
  { label: '教育', value: 320, tone: 'tech' },
  { label: '國防', value: 260, id: 'def' },
  { label: '其他', value: 3 },
]
const nodes: MlSankeyNode[] = [
  { id: 'a', label: '燃煤' },
  { id: 'b', label: '燃氣', tone: 'tech' },
  { id: 'g', label: '電網' },
  { id: 'h', label: '住宅' },
  { id: 'i', label: '工業' },
]
const links: MlSankeyLink[] = [
  { source: 'a', target: 'g', value: 40 },
  { source: 'b', target: 'g', value: 45 },
  { source: 'g', target: 'h', value: 30 },
  { source: 'g', target: 'i', value: 55 },
  { source: 'i', target: 'a', value: 5 },
]
const tasks: MlGanttTask[] = [
  { id: 'k', label: '啟動', start: '2026-03-02', end: '2026-03-02', milestone: true },
  { id: 'u', label: '研究', start: '2026-03-02', end: '2026-03-06', progress: 1, group: '設計' },
  { id: 'v', label: '介面', start: '2026-03-09', end: '2026-03-13', progress: 0.4, group: '設計', deps: ['u'] },
  { id: 'd', label: '開發', start: '2026-03-16', end: '2026-04-03', group: '開發', deps: ['v'], tone: 'tech' },
]
const candles: MlCandle[] = Array.from({ length: 30 }, (_, i) => {
  const open = 100 + Math.sin(i / 3) * 6
  const close = open + Math.cos(i * 1.7) * 3
  return {
    time: `2026-02-${String(i % 28 + 1).padStart(2, '0')}`,
    open: +open.toFixed(2),
    close: +close.toFixed(2),
    high: +(Math.max(open, close) + 1.2).toFixed(2),
    low: +(Math.min(open, close) - 1.1).toFixed(2),
    volume: 1000 + i * 37,
  }
})

const cases: [string, () => Promise<string>, () => string][] = [
  ['Treemap', () => vue(V.MlTreemap, { data: budget }), () => react(<R.Treemap data={budget} />)],
  [
    'Treemap: selectable, selected, palette, no labels',
    () => vue(V.MlTreemap, { data: budget, selectable: true, selected: 'def', tone: ['steel', 'bean'], labels: false, height: 200, label: '預算' }),
    () => react(<R.Treemap data={budget} selectable selected="def" tone={['steel', 'bean']} labels={false} height={200} label="預算" />),
  ],
  ['Sankey', () => vue(V.MlSankey, { nodes, links }), () => react(<R.Sankey nodes={nodes} links={links} />)],
  [
    'Sankey: size, tone, no labels',
    () => vue(V.MlSankey, { nodes, links, width: 400, height: 200, nodeWidth: 8, nodePadding: 6, tone: 'bean', labels: false, format: (v: number) => `${v} GWh` }),
    () => react(<R.Sankey nodes={nodes} links={links} width={400} height={200} nodeWidth={8} nodePadding={6} tone="bean" labels={false} format={(v) => `${v} GWh`} />),
  ],
  ['Gantt', () => vue(V.MlGantt, { tasks, today: '2026-03-10' }), () => react(<R.Gantt tasks={tasks} today="2026-03-10" />)],
  [
    'Gantt: week, editable, no today',
    () => vue(V.MlGantt, { tasks, scale: 'week', editable: true, today: false, tone: 'bean', rowHeight: 30, sideWidth: 120 }),
    () => react(<R.Gantt tasks={tasks} scale="week" editable today={false} tone="bean" rowHeight={30} sideWidth={120} />),
  ],
  ['Gantt: month', () => vue(V.MlGantt, { tasks, scale: 'month' }), () => react(<R.Gantt tasks={tasks} scale="month" />)],
  ['Candlestick', () => vue(V.MlCandlestick, { data: candles }), () => react(<R.Candlestick data={candles} />)],
  [
    'Candlestick: MAs, green up, window, no volume',
    () => vue(V.MlCandlestick, { data: candles, ma: [5, 10], upColor: 'green', visible: 12, volume: false, height: 200, label: '加權指數' }),
    () => react(<R.Candlestick data={candles} ma={[5, 10]} upColor="green" visible={12} volume={false} height={200} label="加權指數" />),
  ],
  [
    'English locale',
    async () =>
      signature(
        await renderToString(
          createSSRApp({
            render: () =>
              h(MlConfigProvider, { locale: en }, () => [
                h(V.MlTreemap, { data: budget }),
                h(V.MlSankey, { nodes, links }),
                h(V.MlGantt, { tasks, today: false }),
                h(V.MlCandlestick, { data: candles, ma: [5] }),
              ]),
          }),
        ),
      ),
    () =>
      signature(
        renderToStaticMarkup(
          <ConfigProvider locale={en}>
            <R.Treemap data={budget} />
            <R.Sankey nodes={nodes} links={links} />
            <R.Gantt tasks={tasks} today={false} />
            <R.Candlestick data={candles} ma={[5]} />
          </ConfigProvider>,
        ),
      ),
  ],
]

describe('React ↔ Vue markup parity: Treemap, Sankey, Gantt, Candlestick', () => {
  for (const [name, fromVue, fromReact] of cases) {
    it(name, async () => {
      expect(fromReact()).toBe(await fromVue())
    })
  }

  it('attributes that matter match too (paths, positions, labels)', async () => {
    const pick = (html: string) =>
      [...html.matchAll(/ (d|aria-label|x|y|width|height|viewBox|tabindex|x1|x2|y1|y2)="([^"]*)"/g)].map((m) => `${m[1].toLowerCase()}=${m[2]}`).join('\n')
    const vueHtml = await renderToString(
      createSSRApp({
        render: () => [h(V.MlTreemap, { data: budget }), h(V.MlSankey, { nodes, links }), h(V.MlGantt, { tasks, today: false }), h(V.MlCandlestick, { data: candles, ma: [5] })],
      }),
    )
    const reactHtml = renderToStaticMarkup(
      <>
        <R.Treemap data={budget} />
        <R.Sankey nodes={nodes} links={links} />
        <R.Gantt tasks={tasks} today={false} />
        <R.Candlestick data={candles} ma={[5]} />
      </>,
    )
    expect(pick(reactHtml.replaceAll('tabIndex', 'tabindex'))).toBe(pick(vueHtml))
  })
})
