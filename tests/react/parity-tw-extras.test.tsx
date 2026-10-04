// Markup parity for MlBankPicker / MlLunarCalendar / MlInvoiceChecker ↔ their React twins.
import { describe, expect, it } from 'vitest'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { renderToStaticMarkup } from 'react-dom/server'
import * as V from '../../src'
import MlConfigProvider from '../../src/components/MlConfigProvider.vue'
import * as R from '../../src/react'
import { ConfigProvider } from '../../src/react/locale'
import { en } from '../../src/locale-data'
import type { MlInvoiceDraw } from '../../src/invoice'
import { react, signature, vue } from './parity-utils'

const today = new Date(2026, 1, 17)
const draws: MlInvoiceDraw[] = [
  { period: '115年 7–8月', special: '89996565', grand: '91098182', first: ['54348835', '44991397', '06595111'] },
  { period: '舊期', special: '12345678', grand: ['22222222', '33333333'], first: ['44444444'], extraSixth: ['456'] },
]
const holidays = { '2026-02-20': '調整放假', '2026-02-21': { name: '補行上班', off: false } }

const cases: [string, () => Promise<string>, () => string][] = [
  ['BankPicker', () => vue(V.MlBankPicker, {}), () => react(<R.BankPicker />)],
  [
    'BankPicker: value, label, short, clearable, name',
    () => vue(V.MlBankPicker, { value: '822', label: '銀行', short: true, clearable: true, name: 'bank', index: '01', required: true }),
    () => react(<R.BankPicker value="822" label="銀行" short clearable name="bank" index="01" required />),
  ],
  [
    'BankPicker: with account',
    () => vue(V.MlBankPicker, { value: '700', withAccount: true, account: '00123456789012', accountName: 'acct', accountError: '帳號有誤', size: 'sm' }),
    () => react(<R.BankPicker value="700" withAccount account="00123456789012" accountName="acct" accountError="帳號有誤" size="sm" />),
  ],
  ['LunarCalendar', () => vue(V.MlLunarCalendar, { today }), () => react(<R.LunarCalendar today={today} />)],
  [
    'LunarCalendar: selected, Monday start, holidays prop, min',
    () => vue(V.MlLunarCalendar, { today, modelValue: new Date(2026, 1, 16), weekStartsOn: 1, holidays, min: new Date(2026, 1, 3) }),
    () => react(<R.LunarCalendar today={today} value={new Date(2026, 1, 16)} weekStartsOn={1} holidays={holidays} min={new Date(2026, 1, 3)} />),
  ],
  [
    'LunarCalendar: labels off',
    () => vue(V.MlLunarCalendar, { today, showLunar: false, showSolarTerms: false, showHolidays: false }),
    () => react(<R.LunarCalendar today={today} showLunar={false} showSolarTerms={false} showHolidays={false} />),
  ],
  [
    'LunarCalendar: a leap month and a 春節 boundary (2023-03)',
    () => vue(V.MlLunarCalendar, { today: new Date(2023, 2, 22), builtinHolidays: false }),
    () => react(<R.LunarCalendar today={new Date(2023, 2, 22)} builtinHolidays={false} />),
  ],
  ['InvoiceChecker', () => vue(V.MlInvoiceChecker, { draws }), () => react(<R.InvoiceChecker draws={draws} />)],
  [
    'InvoiceChecker: full mode, older period, no numbers, disabled',
    () => vue(V.MlInvoiceChecker, { draws, mode: 'full', period: '舊期', label: '對獎', disabled: true }),
    () => react(<R.InvoiceChecker draws={draws} mode="full" period="舊期" label="對獎" disabled />),
  ],
  [
    'InvoiceChecker: no draws, no board',
    () => vue(V.MlInvoiceChecker, { draws: [], showNumbers: false }),
    () => react(<R.InvoiceChecker draws={[]} showNumbers={false} />),
  ],
  [
    'English locale',
    async () =>
      signature(
        await renderToString(
          createSSRApp({
            render: () =>
              h(MlConfigProvider, { locale: en }, () => [
                h(V.MlBankPicker, { value: '013', withAccount: true }),
                h(V.MlLunarCalendar, { today }),
                h(V.MlInvoiceChecker, { draws }),
              ]),
          }),
        ),
      ),
    () =>
      signature(
        renderToStaticMarkup(
          <ConfigProvider locale={en}>
            <R.BankPicker value="013" withAccount />
            <R.LunarCalendar today={today} />
            <R.InvoiceChecker draws={draws} />
          </ConfigProvider>,
        ),
      ),
  ],
]

describe('React ↔ Vue markup parity: BankPicker, LunarCalendar, InvoiceChecker', () => {
  for (const [name, fromVue, fromReact] of cases) {
    it(name, async () => {
      expect(fromReact()).toBe(await fromVue())
    })
  }

  it('labels and values match too', async () => {
    const pick = (html: string) =>
      [...html.matchAll(/ (aria-label|aria-current|aria-checked|aria-selected|data-day|inputmode)="([^"]*)"/gi)]
        .map((m) => `${m[1].toLowerCase()}=${m[2]}`)
        .join('\n')
    const vueHtml = await renderToString(
      createSSRApp({
        render: () => [h(V.MlBankPicker, { value: '822', withAccount: true, account: '12345678' }), h(V.MlLunarCalendar, { today, holidays }), h(V.MlInvoiceChecker, { draws })],
      }),
    )
    const reactHtml = renderToStaticMarkup(
      <>
        <R.BankPicker value="822" withAccount account="12345678" />
        <R.LunarCalendar today={today} holidays={holidays} />
        <R.InvoiceChecker draws={draws} />
      </>,
    )
    expect(pick(reactHtml)).toBe(pick(vueHtml))
  })
})
