// Markup parity for the date, time, colour and upload pickers (see parity.test.tsx).
import { describe, expect, it } from 'vitest'
import * as V from '../../src'
import * as R from '../../src/react/pickers'
import { react, vue } from './parity-utils'

const day = new Date(2026, 1, 12)
const end = new Date(2026, 1, 20)
const moment = new Date(2026, 1, 12, 9, 45)
const files = [new File(['abc'], 'a.png', { type: 'image/png' }), new File([new Uint8Array(2048)], 'b.pdf', { type: 'application/pdf' })]

const cases: [string, () => Promise<string>, () => string][] = [
  ['Calendar', () => vue(V.MlCalendar, { modelValue: day, markers: [end] }), () => react(<R.Calendar value={day} markers={[end]} />)],
  ['Calendar range en', () => vue(V.MlCalendar, { mode: 'range', range: [day, end], locale: 'en', weekStartsOn: 1 }), () => react(<R.Calendar mode="range" range={[day, end]} locale="en" weekStartsOn={1} />)],
  ['Calendar min/max', () => vue(V.MlCalendar, { modelValue: day, min: new Date(2026, 1, 5), max: end }), () => react(<R.Calendar value={day} min={new Date(2026, 1, 5)} max={end} />)],
  ['DatePicker empty', () => vue(V.MlDatePicker, { label: 'Day', hint: 'h', id: 'd' }), () => react(<R.DatePicker label="Day" hint="h" id="d" />)],
  ['DatePicker value', () => vue(V.MlDatePicker, { modelValue: day, clearable: true, error: 'Bad', index: '01', id: 'd' }), () => react(<R.DatePicker value={day} clearable error="Bad" index="01" id="d" />)],
  ['DateRangePicker empty', () => vue(V.MlDateRangePicker, { label: 'Trip', id: 'r' }), () => react(<R.DateRangePicker label="Trip" id="r" />)],
  ['DateRangePicker value', () => vue(V.MlDateRangePicker, { modelValue: [day, end], clearable: true, id: 'r' }), () => react(<R.DateRangePicker value={[day, end]} clearable id="r" />)],
  ['DateTimePicker empty', () => vue(V.MlDateTimePicker, { label: 'When', id: 't' }), () => react(<R.DateTimePicker label="When" id="t" />)],
  ['DateTimePicker value', () => vue(V.MlDateTimePicker, { modelValue: moment, seconds: true, clearable: true, id: 't' }), () => react(<R.DateTimePicker value={moment} seconds clearable id="t" />)],
  ['TimePicker empty', () => vue(V.MlTimePicker, { label: 'At', placeholder: 'Pick', id: 'p' }), () => react(<R.TimePicker label="At" placeholder="Pick" id="p" />)],
  ['TimePicker value', () => vue(V.MlTimePicker, { modelValue: '09:30', clearable: true, required: true, label: 'At', id: 'p' }), () => react(<R.TimePicker value="09:30" clearable required label="At" id="p" />)],
  ['ColorPicker empty', () => vue(V.MlColorPicker, { label: 'Tint', id: 'c' }), () => react(<R.ColorPicker label="Tint" id="c" />)],
  ['ColorPicker value', () => vue(V.MlColorPicker, { modelValue: '#3eeed0', clearable: true, alpha: true, id: 'c' }), () => react(<R.ColorPicker value="#3eeed0" clearable alpha id="c" />)],
  ['Upload', () => vue(V.MlUpload, { accept: 'image/*', hint: 'PNG only', title: 'Drop' }), () => react(<R.Upload accept="image/*" hint="PNG only" title="Drop" />)],
  ['Upload files', () => vue(V.MlUpload, { modelValue: files, disabled: true }), () => react(<R.Upload value={files} disabled />)],
]

describe('React ↔ Vue markup parity: pickers', () => {
  for (const [name, fromVue, fromReact] of cases) {
    it(name, async () => {
      expect(fromReact()).toBe(await fromVue())
    })
  }
})
