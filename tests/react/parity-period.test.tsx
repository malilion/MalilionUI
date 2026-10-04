// Markup parity for month / quarter / year picking: the open panels (internal on
// both sides) and the pickers' closed triggers with `type`.
import { describe, expect, it } from 'vitest'
import * as V from '../../src'
import MlPeriodPanel from '../../src/components/MlPeriodPanel.vue'
import * as R from '../../src/react/pickers'
import { PeriodPanel } from '../../src/react/period'
import { react, vue } from './parity-utils'

const oct = new Date(2026, 9, 4)
const feb = new Date(2026, 1, 1)
const min = new Date(2026, 2, 15)
const max = new Date(2027, 5, 1)

const cases: [string, () => Promise<string>, () => string][] = [
  ['PeriodPanel month', () => vue(MlPeriodPanel, { type: 'month', modelValue: oct, min, max }), () => react(<PeriodPanel type="month" value={oct} min={min} max={max} />)],
  ['PeriodPanel month en', () => vue(MlPeriodPanel, { type: 'month', modelValue: oct, locale: 'en' }), () => react(<PeriodPanel type="month" value={oct} locale="en" />)],
  ['PeriodPanel quarter', () => vue(MlPeriodPanel, { type: 'quarter', modelValue: oct, max }), () => react(<PeriodPanel type="quarter" value={oct} max={max} />)],
  ['PeriodPanel year', () => vue(MlPeriodPanel, { type: 'year', modelValue: oct, min }), () => react(<PeriodPanel type="year" value={oct} min={min} />)],
  ['PeriodPanel year empty', () => vue(MlPeriodPanel, { type: 'year' }), () => react(<PeriodPanel type="year" />)],
  ['PeriodPanel month range', () => vue(MlPeriodPanel, { type: 'month', mode: 'range', range: [feb, oct] }), () => react(<PeriodPanel type="month" mode="range" range={[feb, oct]} />)],
  ['PeriodPanel year range', () => vue(MlPeriodPanel, { type: 'year', mode: 'range', range: [new Date(2019, 0, 1), oct] }), () => react(<PeriodPanel type="year" mode="range" range={[new Date(2019, 0, 1), oct]} />)],
  ['DatePicker month', () => vue(V.MlDatePicker, { type: 'month', modelValue: oct, clearable: true, id: 'd' }), () => react(<R.DatePicker type="month" value={oct} clearable id="d" />)],
  ['DatePicker quarter', () => vue(V.MlDatePicker, { type: 'quarter', modelValue: oct, id: 'd' }), () => react(<R.DatePicker type="quarter" value={oct} id="d" />)],
  ['DatePicker year empty', () => vue(V.MlDatePicker, { type: 'year', label: 'Y', id: 'd' }), () => react(<R.DatePicker type="year" label="Y" id="d" />)],
  ['DatePicker month format', () => vue(V.MlDatePicker, { type: 'month', modelValue: oct, locale: 'en', format: { year: 'numeric', month: 'long' }, id: 'd' }), () => react(<R.DatePicker type="month" value={oct} locale="en" format={{ year: 'numeric', month: 'long' }} id="d" />)],
  ['DateRangePicker month', () => vue(V.MlDateRangePicker, { type: 'month', modelValue: [feb, oct], clearable: true, id: 'r' }), () => react(<R.DateRangePicker type="month" value={[feb, oct]} clearable id="r" />)],
  ['DateRangePicker year empty', () => vue(V.MlDateRangePicker, { type: 'year', label: 'Years', id: 'r' }), () => react(<R.DateRangePicker type="year" label="Years" id="r" />)],
]

describe('React ↔ Vue markup parity: period pickers', () => {
  for (const [name, fromVue, fromReact] of cases) {
    it(name, async () => {
      expect(fromReact()).toBe(await fromVue())
    })
  }

  it('compares attributes too (labels, tabindex, disabled, aria)', async () => {
    const { renderToString } = await import('vue/server-renderer')
    const { createSSRApp, h } = await import('vue')
    const { renderToStaticMarkup } = await import('react-dom/server')
    const attrs = (html: string) => {
      const host = document.createElement('div')
      host.innerHTML = html
      return [...host.querySelectorAll('button[data-period]')].map((b) =>
        ['data-period', 'tabindex', 'disabled', 'aria-label', 'aria-current'].map((a) => `${a}=${b.getAttribute(a)}`).join(' '),
      )
    }
    const v = await renderToString(createSSRApp({ render: () => h(MlPeriodPanel, { type: 'month', modelValue: oct, min, max }) }))
    const r = renderToStaticMarkup(<PeriodPanel type="month" value={oct} min={min} max={max} />)
    expect(attrs(r)).toEqual(attrs(v))
    expect(attrs(r)).toHaveLength(12)
  })
})
