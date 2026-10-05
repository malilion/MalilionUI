// Markup parity for TimeRangePicker: the closed field (server-rendered) and the open panel (mounted).
import { afterEach, describe, expect, it } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import * as V from '../../src'
import { TimeRangePicker, type TimeRangePickerProps } from '../../src/react/time-range'
import { react, signature, vue } from './parity-utils'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const presets = [
  { label: '上午', value: ['09:00', '12:00'] as V.MlTimeRange },
  { label: '下午', value: ['13:30', '18:00'] as V.MlTimeRange },
]

const cases: [string, () => Promise<string>, () => string][] = [
  ['empty', () => vue(V.MlTimeRangePicker, { label: 'Hours', hint: 'h', id: 'r' }), () => react(<TimeRangePicker label="Hours" hint="h" id="r" />)],
  [
    'value',
    () => vue(V.MlTimeRangePicker, { modelValue: ['09:00', '18:00'], clearable: true, required: true, index: '01', label: 'Hours', id: 'r' }),
    () => react(<TimeRangePicker value={['09:00', '18:00']} clearable required index="01" label="Hours" id="r" />),
  ],
  [
    'overnight',
    () => vue(V.MlTimeRangePicker, { modelValue: ['22:00', '06:30'], allowOvernight: true, error: 'Bad', id: 'r' }),
    () => react(<TimeRangePicker value={['22:00', '06:30']} allowOvernight error="Bad" id="r" />),
  ],
  [
    'half set, placeholders, disabled',
    () => vue(V.MlTimeRangePicker, { modelValue: [null, '10:00'], startPlaceholder: 'From', endPlaceholder: 'To', disabled: true, id: 'r' }),
    () => react(<TimeRangePicker value={[null, '10:00']} startPlaceholder="From" endPlaceholder="To" disabled id="r" />),
  ],
]

/** Mounted markup minus the transition classes, which differ by framework. */
const shape = (el: Element) => {
  const copy = el.cloneNode(true) as Element
  for (const node of copy.querySelectorAll('[class]')) {
    for (const c of [...node.classList]) if (c.startsWith('ml-dropdown')) node.classList.remove(c)
  }
  return signature(copy.outerHTML)
}

let root: Root | undefined
afterEach(() => {
  act(() => root?.unmount())
  root = undefined
  document.body.innerHTML = ''
})

async function openVue(props: Record<string, unknown>) {
  const wrapper = mount(V.MlTimeRangePicker, { props, attachTo: document.body, global: { stubs: { transition: false } } })
  await wrapper.get('button').trigger('click')
  await nextTick()
  const out = shape(wrapper.element as Element)
  wrapper.unmount()
  return out
}

function openReact(props: TimeRangePickerProps) {
  const host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => root!.render(<TimeRangePicker {...props} />))
  act(() => (host.querySelector('button') as HTMLButtonElement).click())
  return shape(host.firstElementChild!)
}

const open: [string, Record<string, unknown>][] = [
  ['open panel', { modelValue: ['09:00', '18:00'], minuteStep: 30, id: 'r' }],
  ['open panel with presets and seconds', { modelValue: ['09:00:00', '09:00:30'], seconds: true, secondStep: 15, minuteStep: 15, presets, id: 'r' }],
  ['open overnight panel', { modelValue: ['22:00', '06:00'], allowOvernight: true, min: '06:00', max: '23:00', minuteStep: 30, id: 'r' }],
  ['open empty panel', { min: '08:00', max: '20:00', minuteStep: 30, id: 'r' }],
]

describe('React ↔ Vue markup parity: TimeRangePicker', () => {
  for (const [name, fromVue, fromReact] of cases) {
    it(name, async () => {
      expect(fromReact()).toBe(await fromVue())
    })
  }
  for (const [name, props] of open) {
    it(name, async () => {
      const { modelValue, ...rest } = props
      const fromVue = await openVue(props)
      const fromReact = openReact({ ...(rest as TimeRangePickerProps), value: modelValue as V.MlTimeRange | undefined })
      expect(fromReact).toBe(fromVue)
      expect(fromVue).toContain('ml-timerange__panel')
    })
  }
})
