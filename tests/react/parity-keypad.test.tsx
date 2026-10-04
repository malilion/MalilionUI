// Markup parity for MlInputMask / MlAmountInput / MlNumberKeyboard ↔ their React twins.
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

const cases: [string, () => Promise<string>, () => string][] = [
  ['InputMask', () => vue(V.MlInputMask, { preset: 'mobile', modelValue: '0912345678' }), () => react(<R.InputMask preset="mobile" value="0912345678" />)],
  [
    'InputMask: label, hint, size, error',
    () => vue(V.MlInputMask, { mask: 'AX99999999', label: '身分證', hint: '第一碼英文', size: 'lg', error: '格式錯誤', index: '01' }),
    () => react(<R.InputMask mask="AX99999999" label="身分證" hint="第一碼英文" size="lg" error="格式錯誤" index="01" />),
  ],
  ['InputMask: disabled', () => vue(V.MlInputMask, { preset: 'card', disabled: true }), () => react(<R.InputMask preset="card" disabled />)],
  ['AmountInput', () => vue(V.MlAmountInput, { modelValue: 1234567 }), () => react(<R.AmountInput value={1234567} />)],
  [
    'AmountInput: currency, decimals, capital',
    () => vue(V.MlAmountInput, { modelValue: 12345.6, decimals: 2, currency: 'NT$', capital: true, label: '金額' }),
    () => react(<R.AmountInput value={12345.6} decimals={2} currency="NT$" capital label="金額" />),
  ],
  ['AmountInput: empty capital', () => vue(V.MlAmountInput, { capital: true, size: 'sm' }), () => react(<R.AmountInput capital size="sm" />)],
  ['NumberKeyboard', () => vue(V.MlNumberKeyboard), () => react(<R.NumberKeyboard />)],
  ['NumberKeyboard: extra key, title', () => vue(V.MlNumberKeyboard, { extraKey: 'X', title: '身分證' }), () => react(<R.NumberKeyboard extraKey="X" title="身分證" />)],
  ['NumberKeyboard: fixed, closed', () => vue(V.MlNumberKeyboard, { fixed: true }), () => react(<R.NumberKeyboard fixed />)],
  ['NumberKeyboard: fixed, open', () => vue(V.MlNumberKeyboard, { fixed: true, show: true, closeText: '好了' }), () => react(<R.NumberKeyboard fixed show closeText="好了" />)],
  ['NumberKeyboard: custom, one extra', () => vue(V.MlNumberKeyboard, { theme: 'custom', extraKey: '.' }), () => react(<R.NumberKeyboard theme="custom" extraKey="." />)],
  ['NumberKeyboard: custom, two extras', () => vue(V.MlNumberKeyboard, { theme: 'custom', extraKey: ['00', '.'] }), () => react(<R.NumberKeyboard theme="custom" extraKey={['00', '.']} />)],
  ['NumberKeyboard: custom, none', () => vue(V.MlNumberKeyboard, { theme: 'custom' }), () => react(<R.NumberKeyboard theme="custom" />)],
  [
    'English locale',
    async () =>
      signature(
        await renderToString(
          createSSRApp({
            render: () =>
              h(MlConfigProvider, { locale: en }, () => [h(V.MlAmountInput, { modelValue: 5, capital: true }), h(V.MlNumberKeyboard, { theme: 'custom', fixed: true, show: true })]),
          }),
        ),
      ),
    () =>
      signature(
        renderToStaticMarkup(
          <ConfigProvider locale={en}>
            <R.AmountInput value={5} capital />
            <R.NumberKeyboard theme="custom" fixed show />
          </ConfigProvider>,
        ),
      ),
  ],
]

describe('React ↔ Vue markup parity: InputMask, AmountInput, NumberKeyboard', () => {
  for (const [name, fromVue, fromReact] of cases) {
    it(name, async () => {
      expect(fromReact()).toBe(await fromVue())
    })
  }

  it('attributes match too (values, input modes, labels)', async () => {
    // Per element, sorted: the frameworks order attributes differently, React writes value="" and Vue a bare inert.
    const pick = (html: string) =>
      [...html.matchAll(/<[a-z]+([^>]*)>/gi)]
        .map((tag) =>
          [...tag[1].matchAll(/ (value|inputmode|placeholder|autocomplete|aria-label|aria-hidden|aria-live|type|inert|d)(?:="([^"]*)")?(?=[\s/>]|$)/gi)]
            .map((m) => `${m[1].toLowerCase()}=${m[2] ?? ''}`)
            .filter((a) => a !== 'value=')
            .sort()
            .join(' '),
        )
        .filter(Boolean)
        .join('\n')
    const vueHtml = await renderToString(
      createSSRApp({
        render: () => [
          h(V.MlInputMask, { preset: 'phone', modelValue: '0223456789' }),
          h(V.MlInputMask, { preset: 'carrier' }),
          h(V.MlAmountInput, { modelValue: 9.5, decimals: 2 }),
          h(V.MlAmountInput, { allowNegative: true }),
          h(V.MlNumberKeyboard, { fixed: true }),
          h(V.MlNumberKeyboard, { theme: 'custom' }),
        ],
      }),
    )
    const reactHtml = renderToStaticMarkup(
      <>
        <R.InputMask preset="phone" value="0223456789" />
        <R.InputMask preset="carrier" />
        <R.AmountInput value={9.5} decimals={2} />
        <R.AmountInput allowNegative />
        <R.NumberKeyboard fixed />
        <R.NumberKeyboard theme="custom" />
      </>,
    )
    expect(pick(reactHtml)).toBe(pick(vueHtml))
  })
})
