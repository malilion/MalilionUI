// Markup parity for BottomSheet / ActionSheet (see parity.test.tsx).
import { describe, expect, it } from 'vitest'
import { createSSRApp, h, type Component } from 'vue'
import { renderToString } from 'vue/server-renderer'
import * as V from '../../src'
import * as R from '../../src/react/sheet'
import { react, signature, vue } from './parity-utils'

/** Vue render with named slots. */
async function vueSlots(component: Component, props: Record<string, unknown>, slots: Record<string, string>) {
  const app = createSSRApp({ render: () => h(component, props, Object.fromEntries(Object.entries(slots).map(([k, v]) => [k, () => v]))) })
  return signature(await renderToString(app))
}

const actions = [
  { label: 'Share', value: 'share', icon: 'message' as const },
  { label: 'Locked', disabled: true, description: 'Pro only' },
  { label: 'Delete', value: 'del', tone: 'danger' as const },
  { label: 'Star', tone: 'accent' as const },
]

const cases: [string, () => Promise<string>, () => string][] = [
  ['BottomSheet closed', () => vue(V.MlBottomSheet, { title: 'T' }, 'Body'), () => react(<R.BottomSheet title="T">Body</R.BottomSheet>)],
  ['BottomSheet open (portal)', () => vue(V.MlBottomSheet, { open: true, title: 'T' }, 'Body'), () => react(<R.BottomSheet open title="T">Body</R.BottomSheet>)],
  ['BottomSheet inline fit', () => vue(V.MlBottomSheet, { open: true, inline: true, title: 'T', description: 'D' }, 'Body'), () => react(<R.BottomSheet open inline title="T" description="D">Body</R.BottomSheet>)],
  [
    'BottomSheet inline snaps + footer',
    () => vueSlots(V.MlBottomSheet, { open: true, inline: true, title: 'T', snapPoints: ['25%', 400], snap: 1 }, { default: 'Body', footer: 'Foot' }),
    () => react(<R.BottomSheet open inline title="T" snapPoints={['25%', 400]} snap={1} footer="Foot">Body</R.BottomSheet>),
  ],
  [
    'BottomSheet peek, no handle, no title',
    () => vue(V.MlBottomSheet, { open: true, inline: true, modal: false, handle: false, snapPoints: [96, '50%'], label: 'Map' }, 'Body'),
    () => react(<R.BottomSheet open inline modal={false} handle={false} snapPoints={[96, '50%']} label="Map">Body</R.BottomSheet>),
  ],
  [
    'BottomSheet header slot',
    () => vueSlots(V.MlBottomSheet, { open: true, inline: true }, { default: 'Body', header: 'Custom' }),
    () => react(<R.BottomSheet open inline header="Custom">Body</R.BottomSheet>),
  ],
  ['ActionSheet closed', () => vue(V.MlActionSheet, { actions }), () => react(<R.ActionSheet actions={actions} />)],
  [
    'ActionSheet inline open',
    () => vue(V.MlActionSheet, { open: true, inline: true, actions, title: 'Photo', description: 'Pick one' }),
    () => react(<R.ActionSheet open inline actions={actions} title="Photo" description="Pick one" />),
  ],
  [
    'ActionSheet custom cancel',
    () => vue(V.MlActionSheet, { open: true, inline: true, actions, cancelText: 'Nope' }),
    () => react(<R.ActionSheet open inline actions={actions} cancelText="Nope" />),
  ],
  [
    'ActionSheet no cancel',
    () => vue(V.MlActionSheet, { open: true, inline: true, actions, cancelText: false, label: 'Menu' }),
    () => react(<R.ActionSheet open inline actions={actions} cancelText={false} label="Menu" />),
  ],
  ['ActionSheetHost', () => vue(V.MlActionSheetHost), () => react(<R.ActionSheetHost />)],
]

describe('React ↔ Vue markup parity: sheets', () => {
  for (const [name, fromVue, fromReact] of cases) {
    it(name, async () => {
      expect(fromReact()).toBe(await fromVue())
    })
  }

  it('inline open sheets render the same attributes that matter', async () => {
    const app = createSSRApp({ render: () => h(V.MlBottomSheet, { open: true, inline: true, title: 'T', snapPoints: ['25%', '50%'] }) })
    const html = await renderToString(app)
    const { renderToStaticMarkup } = await import('react-dom/server')
    const out = renderToStaticMarkup(<R.BottomSheet open inline title="T" snapPoints={['25%', '50%']} />)
    for (const attr of ['role="slider"', 'aria-valuetext="第 1 段，共 2 段"', 'aria-modal="true"', '--_h:25%']) {
      expect(html.replace(/\s/g, '')).toContain(attr.replace(/\s/g, ''))
      expect(out.replace(/\s/g, '')).toContain(attr.replace(/\s/g, ''))
    }
  })
})
