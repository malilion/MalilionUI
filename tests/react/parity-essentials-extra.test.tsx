// Markup parity for MlAvatarGroup / MlTitle / MlText / MlLink / MlBarcode and calendar="roc" ↔ their React twins.
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

const people = [{ name: '碼力獅', lion: true, status: 'online' as const }, { name: 'Leo', ring: 'steel' as const }, { name: 'Nala' }, { name: '小虎' }, { name: 'Simba' }]
const day = new Date(2026, 9, 4)

const cases: [string, () => Promise<string>, () => string][] = [
  ['AvatarGroup', () => vue(V.MlAvatarGroup, { items: people, max: 3 }), () => react(<R.AvatarGroup items={people} max={3} />)],
  [
    'AvatarGroup: total, expandable, options',
    () => vue(V.MlAvatarGroup, { items: people, max: 2, total: 40, expandable: true, size: 'sm', ring: 'tech', spacing: 'loose', label: '團隊' }),
    () => react(<R.AvatarGroup items={people} max={2} total={40} expandable size="sm" ring="tech" spacing="loose" label="團隊" />),
  ],
  [
    'AvatarGroup: expanded',
    () => vue(V.MlAvatarGroup, { items: people, max: 2, expandable: true, expanded: true }),
    () => react(<R.AvatarGroup items={people} max={2} expandable expanded />),
  ],
  ['Title', () => vue(V.MlTitle, {}, '標題'), () => react(<R.Title>標題</R.Title>)],
  ['Title: metal, accent, h1', () => vue(V.MlTitle, { level: 1, metal: true, accent: true, ellipsis: true }, '金'), () => react(<R.Title level={1} metal accent ellipsis>金</R.Title>)],
  ['Title: as', () => vue(V.MlTitle, { level: 6, as: 'p' }, 'HUD'), () => react(<R.Title level={6} as="p">HUD</R.Title>)],
  ['Text', () => vue(V.MlText, {}, '文字'), () => react(<R.Text>文字</R.Text>)],
  [
    'Text: flags',
    () => vue(V.MlText, { tone: 'gold', size: 'lg', strong: true, italic: true, underline: true, delete: true, mono: true, ellipsis: true }, '原價'),
    () => react(<R.Text tone="gold" size="lg" strong italic underline delete mono ellipsis>原價</R.Text>),
  ],
  ['Text: code', () => vue(V.MlText, { code: true }, 'npm i'), () => react(<R.Text code>npm i</R.Text>)],
  ['Text: mark, clamp', () => vue(V.MlText, { mark: true, ellipsis: 2 }, '重點'), () => react(<R.Text mark ellipsis={2}>重點</R.Text>)],
  ['Text: copyable', () => vue(V.MlText, { copyable: true, mono: true }, 'ORD-42'), () => react(<R.Text copyable mono>ORD-42</R.Text>)],
  ['Link', () => vue(V.MlLink, { href: '/docs' }, '文件'), () => react(<R.Link href="/docs">文件</R.Link>)],
  ['Link: external', () => vue(V.MlLink, { href: 'https://x.dev', external: true, tone: 'tech', underline: 'always' }, 'X'), () => react(<R.Link href="https://x.dev" external tone="tech" underline="always">X</R.Link>)],
  ['Link: disabled', () => vue(V.MlLink, { href: '/docs', disabled: true }, '停用'), () => react(<R.Link href="/docs" disabled>停用</R.Link>)],
  ['Barcode', () => vue(V.MlBarcode, { value: 'MALILION-2026' }, '說明'), () => react(<R.Barcode value="MALILION-2026">說明</R.Barcode>)],
  ['Barcode: ean13', () => vue(V.MlBarcode, { value: '4006381333931', format: 'ean13', module: 1.5, height: 40 }), () => react(<R.Barcode value="4006381333931" format="ean13" module={1.5} height={40} />)],
  ['Barcode: code39, no text', () => vue(V.MlBarcode, { value: '/ABC+123', format: 'code39', showText: false }), () => react(<R.Barcode value="/ABC+123" format="code39" showText={false} />)],
  ['Barcode: invalid', () => vue(V.MlBarcode, { value: '中文' }), () => react(<R.Barcode value="中文" />)],
  ['Calendar: roc', () => vue(V.MlCalendar, { modelValue: day, calendar: 'roc' }), () => react(<R.Calendar value={day} calendar="roc" />)],
  ['DatePicker: roc', () => vue(V.MlDatePicker, { modelValue: day, calendar: 'roc' }), () => react(<R.DatePicker value={day} calendar="roc" />)],
  ['DatePicker: roc month', () => vue(V.MlDatePicker, { modelValue: day, calendar: 'roc', type: 'month' }), () => react(<R.DatePicker value={day} calendar="roc" type="month" />)],
  [
    'DateRangePicker: roc',
    () => vue(V.MlDateRangePicker, { modelValue: [day, new Date(2026, 9, 9)], calendar: 'roc' }),
    () => react(<R.DateRangePicker value={[day, new Date(2026, 9, 9)]} calendar="roc" />),
  ],
  ['DateTimePicker: roc', () => vue(V.MlDateTimePicker, { modelValue: new Date(2026, 9, 4, 9, 30), calendar: 'roc' }), () => react(<R.DateTimePicker value={new Date(2026, 9, 4, 9, 30)} calendar="roc" />)],
  [
    'English locale',
    async () =>
      signature(
        await renderToString(
          createSSRApp({
            render: () =>
              h(MlConfigProvider, { locale: en }, () => [
                h(V.MlAvatarGroup, { items: people, max: 2, expandable: true }),
                h(V.MlLink, { href: 'https://x.dev', external: true }, () => 'X'),
                h(V.MlBarcode, { value: 'ABC' }),
                h(V.MlDatePicker, { modelValue: new Date(2026, 0, 1), type: 'year', calendar: 'roc' }),
              ]),
          }),
        ),
      ),
    () =>
      signature(
        renderToStaticMarkup(
          <ConfigProvider locale={en}>
            <R.AvatarGroup items={people} max={2} expandable />
            <R.Link href="https://x.dev" external>X</R.Link>
            <R.Barcode value="ABC" />
            <R.DatePicker value={new Date(2026, 0, 1)} type="year" calendar="roc" />
          </ConfigProvider>,
        ),
      ),
  ],
]

describe('React ↔ Vue markup parity: AvatarGroup, Typography, Barcode, 民國', () => {
  for (const [name, fromVue, fromReact] of cases) {
    it(name, async () => {
      expect(fromReact()).toBe(await fromVue())
    })
  }

  it('attributes match too (labels, links, bars)', async () => {
    const pick = (html: string) =>
      [...html.replace(/<link [^>]*>/g, '').matchAll(/ (aria-label|aria-expanded|aria-disabled|href|target|rel|title|role|d|viewBox|width|height|x|y|text-anchor)="([^"]*)"/gi)]
        .map((m) => `${m[1].toLowerCase()}=${m[2]}`)
        .join('\n')
    const vueHtml = await renderToString(
      createSSRApp({
        render: () => [
          h(V.MlAvatarGroup, { items: people, max: 2, total: 9, expandable: true }),
          h(V.MlLink, { href: 'https://x.dev', target: '_blank' }, () => 'X'),
          h(V.MlLink, { href: 'javascript:alert(1)' }, () => 'bad'),
          h(V.MlBarcode, { value: '4006381333931', format: 'ean13' }),
        ],
      }),
    )
    const reactHtml = renderToStaticMarkup(
      <>
        <R.AvatarGroup items={people} max={2} total={9} expandable />
        <R.Link href="https://x.dev" target="_blank">X</R.Link>
        <R.Link href="javascript:alert(1)">bad</R.Link>
        <R.Barcode value="4006381333931" format="ean13" />
      </>,
    )
    expect(pick(reactHtml)).toBe(pick(vueHtml))
  })
})
