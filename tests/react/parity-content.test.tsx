// Markup parity for the content components (see parity.test.tsx).
import { describe, expect, it } from 'vitest'
import { createSSRApp, h, type Component } from 'vue'
import { renderToString } from 'vue/server-renderer'
import * as V from '../../src'
import * as R from '../../src/react/content'
import { react, signature, vue } from './parity-utils'

async function vueSlots(component: Component, props: Record<string, unknown>, slots: Record<string, (ctx: any) => unknown>) {
  const app = createSSRApp({ render: () => h(component, props, slots) })
  return signature(await renderToString(app))
}

const tiles = [
  { id: 1, title: 'Mane' },
  { id: 2, title: 'Claw' },
  { id: 3, title: 'Roar' },
]

const cases: [string, () => Promise<string>, () => string][] = [
  ['Ellipsis', () => vue(V.MlEllipsis, { text: 'A long lion tale' }), () => react(<R.Ellipsis text="A long lion tale" />)],
  [
    'Ellipsis multi-line expandable',
    () => vue(V.MlEllipsis, { text: 'Tale', lines: 3, expandable: true, placement: 'bottom', tag: 'p' }),
    () => react(<R.Ellipsis text="Tale" lines={3} expandable placement="bottom" as="p" />),
  ],
  ['Ellipsis middle', () => vue(V.MlEllipsis, { text: 'lion-mane@2x.png', position: 'middle' }), () => react(<R.Ellipsis text="lion-mane@2x.png" position="middle" />)],
  ['Ellipsis rich content, no tooltip', () => vue(V.MlEllipsis, { tooltip: false }, 'Rich'), () => react(<R.Ellipsis tooltip={false}>Rich</R.Ellipsis>)],
  [
    'Ellipsis custom tooltip',
    () => vueSlots(V.MlEllipsis, { text: 'Body' }, { content: () => h('b', 'Tip') }),
    () => react(<R.Ellipsis text="Body" content={<b>Tip</b>} />),
  ],
  ['Scrollbar', () => vue(V.MlScrollbar, { maxHeight: 200, label: 'Log' }, 'x'), () => react(<R.Scrollbar maxHeight={200} label="Log">x</R.Scrollbar>)],
  [
    'Scrollbar horizontal always',
    () => vue(V.MlScrollbar, { direction: 'horizontal', always: true, height: '10rem', viewClass: 'strip' }, 'x'),
    () => react(<R.Scrollbar direction="horizontal" always height="10rem" viewClassName="strip">x</R.Scrollbar>),
  ],
  ['Scrollbar vertical', () => vue(V.MlScrollbar, { direction: 'vertical' }, 'x'), () => react(<R.Scrollbar direction="vertical">x</R.Scrollbar>)],
  [
    'Masonry',
    () => vueSlots(V.MlMasonry, { items: tiles, columns: { 0: 1, 640: 3 }, gap: 12, label: 'Wall', animate: true }, { default: ({ item }) => h('article', item.title) }),
    () => react(<R.Masonry items={tiles} columns={{ 0: 1, 640: 3 }} gap={12} label="Wall" animate>{(item) => <article>{item.title}</article>}</R.Masonry>),
  ],
  [
    'Masonry empty',
    () => vueSlots(V.MlMasonry, { items: [] }, { default: () => null, empty: () => h('p', 'Nothing') }),
    () => react(<R.Masonry items={[]} empty={<p>Nothing</p>} />),
  ],
]

describe('React ↔ Vue markup parity: content', () => {
  for (const [name, fromVue, fromReact] of cases) {
    it(name, async () => {
      expect(fromReact()).toBe(await fromVue())
    })
  }
})
