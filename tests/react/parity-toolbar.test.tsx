// Markup parity for MlHighlight / MlButtonGroup / MlToggleGroup ↔ their React versions.
import { describe, expect, it } from 'vitest'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import * as V from '../../src'
import * as R from '../../src/react'
import { react, signature, vue } from './parity-utils'

const options = [
  { value: 'bold', label: '粗體', icon: 'heart' as const },
  { value: 'italic', label: '斜體' },
  { value: 'strike', icon: 'close' as const, title: '刪除線' },
  { value: 'code', label: '程式碼', disabled: true },
]

const group = async (props: Record<string, unknown>, buttons: Record<string, unknown>[]) =>
  signature(await renderToString(createSSRApp({ render: () => h(V.MlButtonGroup, props, () => buttons.map((b, i) => h(V.MlButton, b, () => `B${i}`))) })))

const cases: [string, () => Promise<string>, () => string][] = [
  ['Highlight', () => vue(V.MlHighlight, { text: '碼力獅子座的獅子', keywords: '獅子' }), () => react(<R.Highlight text="碼力獅子座的獅子" keywords="獅子" />)],
  ['Highlight: no keywords', () => vue(V.MlHighlight, { text: '碼力獅' }), () => react(<R.Highlight text="碼力獅" />)],
  [
    'Highlight: tag, class, tone, several keywords',
    () => vue(V.MlHighlight, { text: 'Malilion ＵＩ 與 C++', keywords: ['ui', 'C++', ''], tag: 'strong', highlightClass: 'hit', tone: 'tech' }),
    () => react(<R.Highlight text="Malilion ＵＩ 與 C++" keywords={['ui', 'C++', '']} as="strong" highlightClassName="hit" tone="tech" />),
  ],
  ['Highlight: empty text', () => vue(V.MlHighlight, { text: '', keywords: 'a' }), () => react(<R.Highlight text="" keywords="a" />)],
  ['ToggleGroup', () => vue(V.MlToggleGroup, { options, modelValue: 'italic', label: '樣式' }), () => react(<R.ToggleGroup options={options} value="italic" label="樣式" />)],
  [
    'ToggleGroup: multiple, vertical, block, small',
    () => vue(V.MlToggleGroup, { options, modelValue: ['bold', 'strike'], multiple: true, vertical: true, block: true, size: 'sm' }),
    () => react(<R.ToggleGroup options={options} value={['bold', 'strike']} multiple vertical block size="sm" />),
  ],
  ['ToggleGroup: disabled, empty', () => vue(V.MlToggleGroup, { options, modelValue: null, disabled: true, size: 'lg' }), () => react(<R.ToggleGroup options={options} value={null} disabled size="lg" />)],
  [
    'ButtonGroup',
    () => group({ label: '對齊' }, [{}, { variant: 'steel' }, { disabled: true }]),
    () =>
      react(
        <R.ButtonGroup label="對齊">
          <R.Button>B0</R.Button>
          <R.Button variant="steel">B1</R.Button>
          <R.Button disabled>B2</R.Button>
        </R.ButtonGroup>,
      ),
  ],
  [
    'ButtonGroup: size, variant, vertical, block',
    () => group({ size: 'sm', variant: 'outline', vertical: true, block: true, disabled: true }, [{}, { size: 'lg', variant: 'danger' }]),
    () =>
      react(
        <R.ButtonGroup size="sm" variant="outline" vertical block disabled>
          <R.Button>B0</R.Button>
          <R.Button size="lg" variant="danger">
            B1
          </R.Button>
        </R.ButtonGroup>,
      ),
  ],
]

describe('React ↔ Vue markup parity: Highlight, ButtonGroup, ToggleGroup', () => {
  for (const [name, fromVue, fromReact] of cases) {
    it(name, async () => {
      expect(fromReact()).toBe(await fromVue())
    })
  }
})
