// Markup parity for MlTaiwanRegion ↔ TaiwanRegion (see parity.test.tsx).
import { describe, expect, it } from 'vitest'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { renderToStaticMarkup } from 'react-dom/server'
import * as V from '../../src'
import MlConfigProvider from '../../src/components/MlConfigProvider.vue'
import * as R from '../../src/react/region'
import { ConfigProvider } from '../../src/react/locale'
import { en } from '../../src/locale-data'
import { react, signature, vue } from './parity-utils'

const tpe = { county: '臺北市', district: '中正區', zip: '100' }
const hsz = { county: '新竹市', district: '香山區', zip: '300' }

const cases: [string, () => Promise<string>, () => string][] = [
  ['empty', () => vue(V.MlTaiwanRegion, { label: '地區', id: 'r' }), () => react(<R.TaiwanRegion label="地區" id="r" />)],
  ['value', () => vue(V.MlTaiwanRegion, { modelValue: tpe, index: '01', hint: 'h', clearable: true, id: 'r' }), () => react(<R.TaiwanRegion value={tpe} index="01" hint="h" clearable id="r" />)],
  ['no zip, sm, required', () => vue(V.MlTaiwanRegion, { modelValue: hsz, zip: false, size: 'sm', required: true, label: 'L', id: 'r' }), () => react(<R.TaiwanRegion value={hsz} zip={false} size="sm" required label="L" id="r" />)],
  ['error + disabled', () => vue(V.MlTaiwanRegion, { error: 'Bad', disabled: true, clearable: true, modelValue: tpe, id: 'r' }), () => react(<R.TaiwanRegion error="Bad" disabled clearable value={tpe} id="r" />)],
  ['islands + en', () => vue(V.MlTaiwanRegion, { modelValue: { county: '高雄市', district: '新興區', zip: '800' }, includeIslands: true, lang: 'en', id: 'r' }), () => react(<R.TaiwanRegion value={{ county: '高雄市', district: '新興區', zip: '800' }} includeIslands lang="en" id="r" />)],
  ['search', () => vue(V.MlTaiwanRegion, { variant: 'search', label: '搜尋', id: 's' }), () => react(<R.TaiwanRegion variant="search" label="搜尋" id="s" />)],
  ['search value', () => vue(V.MlTaiwanRegion, { variant: 'search', modelValue: hsz, clearable: true, hint: 'h', id: 's' }), () => react(<R.TaiwanRegion variant="search" value={hsz} clearable hint="h" id="s" />)],
  [
    'English locale',
    async () => signature(await renderToString(createSSRApp({ render: () => h(MlConfigProvider, { locale: en }, () => h(V.MlTaiwanRegion, { modelValue: tpe, id: 'r' })) }))),
    () => signature(renderToStaticMarkup(<ConfigProvider locale={en}><R.TaiwanRegion value={tpe} id="r" /></ConfigProvider>)),
  ],
]

describe('React ↔ Vue markup parity: TaiwanRegion', () => {
  for (const [name, fromVue, fromReact] of cases) {
    it(name, async () => {
      expect(fromReact()).toBe(await fromVue())
    })
  }
})
