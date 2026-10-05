// Markup parity for MlFilterBar / MlQueryBuilder / MlWaterfallChart / MlBoxPlot / MlBulletChart ↔ React.
import { describe, expect, it } from 'vitest'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { renderToStaticMarkup } from 'react-dom/server'
import * as V from '../../src'
import MlConfigProvider from '../../src/components/MlConfigProvider.vue'
import * as R from '../../src/react'
import { ConfigProvider } from '../../src/react/locale'
import { en } from '../../src/locale-data'
import { react, signature, vue } from './parity-utils'

const fields: V.MlFilterField[] = [
  { key: 'q', label: '關鍵字', type: 'text', placeholder: '搜尋' },
  { key: 'status', label: '狀態', type: 'select', options: [{ value: 'paid', label: '已付款' }] },
  { key: 'city', label: '縣市', type: 'multi', options: [{ value: 'tpe', label: '台北' }, { value: 'khh', label: '高雄' }] },
  { key: 'day', label: '日期', type: 'date' },
  { key: 'when', label: '期間', type: 'date-range' },
  { key: 'amount', label: '金額', type: 'number-range' },
]
const value = { q: '獅', status: 'paid', city: ['tpe'], amount: [100, null] }
const qFields: V.MlQueryField[] = [
  { key: 'name', label: '姓名', type: 'text' },
  { key: 'age', label: '年齡', type: 'number' },
  { key: 'city', label: '縣市', type: 'select', options: [{ value: 'tpe', label: '台北' }, { value: 'khh', label: '高雄' }] },
  { key: 'vip', label: 'VIP', type: 'boolean' },
]
const query: V.MlQueryGroup = {
  id: 'root',
  combinator: 'and',
  rules: [
    { id: 'a', field: 'city', operator: 'in', value: ['tpe'] },
    { id: 'b', field: 'city', operator: 'eq', value: 'khh' },
    { id: 'c', field: 'name', operator: 'contains', value: '獅' },
    {
      id: 'g',
      combinator: 'or',
      rules: [
        { id: 'd', field: 'age', operator: 'between', value: [30, 40] },
        { id: 'e', field: 'vip', operator: 'isTrue' },
      ],
    },
  ],
}
const steps = [{ label: '期初', value: 1000, total: true }, { label: '營收', value: 500 }, { label: '成本', value: -800 }, { label: '期末', total: true }]
const boxes = [{ label: 'A', values: [1, 2, 3, 4, 5, 6, 7, 8, 9, 100] }, { label: 'B', stats: { min: 1, q1: 2, median: 3, q3: 4, max: 5 }, tone: 'tech' as const }, { label: 'C', values: [] }]
const bullets = [{ label: '營收', sublabel: '萬', value: 270, target: 250, ranges: [150, 225, 300] }, { label: '滿意度', value: 4.6, ranges: [3.5, 4.25, 5], max: 5, tone: 'tech' as const }]

const cases: [string, () => Promise<string>, () => string][] = [
  ['FilterBar', () => vue(V.MlFilterBar, { fields }), () => react(<R.FilterBar fields={fields} />)],
  ['FilterBar: values, chips, folded', () => vue(V.MlFilterBar, { fields, modelValue: value, collapse: 3, size: 'sm' }), () => react(<R.FilterBar fields={fields} value={value} collapse={3} size="sm" />)],
  ['QueryBuilder', () => vue(V.MlQueryBuilder, { fields: qFields, modelValue: query, showText: true }), () => react(<R.QueryBuilder fields={qFields} value={query} showText />)],
  ['QueryBuilder: empty, depth 1, disabled', () => vue(V.MlQueryBuilder, { fields: qFields, maxDepth: 1, disabled: true }), () => react(<R.QueryBuilder fields={qFields} maxDepth={1} disabled />)],
  ['WaterfallChart', () => vue(V.MlWaterfallChart, { data: steps }), () => react(<R.WaterfallChart data={steps} />)],
  ['WaterfallChart: green, no values', () => vue(V.MlWaterfallChart, { data: steps, upColor: 'green', showValues: false, height: 120 }), () => react(<R.WaterfallChart data={steps} upColor="green" showValues={false} height={120} />)],
  ['BoxPlot', () => vue(V.MlBoxPlot, { data: boxes }), () => react(<R.BoxPlot data={boxes} />)],
  ['BoxPlot: no mean', () => vue(V.MlBoxPlot, { data: boxes, showMean: false, tone: 'bean' }), () => react(<R.BoxPlot data={boxes} showMean={false} tone="bean" />)],
  ['BulletChart', () => vue(V.MlBulletChart, { data: bullets }), () => react(<R.BulletChart data={bullets} />)],
  ['BulletChart: no axis', () => vue(V.MlBulletChart, { data: bullets, axis: false, bandLabels: ['L', 'M', 'H'] }), () => react(<R.BulletChart data={bullets} axis={false} bandLabels={['L', 'M', 'H']} />)],
  [
    'English locale',
    async () =>
      signature(
        await renderToString(
          createSSRApp({
            render: () =>
              h(MlConfigProvider, { locale: en }, () => [
                h(V.MlFilterBar, { fields, modelValue: value, collapse: 2 }),
                h(V.MlQueryBuilder, { fields: qFields, modelValue: query, showText: true }),
                h(V.MlWaterfallChart, { data: steps }),
                h(V.MlBoxPlot, { data: boxes }),
                h(V.MlBulletChart, { data: bullets }),
              ]),
          }),
        ),
      ),
    () =>
      signature(
        renderToStaticMarkup(
          <ConfigProvider locale={en}>
            <R.FilterBar fields={fields} value={value} collapse={2} />
            <R.QueryBuilder fields={qFields} value={query} showText />
            <R.WaterfallChart data={steps} />
            <R.BoxPlot data={boxes} />
            <R.BulletChart data={bullets} />
          </ConfigProvider>,
        ),
      ),
  ],
]

describe('React ↔ Vue markup parity: FilterBar, QueryBuilder, Waterfall, BoxPlot, Bullet', () => {
  for (const [name, fromVue, fromReact] of cases) {
    it(name, async () => {
      expect(fromReact()).toBe(await fromVue())
    })
  }

  it('attributes match too', async () => {
    const pick = (html: string) =>
      [...html.matchAll(/<[a-z]+([^>]*)>/gi)]
        .map((tag) =>
          [...tag[1].matchAll(/ (role|aria-label|aria-checked|aria-expanded|aria-live|placeholder|type|disabled)(?:="([^"]*)")?(?=[\s/>]|$)/gi)]
            .map((m) => `${m[1].toLowerCase()}=${m[2] ?? ''}`)
            .sort()
            .join(' '),
        )
        .filter(Boolean)
        .join('\n')
    const pct = (html: string) => [...html.matchAll(/(bottom|height|left|width):\s?([\d.]+)%/g)].map((m) => `${m[1]}${(+m[2]).toFixed(3)}`).join(',')
    const vueHtml = await renderToString(
      createSSRApp({
        render: () => [h(V.MlQueryBuilder, { fields: qFields, modelValue: query }), h(V.MlWaterfallChart, { data: steps }), h(V.MlBoxPlot, { data: boxes }), h(V.MlBulletChart, { data: bullets })],
      }),
    )
    const reactHtml = renderToStaticMarkup(
      <>
        <R.QueryBuilder fields={qFields} value={query} />
        <R.WaterfallChart data={steps} />
        <R.BoxPlot data={boxes} />
        <R.BulletChart data={bullets} />
      </>,
    )
    expect(pick(reactHtml)).toBe(pick(vueHtml))
    expect(pct(reactHtml)).toBe(pct(vueHtml))
  })
})
