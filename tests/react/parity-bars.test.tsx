import { describe, expect, it } from 'vitest'
import * as V from '../../src'
import { BarChart } from '../../src/react/charts'
import { react, vue } from './parity-utils'

const labels = ['一月', '二月', '三月']
const series = [
  { name: '線上', data: [40, 55, -10] },
  { name: '門市', data: [20, 25, 30], tone: 'tech' as const },
  { name: '批發', data: [5, 0, 12], color: '#9ea7b5' },
]
const fmt = (v: number) => `${v}K`

const cases: [string, () => Promise<string>, () => string][] = [
  ['BarChart single (unchanged)', () => vue(V.MlBarChart, { data: [{ label: 'A', value: 3 }, { label: 'B', value: 7 }], highlight: 0, tone: 'tech' }), () => react(<BarChart data={[{ label: 'A', value: 3 }, { label: 'B', value: 7 }]} highlight={0} tone="tech" />)],
  ['BarChart grouped', () => vue(V.MlBarChart, { series, labels }), () => react(<BarChart series={series} labels={labels} />)],
  [
    'BarChart stacked + totals',
    () => vue(V.MlBarChart, { series, labels, mode: 'stacked', showTotal: true, format: fmt }),
    () => react(<BarChart series={series} labels={labels} mode="stacked" showTotal format={fmt} />),
  ],
  [
    'BarChart percent, no legend, custom label',
    () => vue(V.MlBarChart, { series, labels, mode: 'percent', showTotal: true, legend: false, label: 'Mix', ticks: 5 }),
    () => react(<BarChart series={series} labels={labels} mode="percent" showTotal legend={false} label="Mix" ticks={5} />),
  ],
  ['BarChart single series, missing labels', () => vue(V.MlBarChart, { series: [series[0]], mode: 'stacked' }), () => react(<BarChart series={[series[0]]} mode="stacked" />)],
  ['BarChart empty series', () => vue(V.MlBarChart, { series: [] }), () => react(<BarChart series={[]} />)],
]

describe('React ↔ Vue markup parity: BarChart multi-series', () => {
  for (const [name, fromVue, fromReact] of cases) {
    it(name, async () => {
      expect(fromReact()).toBe(await fromVue())
    })
  }
})
