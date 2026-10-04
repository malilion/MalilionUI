// Markup parity for MlPickerView ↔ <PickerView> (see parity.test.tsx).
import { describe, expect, it } from 'vitest'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { renderToStaticMarkup } from 'react-dom/server'
import * as V from '../../src'
import { PickerView, datePickerColumns, timePickerColumns, type MlPickerOption } from '../../src/react/picker-view'
import { react, vue } from './parity-utils'

const fruit: MlPickerOption[] = ['Apple', 'Banana', 'Cherry', 'Durian', 'Elderberry', 'Fig', 'Grape', 'Honeydew'].map((label, i) => ({ label, value: label, disabled: i === 3 || undefined }))
const sizes: MlPickerOption[] = ['S', 'M', 'L'].map((label) => ({ label, value: label }))
const regions: MlPickerOption[] = [
  { label: '臺北市', value: 'tp', children: [{ label: '中正區', value: 'zz' }, { label: '大安區', value: 'da' }] },
  { label: '新竹市', value: 'hc', children: [{ label: '東區', value: 'e' }, { label: '北區', value: 'n', disabled: true }] },
  { label: '連江縣', value: 'lj' },
]
const dates = datePickerColumns({ min: new Date(2020, 1, 15), max: new Date(2026, 9, 4) })
const times = timePickerColumns({ minuteStep: 15 })

const cases: [string, Record<string, unknown>, Parameters<typeof PickerView>[0]][] = [
  ['two columns', { columns: [fruit, sizes], modelValue: ['Cherry', 'L'], labels: ['水果', '尺寸'] }, { columns: [fruit, sizes], value: ['Cherry', 'L'], labels: ['水果', '尺寸'] }],
  ['empty value', { columns: [fruit] }, { columns: [fruit] }],
  ['toolbar + title', { columns: [sizes], title: '尺寸', cancelText: '算了', confirmText: '好' }, { columns: [sizes], title: '尺寸', cancelText: '算了', confirmText: '好' }],
  ['toolbar only', { columns: [sizes], toolbar: true, label: 'Size' }, { columns: [sizes], toolbar: true, label: 'Size' }],
  ['cascade', { options: regions, modelValue: ['hc'] }, { options: regions, value: ['hc'] }],
  ['cascade leaf', { options: regions, modelValue: ['lj'] }, { options: regions, value: ['lj'] }],
  ['dates', { columns: dates, modelValue: [2020, 2, 31], visibleCount: 7, itemHeight: 36 }, { columns: dates, value: [2020, 2, 31], visibleCount: 7, itemHeight: 36 }],
  ['times', { columns: times, modelValue: [9, 33] }, { columns: times, value: [9, 33] }],
  ['disabled', { columns: [fruit], modelValue: ['Fig'], disabled: true, toolbar: true }, { columns: [fruit], value: ['Fig'], disabled: true, toolbar: true }],
  ['no columns', {}, {}],
]

describe('React ↔ Vue markup parity: PickerView', () => {
  for (const [name, vueProps, reactProps] of cases) {
    it(name, async () => {
      expect(react(<PickerView {...reactProps} />)).toBe(await vue(V.MlPickerView, vueProps))
    })
  }

  it('matches attributes that carry meaning (aria, tabindex, hidden rows)', async () => {
    const strip = (html: string) => {
      const root = document.createElement('div')
      root.innerHTML = html.replace(/<!--[\s\S]*?-->/g, '')
      const out: string[] = []
      for (const el of root.querySelectorAll('*')) {
        for (const name of ['role', 'tabindex', 'aria-label', 'aria-live', 'aria-hidden', 'aria-disabled', 'aria-valuemin', 'aria-valuemax', 'aria-valuenow', 'aria-valuetext', 'disabled', 'type']) {
          const v = el.getAttribute(name)
          if (v !== null) out.push(`${el.tagName.toLowerCase()} ${name}=${v}`)
        }
        const style = (el as HTMLElement).style
        if (style.visibility) out.push(`${el.tagName.toLowerCase()} visibility=${style.visibility}`)
        if (style.transform) out.push(`${el.tagName.toLowerCase()} transform=${style.transform}`)
      }
      return out.join('\n')
    }
    for (const [, vueProps, reactProps] of cases) {
      const v = strip(await renderToString(createSSRApp({ render: () => h(V.MlPickerView, vueProps) })))
      const r = strip(renderToStaticMarkup(<PickerView {...reactProps} />))
      expect(r).toBe(v)
    }
  })
})
