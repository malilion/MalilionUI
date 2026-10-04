// Markup parity for CheckboxGroup / PasswordInput (and group-aware Checkbox).
import { describe, expect, it } from 'vitest'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import * as V from '../../src'
import { CheckboxGroup, PasswordInput } from '../../src/react/choice'
import { Checkbox } from '../../src/react/form'
import { Form, FormItem } from '../../src/react/validation'
import { react, signature, vue } from './parity-utils'

const opts = [
  { value: 'a', label: 'Alpha', hint: 'first' },
  { value: 'b', label: 'Beta' },
  { value: 3, label: 'Gamma', disabled: true },
]

async function vueTree(render: () => ReturnType<typeof h>) {
  return signature(await renderToString(createSSRApp({ render })))
}

const cases: [string, () => Promise<string>, () => string][] = [
  ['CheckboxGroup', () => vue(V.MlCheckboxGroup, { options: opts, id: 'g' }), () => react(<CheckboxGroup options={opts} id="g" />)],
  [
    'CheckboxGroup full',
    () => vue(V.MlCheckboxGroup, { options: opts, modelValue: ['a'], label: 'Pick', hint: 'h', index: '01', required: true, checkAll: true, paw: true, direction: 'column', name: 'n', id: 'g' }),
    () => react(<CheckboxGroup options={opts} value={['a']} label="Pick" hint="h" index="01" required checkAll paw direction="column" name="n" id="g" />),
  ],
  [
    'CheckboxGroup card max',
    () => vue(V.MlCheckboxGroup, { options: opts, modelValue: ['a', 'b'], variant: 'card', max: 2, checkAll: 'Every', id: 'g' }),
    () => react(<CheckboxGroup options={opts} value={['a', 'b']} variant="card" max={2} checkAll="Every" id="g" />),
  ],
  [
    'CheckboxGroup min error disabled',
    () => vue(V.MlCheckboxGroup, { options: opts, modelValue: ['a'], min: 1, error: 'Bad', disabled: true, id: 'g' }),
    () => react(<CheckboxGroup options={opts} value={['a']} min={1} error="Bad" disabled id="g" />),
  ],
  [
    'CheckboxGroup with children',
    () => vueTree(() => h(V.MlCheckboxGroup, { modelValue: ['x'], label: 'L', id: 'g' }, () => [h(V.MlCheckbox, { value: 'x', label: 'X' }), h(V.MlCheckbox, { value: 'y', label: 'Y', hint: 'why' })])),
    () => react(<CheckboxGroup value={['x']} label="L" id="g"><Checkbox value="x" label="X" /><Checkbox value="y" label="Y" hint="why" /></CheckboxGroup>),
  ],
  ['Checkbox standalone value', () => vue(V.MlCheckbox, { value: 'v', label: 'V', modelValue: true }), () => react(<Checkbox value="v" label="V" checked />)],
  [
    'Form > FormItem > CheckboxGroup',
    () => vueTree(() => h(V.MlForm, { model: { t: [] }, rules: { t: { required: true } } }, () => h(V.MlFormItem, { prop: 't' }, () => h(V.MlCheckboxGroup, { options: opts, label: 'T', id: 'g' })))),
    () => react(<Form model={{ t: [] }} rules={{ t: { required: true } }}><FormItem prop="t"><CheckboxGroup options={opts} label="T" id="g" /></FormItem></Form>),
  ],
  ['PasswordInput', () => vue(V.MlPasswordInput, { id: 'p' }), () => react(<PasswordInput id="p" />)],
  [
    'PasswordInput full',
    () => vue(V.MlPasswordInput, { modelValue: 'abcDEF1', label: 'PW', hint: 'h', index: '02', size: 'lg', autocomplete: 'new-password', strength: true, rules: true, required: true, placeholder: 'x', id: 'p' }),
    () => react(<PasswordInput value="abcDEF1" label="PW" hint="h" index="02" size="lg" autoComplete="new-password" strength rules required placeholder="x" id="p" />),
  ],
  [
    'PasswordInput visible, custom rules, error',
    () => vue(V.MlPasswordInput, { modelValue: 'Nala-Pride-77', visible: true, rules: { minLength: 12, digit: true }, strength: true, error: 'Bad', disabled: true, id: 'p' }),
    () => react(<PasswordInput value="Nala-Pride-77" visible rules={{ minLength: 12, digit: true }} strength error="Bad" disabled id="p" />),
  ],
  ['PasswordInput no toggle, empty meter', () => vue(V.MlPasswordInput, { toggle: false, strength: true, id: 'p' }), () => react(<PasswordInput toggle={false} strength id="p" />)],
  [
    'Form > FormItem > PasswordInput',
    () => vueTree(() => h(V.MlForm, { model: { pw: '' }, rules: { pw: { required: true } } }, () => h(V.MlFormItem, { prop: 'pw' }, () => h(V.MlPasswordInput, { label: 'PW', id: 'p' })))),
    () => react(<Form model={{ pw: '' }} rules={{ pw: { required: true } }}><FormItem prop="pw"><PasswordInput label="PW" id="p" /></FormItem></Form>),
  ],
]

describe('React ↔ Vue markup parity: CheckboxGroup & PasswordInput', () => {
  for (const [name, fromVue, fromReact] of cases) {
    it(name, async () => {
      expect(fromReact()).toBe(await fromVue())
    })
  }
})
