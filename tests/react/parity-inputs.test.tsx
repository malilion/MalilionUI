// Markup parity for the extra inputs and Form/FormItem (see parity.test.tsx).
import { describe, expect, it } from 'vitest'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import * as V from '../../src'
import * as R from '../../src/react/inputs'
import { Input, Checkbox } from '../../src/react/form'
import { Select } from '../../src/react/select'
import { Form, FormItem } from '../../src/react/validation'
import { react, signature, vue } from './parity-utils'

const people = [{ value: 'nala', label: 'Nala', hint: 'Design' }, { value: 'simba', label: 'Simba' }, { value: 'x', label: 'Gone', disabled: true }]
const opts = [{ value: 'a', label: 'Alpha' }, { value: 'b', label: 'Beta' }]

/** A Vue Form > FormItem > control tree. */
async function vueForm(model: Record<string, unknown>, rules: Record<string, unknown>, prop: string, control: () => ReturnType<typeof h>) {
  const app = createSSRApp({ render: () => h(V.MlForm, { model, rules }, () => h(V.MlFormItem, { prop }, control)) })
  return signature(await renderToString(app))
}

const cases: [string, () => Promise<string>, () => string][] = [
  ['NumberInput', () => vue(V.MlNumberInput, { id: 'n' }), () => react(<R.NumberInput id="n" />)],
  ['NumberInput full', () => vue(V.MlNumberInput, { modelValue: 5, min: 0, max: 5, step: 0.5, label: 'Qty', hint: 'h', index: '01', id: 'n' }), () => react(<R.NumberInput value={5} min={0} max={5} step={0.5} label="Qty" hint="h" index="01" id="n" />)],
  ['NumberInput error', () => vue(V.MlNumberInput, { error: 'Bad', disabled: true, id: 'n' }), () => react(<R.NumberInput error="Bad" disabled id="n" />)],
  ['PinInput', () => vue(V.MlPinInput, { id: 'p' }), () => react(<R.PinInput id="p" />)],
  ['PinInput grouped', () => vue(V.MlPinInput, { length: 4, groupSize: 2, modelValue: '12', name: 'code', label: 'Code', hint: 'h', id: 'p' }), () => react(<R.PinInput length={4} groupSize={2} value="12" name="code" label="Code" hint="h" id="p" />)],
  ['PinInput error', () => vue(V.MlPinInput, { error: 'Wrong', mask: true, type: 'alphanumeric', size: 'lg', disabled: true, id: 'p' }), () => react(<R.PinInput error="Wrong" mask type="alphanumeric" size="lg" disabled id="p" />)],
  ['TagInput', () => vue(V.MlTagInput, { id: 't' }), () => react(<R.TagInput id="t" />)],
  ['TagInput full', () => vue(V.MlTagInput, { modelValue: ['vue', 'react'], max: 2, clearable: true, name: 'tags', label: 'Tags', hint: 'h', required: true, id: 't' }), () => react(<R.TagInput value={['vue', 'react']} max={2} clearable name="tags" label="Tags" hint="h" required id="t" />)],
  ['TagInput error', () => vue(V.MlTagInput, { modelValue: ['a'], error: 'Bad', disabled: true, size: 'sm', id: 't' }), () => react(<R.TagInput value={['a']} error="Bad" disabled size="sm" id="t" />)],
  ['Mention', () => vue(V.MlMention, { options: people, label: 'Note', id: 'm' }), () => react(<R.Mention options={people} label="Note" id="m" />)],
  ['Mention error', () => vue(V.MlMention, { options: [], error: 'Bad', triggers: ['#'], modelValue: 'hi', id: 'm' }), () => react(<R.Mention options={[]} error="Bad" triggers={['#']} value="hi" id="m" />)],
  ['Slider', () => vue(V.MlSlider, { id: 's' }), () => react(<R.Slider id="s" />)],
  ['Slider full', () => vue(V.MlSlider, { modelValue: 30, label: 'Vol', unit: '%', tone: 'tech', disabled: true, id: 's' }), () => react(<R.Slider value={30} label="Vol" unit="%" tone="tech" disabled id="s" />)],
  ['Slider bare', () => vue(V.MlSlider, { showValue: false, id: 's' }), () => react(<R.Slider showValue={false} id="s" />)],
  ['Rate', () => vue(V.MlRate, {}), () => react(<R.Rate />)],
  ['Rate half', () => vue(V.MlRate, { modelValue: 3.5, allowHalf: true, texts: ['a', 'b', 'c', 'd', 'e'], size: 'lg', tone: 'bean' }), () => react(<R.Rate value={3.5} allowHalf texts={['a', 'b', 'c', 'd', 'e']} size="lg" tone="bean" />)],
  ['Rate readonly', () => vue(V.MlRate, { modelValue: 2, readonly: true, showValue: true, max: 3 }), () => react(<R.Rate value={2} readOnly showValue max={3} />)],
  ['Rate disabled', () => vue(V.MlRate, { modelValue: 1, disabled: true, label: 'Score' }), () => react(<R.Rate value={1} disabled label="Score" />)],
  ['Form', () => vue(V.MlForm, { model: {} }, 'Body'), () => react(<Form model={{}}>Body</Form>)],
  ['FormItem', () => vue(V.MlFormItem, { prop: 'x' }, 'Body'), () => react(<FormItem prop="x">Body</FormItem>)],
  [
    'Form > FormItem > Input (required from rules)',
    () => vueForm({ name: '' }, { name: { required: true } }, 'name', () => h(V.MlInput, { label: 'Name', id: 'i' })),
    () => react(<Form model={{ name: '' }} rules={{ name: { required: true } }}><FormItem prop="name"><Input label="Name" id="i" /></FormItem></Form>),
  ],
  [
    'Form > FormItem > Select',
    () => vueForm({ v: null }, { v: [{ required: true }] }, 'v', () => h(V.MlSelect, { options: opts, label: 'Pick', id: 's' })),
    () => react(<Form model={{ v: null }} rules={{ v: [{ required: true }] }}><FormItem prop="v"><Select options={opts} label="Pick" id="s" /></FormItem></Form>),
  ],
  [
    'Form > FormItem > NumberInput',
    () => vueForm({ n: 1 }, { n: { required: true } }, 'n', () => h(V.MlNumberInput, { label: 'N', id: 'n' })),
    () => react(<Form model={{ n: 1 }} rules={{ n: { required: true } }}><FormItem prop="n"><R.NumberInput label="N" id="n" /></FormItem></Form>),
  ],
  [
    'Form > FormItem > Checkbox',
    () => vueForm({ ok: false }, { ok: { required: true } }, 'ok', () => h(V.MlCheckbox, { label: 'Agree' })),
    () => react(<Form model={{ ok: false }} rules={{ ok: { required: true } }}><FormItem prop="ok"><Checkbox label="Agree" /></FormItem></Form>),
  ],
]

describe('React ↔ Vue markup parity: inputs & form', () => {
  for (const [name, fromVue, fromReact] of cases) {
    it(name, async () => {
      expect(fromReact()).toBe(await fromVue())
    })
  }
})
