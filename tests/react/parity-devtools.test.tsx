// Markup parity for MlCopyButton ↔ <CopyButton> and MlJsonViewer ↔ <JsonViewer>.
import { describe, expect, it } from 'vitest'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { renderToStaticMarkup } from 'react-dom/server'
import * as V from '../../src'
import { CopyButton, JsonViewer } from '../../src/react/devtools'
import { ConfigProvider } from '../../src/react/locale'
import { en } from '../../src/locale-data'
import { react, vue } from './parity-utils'

const api = {
  total: 3,
  next: null,
  ok: true,
  home: 'https://malilion.dev/docs',
  evil: 'javascript:alert(1)',
  at: '2026-10-04T09:30:00Z',
  bio: 'mane '.repeat(40),
  users: [
    { id: 1, name: 'Nala', tags: ['admin', 'design'] },
    { id: 2, name: 'Simba', tags: [] },
  ],
  empty: {},
  'odd key': 1.5,
}
const circular: Record<string, unknown> = { name: 'pride' }
circular.self = circular
const big = Array.from({ length: 130 }, (_, i) => i)

const cases: [string, () => Promise<string>, () => string][] = [
  ['CopyButton icon', () => vue(V.MlCopyButton, { value: 'x' }), () => react(<CopyButton value="x" />)],
  ['CopyButton button sm', () => vue(V.MlCopyButton, { value: 'x', variant: 'button', size: 'sm' }), () => react(<CopyButton value="x" variant="button" size="sm" />)],
  ['CopyButton inline', () => vue(V.MlCopyButton, { value: 'TOKEN', variant: 'inline' }), () => react(<CopyButton value="TOKEN" variant="inline" />)],
  ['CopyButton inline slot', () => vue(V.MlCopyButton, { value: 'x', variant: 'inline', size: 'lg' }, '顯示'), () => react(<CopyButton value="x" variant="inline" size="lg">顯示</CopyButton>)],
  ['CopyButton rich + labels + bottom', () => vue(V.MlCopyButton, { value: { text: 'a', html: '<b>a</b>' }, label: '拿走', placement: 'bottom', disabled: true }), () => react(<CopyButton value={{ text: 'a', html: '<b>a</b>' }} label="拿走" placement="bottom" disabled />)],
  ['CopyButton no tooltip', () => vue(V.MlCopyButton, { value: 'x', tooltip: false }), () => react(<CopyButton value="x" tooltip={false} />)],
  ['JsonViewer default', () => vue(V.MlJsonViewer, { data: api }), () => react(<JsonViewer data={api} />)],
  ['JsonViewer deep, no toolbar', () => vue(V.MlJsonViewer, { data: api, expandDepth: 9, toolbar: false }), () => react(<JsonViewer data={api} expandDepth={9} toolbar={false} />)],
  ['JsonViewer collapsed', () => vue(V.MlJsonViewer, { data: api, expandDepth: 0 }), () => react(<JsonViewer data={api} expandDepth={0} />)],
  ['JsonViewer search', () => vue(V.MlJsonViewer, { data: api, search: 'na' }), () => react(<JsonViewer data={api} search="na" />)],
  ['JsonViewer filter', () => vue(V.MlJsonViewer, { data: api, search: 'simba', filter: true }), () => react(<JsonViewer data={api} search="simba" filter />)],
  ['JsonViewer filter none', () => vue(V.MlJsonViewer, { data: api, search: 'zzz', filter: true }), () => react(<JsonViewer data={api} search="zzz" filter />)],
  ['JsonViewer chunked', () => vue(V.MlJsonViewer, { data: big, chunkSize: 50 }), () => react(<JsonViewer data={big} chunkSize={50} />)],
  ['JsonViewer circular', () => vue(V.MlJsonViewer, { data: circular, expandDepth: 4 }), () => react(<JsonViewer data={circular} expandDepth={4} />)],
  ['JsonViewer primitive', () => vue(V.MlJsonViewer, { data: 'just a string' }), () => react(<JsonViewer data="just a string" />)],
  ['JsonViewer source ok', () => vue(V.MlJsonViewer, { source: '{"a":[1,{"b":2}]}', links: false, copyable: false }), () => react(<JsonViewer source={'{"a":[1,{"b":2}]}'} links={false} copyable={false} />)],
  ['JsonViewer parse error', () => vue(V.MlJsonViewer, { source: '{\n  "a": 1,\n}' }), () => react(<JsonViewer source={'{\n  "a": 1,\n}'} />)],
  ['JsonViewer parse error at end', () => vue(V.MlJsonViewer, { source: '[1, 2' }), () => react(<JsonViewer source="[1, 2" />)],
]

describe('React ↔ Vue markup parity: devtools', () => {
  for (const [name, fromVue, fromReact] of cases) {
    it(name, async () => {
      expect(fromReact()).toBe(await fromVue())
    })
  }

  it('matches attributes that carry meaning (aria, tabindex, href, datetime), in English too', async () => {
    const strip = (html: string) => {
      const root = document.createElement('div')
      root.innerHTML = html.replace(/<!--[\s\S]*?-->/g, '')
      const out: string[] = []
      for (const el of root.querySelectorAll('*')) {
        for (const name of ['role', 'aria-label', 'aria-level', 'aria-setsize', 'aria-posinset', 'aria-expanded', 'aria-hidden', 'aria-live', 'title', 'disabled', 'tabindex', 'type', 'href', 'target', 'rel', 'datetime', 'placeholder', 'd']) {
          const v = el.getAttribute(name)
          if (v !== null) out.push(`${el.tagName.toLowerCase()} ${name}=${v === '' ? 'true' : v}`)
        }
      }
      return out.join('\n')
    }
    const pairs: [() => ReturnType<typeof h>, () => React.ReactElement][] = [
      [() => h(V.MlJsonViewer, { data: api, expandDepth: 3, search: 'a' }), () => <JsonViewer data={api} expandDepth={3} search="a" />],
      [() => h(V.MlCopyButton, { value: 'x' }), () => <CopyButton value="x" />],
      [() => h(V.MlCopyButton, { value: 'x', variant: 'button' }), () => <CopyButton value="x" variant="button" />],
    ]
    for (const [v, r] of pairs) {
      for (const locale of [undefined, en]) {
        const vHtml = await renderToString(createSSRApp({ render: () => (locale ? h(V.MlConfigProvider, { locale }, v) : v()) }))
        const rHtml = renderToStaticMarkup(locale ? <ConfigProvider locale={locale}>{r()}</ConfigProvider> : r())
        expect(strip(rHtml)).toBe(strip(vHtml))
      }
    }
  })
})
