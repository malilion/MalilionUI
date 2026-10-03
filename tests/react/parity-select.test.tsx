// Markup parity for the select family (see parity.test.tsx).
import { describe, expect, it } from 'vitest'
import * as V from '../../src'
import * as R from '../../src/react/select'
import { react, vue } from './parity-utils'

const opts = [{ value: 'a', label: 'Alpha' }, { value: 'b', label: 'Beta', disabled: true }, { value: 3, label: 'Gamma' }]
const tree = [
  { key: 'x', label: 'Fruit', children: [{ key: 'x1', label: 'Apple' }, { key: 'x2', label: 'Pear' }] },
  { key: 'y', label: 'Veg', icon: 'grid' as const },
]
const cascade = [
  { value: 'tw', label: 'Taiwan', children: [{ value: 'tpe', label: 'Taipei', children: [{ value: 'xy', label: 'Xinyi' }] }, { value: 'khh', label: 'Kaohsiung' }] },
  { value: 'jp', label: 'Japan', disabled: true },
]

const cases: [string, () => Promise<string>, () => string][] = [
  ['Select', () => vue(V.MlSelect, { options: opts, label: 'Pick', placeholder: 'Choose', id: 's' }), () => react(<R.Select options={opts} label="Pick" placeholder="Choose" id="s" />)],
  ['Select error', () => vue(V.MlSelect, { options: opts, error: 'Bad', modelValue: 3, size: 'sm', id: 's' }), () => react(<R.Select options={opts} error="Bad" value={3} size="sm" id="s" />)],
  ['Combobox', () => vue(V.MlCombobox, { options: opts, label: 'Pick', id: 'c' }), () => react(<R.Combobox options={opts} label="Pick" id="c" />)],
  ['Combobox value', () => vue(V.MlCombobox, { options: opts, modelValue: 'a', clearable: true, hint: 'h', id: 'c' }), () => react(<R.Combobox options={opts} value="a" clearable hint="h" id="c" />)],
  ['Combobox searchable', () => vue(V.MlCombobox, { options: opts, searchable: true, modelValue: 3, id: 'c' }), () => react(<R.Combobox options={opts} searchable value={3} id="c" />)],
  ['Combobox multiple', () => vue(V.MlCombobox, { options: opts, multiple: true, modelValue: ['a', 3], clearable: true, name: 'n', id: 'c' }), () => react(<R.Combobox options={opts} multiple value={['a', 3]} clearable name="n" id="c" />)],
  ['Combobox empty', () => vue(V.MlCombobox, { options: [], id: 'c' }), () => react(<R.Combobox options={[]} id="c" />)],
  ['Autocomplete', () => vue(V.MlAutocomplete, { suggestions: ['Lion', { value: 'cat', hint: 'meow' }], label: 'Name', id: 'a' }), () => react(<R.Autocomplete suggestions={['Lion', { value: 'cat', hint: 'meow' }]} label="Name" id="a" />)],
  ['Autocomplete value', () => vue(V.MlAutocomplete, { suggestions: ['Lion', 'Lynx'], modelValue: 'L', clearable: true, minChars: 0, id: 'a' }), () => react(<R.Autocomplete suggestions={['Lion', 'Lynx']} value="L" clearable minChars={0} id="a" />)],
  ['Cascader', () => vue(V.MlCascader, { options: cascade, label: 'Where', id: 'k' }), () => react(<R.Cascader options={cascade} label="Where" id="k" />)],
  ['Cascader value', () => vue(V.MlCascader, { options: cascade, modelValue: ['tw', 'tpe', 'xy'], clearable: true, id: 'k' }), () => react(<R.Cascader options={cascade} value={['tw', 'tpe', 'xy']} clearable id="k" />)],
  ['TreeSelect', () => vue(V.MlTreeSelect, { data: tree, label: 'Food', id: 't' }), () => react(<R.TreeSelect data={tree} label="Food" id="t" />)],
  ['TreeSelect value', () => vue(V.MlTreeSelect, { data: tree, modelValue: 'x2', clearable: true, id: 't' }), () => react(<R.TreeSelect data={tree} value="x2" clearable id="t" />)],
  ['TreeSelect multiple', () => vue(V.MlTreeSelect, { data: tree, multiple: true, modelValue: ['x', 'x1', 'x2', 'y'], maxTags: 1, id: 't' }), () => react(<R.TreeSelect data={tree} multiple value={['x', 'x1', 'x2', 'y']} maxTags={1} id="t" />)],
]

describe('React ↔ Vue markup parity: select family', () => {
  for (const [name, fromVue, fromReact] of cases) {
    it(name, async () => {
      expect(fromReact()).toBe(await fromVue())
    })
  }
})
