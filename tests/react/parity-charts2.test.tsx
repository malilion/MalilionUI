import { describe, expect, it } from 'vitest'
import * as V from '../../src'
import { FunnelChart, ScatterChart } from '../../src/react/charts'
import { react, vue } from './parity-utils'

const series = [
  { name: 'A', points: [{ x: 1, y: 10 }, { x: 3, y: 30 }, { x: 5, y: 52 }] },
  { name: 'B', tone: 'tech' as const, trend: false, points: [{ x: 2, y: 25, size: 4, label: 'Beta' }, { x: 4, y: 12, size: 16 }] },
]
const funnel = [
  { label: '造訪', value: 1000 },
  { label: '加入', value: 400 },
  { label: '付款', value: 100, tone: 'success' as const },
]
const fmt = (v: number) => `${v}%`

const cases: [string, () => Promise<string>, () => string][] = [
  ['ScatterChart', () => vue(V.MlScatterChart, { series, trend: true }), () => react(<ScatterChart series={series} trend />)],
  [
    'ScatterChart titles + paw',
    () => vue(V.MlScatterChart, { series, shape: 'paw', xTitle: 'X 軸', yTitle: 'Y 軸', format: fmt, legend: false }),
    () => react(<ScatterChart series={series} shape="paw" xTitle="X 軸" yTitle="Y 軸" format={fmt} legend={false} />),
  ],
  ['ScatterChart diamond single', () => vue(V.MlScatterChart, { series: [series[0]], shape: 'diamond', label: 'Sales', xFormat: fmt }), () => react(<ScatterChart series={[series[0]]} shape="diamond" label="Sales" xFormat={fmt} />)],
  ['ScatterChart empty', () => vue(V.MlScatterChart, { series: [] }), () => react(<ScatterChart series={[]} />)],
  ['FunnelChart', () => vue(V.MlFunnelChart, { data: funnel }), () => react(<FunnelChart data={funnel} />)],
  [
    'FunnelChart horizontal rect',
    () => vue(V.MlFunnelChart, { data: funnel, orientation: 'horizontal', shape: 'rect', tone: 'tech', share: false, format: fmt, label: 'Funnel' }),
    () => react(<FunnelChart data={funnel} orientation="horizontal" shape="rect" tone="tech" share={false} format={fmt} label="Funnel" />),
  ],
  ['FunnelChart empty', () => vue(V.MlFunnelChart, { data: [] }), () => react(<FunnelChart data={[]} />)],
]

describe('React ↔ Vue markup parity: ScatterChart, FunnelChart', () => {
  for (const [name, fromVue, fromReact] of cases) {
    it(name, async () => {
      expect(fromReact()).toBe(await fromVue())
    })
  }
})
