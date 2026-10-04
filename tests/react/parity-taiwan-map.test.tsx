// Markup parity for MlTaiwanMap ↔ TaiwanMap (see parity.test.tsx).
import { describe, expect, it } from 'vitest'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { renderToStaticMarkup } from 'react-dom/server'
import * as V from '../../src'
import MlConfigProvider from '../../src/components/MlConfigProvider.vue'
import * as R from '../../src/react/taiwan-map'
import { ConfigProvider } from '../../src/react/locale'
import { en } from '../../src/locale-data'
import { react, signature, vue } from './parity-utils'

const data = { 臺北市: 247, 新北市: 404, 台中市: 286, 高雄市: 272, 花蓮縣: 32, 連江縣: 1.4 }
const list = [
  { county: '桃園市', value: 233 },
  { county: 'Tainan', value: 185 },
]
const fmt = (v: number) => `${v} 萬`

const cases: [string, () => Promise<string>, () => string][] = [
  ['empty', () => vue(V.MlTaiwanMap), () => react(<R.TaiwanMap />)],
  ['data + gradient legend', () => vue(V.MlTaiwanMap, { data, format: fmt, valueLabel: '人口' }), () => react(<R.TaiwanMap data={data} format={fmt} valueLabel="人口" />)],
  ['list + tech + steps', () => vue(V.MlTaiwanMap, { data: list, tone: 'tech', steps: 3 }), () => react(<R.TaiwanMap data={list} tone="tech" steps={3} />)],
  [
    'quantile + labels + selection + highlight + disabled',
    () => vue(V.MlTaiwanMap, { data, scale: 'quantile', labels: true, selected: '臺北市', highlight: ['高雄市'], disabled: ['金門縣'], height: 320 }),
    () => react(<R.TaiwanMap data={data} scale="quantile" labels selected="臺北市" highlight={['高雄市']} disabled={['金門縣']} height={320} />),
  ],
  [
    'multiple, not selectable, no legend',
    () => vue(V.MlTaiwanMap, { data, multiple: true, selected: ['新北市', '台中市'], selectable: false, legend: false, label: '地圖' }),
    () => react(<R.TaiwanMap data={data} multiple selected={['新北市', '台中市']} selectable={false} legend={false} label="地圖" />),
  ],
  [
    'English locale',
    async () => signature(await renderToString(createSSRApp({ render: () => h(MlConfigProvider, { locale: en }, () => h(V.MlTaiwanMap, { data, labels: true })) }))),
    () => signature(renderToStaticMarkup(<ConfigProvider locale={en}><R.TaiwanMap data={data} labels /></ConfigProvider>)),
  ],
]

describe('React ↔ Vue markup parity: TaiwanMap', () => {
  for (const [name, fromVue, fromReact] of cases) {
    it(name, async () => {
      expect(fromReact()).toBe(await fromVue())
    })
  }
})
