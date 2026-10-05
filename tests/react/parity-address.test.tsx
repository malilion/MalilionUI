// Markup parity for MlTaiwanAddress ↔ <TaiwanAddress>.
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

const value = { county: '臺北市', district: '中正區', zip: '100-603', road: '重慶南路', section: '1', number: '122', floor: '5' }

const cases: [string, () => Promise<string>, () => string][] = [
  ['TaiwanAddress', () => vue(V.MlTaiwanAddress), () => react(<R.TaiwanAddress />)],
  ['TaiwanAddress: filled, english, label', () => vue(V.MlTaiwanAddress, { modelValue: value, english: true, label: '地址', required: true }), () => react(<R.TaiwanAddress value={value} english label="地址" required />)],
  ['TaiwanAddress: mismatch, no zip field', () => vue(V.MlTaiwanAddress, { modelValue: { ...value, zip: '106' }, error: '必填' }), () => react(<R.TaiwanAddress value={{ ...value, zip: '106' }} error="必填" />)],
  ['TaiwanAddress: zip off, small, hint', () => vue(V.MlTaiwanAddress, { modelValue: value, zip: false, size: 'sm', hint: '提示', preview: false }), () => react(<R.TaiwanAddress value={value} zip={false} size="sm" hint="提示" preview={false} />)],
  [
    'English locale',
    async () => signature(await renderToString(createSSRApp({ render: () => h(MlConfigProvider, { locale: en }, () => h(V.MlTaiwanAddress, { modelValue: { ...value, zip: '100' }, english: true })) }))),
    () =>
      signature(
        renderToStaticMarkup(
          <ConfigProvider locale={en}>
            <R.TaiwanAddress value={{ ...value, zip: '100' }} english />
          </ConfigProvider>,
        ),
      ),
  ],
]

describe('React ↔ Vue markup parity: TaiwanAddress', () => {
  for (const [name, fromVue, fromReact] of cases) {
    it(name, async () => {
      expect(fromReact()).toBe(await fromVue())
    })
  }
})
