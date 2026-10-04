// Markup parity for MlIndexBar / MlZhuyin ↔ their React twins.
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

const contacts = [{ label: '陳大文', desc: '0912-345-678' }, { label: '林美玲' }, { label: '王小明' }, { label: 'Leo' }, { label: '7-ELEVEN' }]

const cases: [string, () => Promise<string>, () => string][] = [
  ['Zhuyin', () => vue(V.MlZhuyin, { text: '獅子吼！', zhuyin: 'ㄕ ˙ㄗ ㄏㄡˇ' }), () => react(<R.Zhuyin text="獅子吼！" zhuyin="ㄕ ˙ㄗ ㄏㄡˇ" />)],
  ['Zhuyin: top, pinyin input', () => vue(V.MlZhuyin, { text: '學習', zhuyin: 'xué xí', position: 'top' }), () => react(<R.Zhuyin text="學習" zhuyin="xué xí" position="top" />)],
  ['Zhuyin: no readings', () => vue(V.MlZhuyin, { text: '碼力獅' }), () => react(<R.Zhuyin text="碼力獅" />)],
  ['IndexBar', () => vue(V.MlIndexBar, { items: contacts }), () => react(<R.IndexBar items={contacts} />)],
  ['IndexBar: alphabet, not sticky', () => vue(V.MlIndexBar, { items: contacts, mode: 'alphabet', sticky: false }), () => react(<R.IndexBar items={contacts} mode="alphabet" sticky={false} />)],
  ['IndexBar: full rail', () => vue(V.MlIndexBar, { items: contacts, indexes: ['ㄅ', 'ㄌ', 'ㄔ', 'ㄨ', 'L', '#'] }), () => react(<R.IndexBar items={contacts} indexes={['ㄅ', 'ㄌ', 'ㄔ', 'ㄨ', 'L', '#']} />)],
  ['IndexBar: empty', () => vue(V.MlIndexBar, { items: [] }), () => react(<R.IndexBar items={[]} />)],
  [
    'English locale',
    async () => signature(await renderToString(createSSRApp({ render: () => h(MlConfigProvider, { locale: en }, () => [h(V.MlIndexBar, { items: contacts.slice(0, 2) }), h(V.MlIndexBar, { items: [] })]) }))),
    () =>
      signature(
        renderToStaticMarkup(
          <ConfigProvider locale={en}>
            <R.IndexBar items={contacts.slice(0, 2)} />
            <R.IndexBar items={[]} />
          </ConfigProvider>,
        ),
      ),
  ],
]

describe('React ↔ Vue markup parity: IndexBar, Zhuyin', () => {
  for (const [name, fromVue, fromReact] of cases) {
    it(name, async () => {
      expect(fromReact()).toBe(await fromVue())
    })
  }

  it('attributes match too', async () => {
    const pick = (html: string) =>
      [...html.matchAll(/<[a-z]+([^>]*)>/gi)]
        .map((tag) =>
          [...tag[1].matchAll(/ (lang|role|aria-level|aria-label|aria-current|aria-hidden|data-index|data-key|disabled|tabindex|type)(?:="([^"]*)")?(?=[\s/>]|$)/gi)]
            .map((m) => `${m[1].toLowerCase()}=${m[2] ?? ''}`)
            .sort()
            .join(' '),
        )
        .filter(Boolean)
        .join('\n')
    const vueHtml = await renderToString(createSSRApp({ render: () => [h(V.MlZhuyin, { text: '你好', zhuyin: 'nǐ hǎo' }), h(V.MlIndexBar, { items: contacts, indexes: ['ㄅ', 'ㄌ', 'ㄔ'] })] }))
    const reactHtml = renderToStaticMarkup(
      <>
        <R.Zhuyin text="你好" zhuyin="nǐ hǎo" />
        <R.IndexBar items={contacts} indexes={['ㄅ', 'ㄌ', 'ㄔ']} />
      </>,
    )
    expect(pick(reactHtml)).toBe(pick(vueHtml))
  })
})
