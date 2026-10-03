// Markup parity for Tree, Transfer and VirtualList (see parity.test.tsx).
import { describe, expect, it } from 'vitest'
import * as V from '../../src'
import * as R from '../../src/react/data'
import { react, vue } from './parity-utils'

const tree = [
  { key: 'x', label: 'Fruit', children: [{ key: 'x1', label: 'Apple' }, { key: 'x2', label: 'Pear', disabled: true }] },
  { key: 'y', label: 'Veg', icon: 'grid' as const, children: [{ key: 'y1', label: 'Leek' }] },
  { key: 'z', label: 'Nuts' },
]
const items = [
  { key: 1, label: 'Lion' },
  { key: 2, label: 'Tiger', hint: 'stripes' },
  { key: 3, label: 'Lynx', disabled: true },
  { key: 4, label: 'Puma' },
]
const rows = Array.from({ length: 100 }, (_, i) => `Row ${i}`)

const cases: [string, () => Promise<string>, () => string][] = [
  ['Tree', () => vue(V.MlTree, { data: tree, label: 'Food' }), () => react(<R.Tree data={tree} label="Food" />)],
  ['Tree expanded selected', () => vue(V.MlTree, { data: tree, expanded: ['x'], selected: 'x1' }), () => react(<R.Tree data={tree} expanded={['x']} selected="x1" />)],
  ['Tree checkable', () => vue(V.MlTree, { data: tree, checkable: true, selectable: false, expanded: ['x', 'y'], checked: ['x1', 'y1', 'y'] }), () => react(<R.Tree data={tree} checkable selectable={false} expanded={['x', 'y']} checked={['x1', 'y1', 'y']} />)],
  ['Tree filter', () => vue(V.MlTree, { data: tree, filter: 'ee' }), () => react(<R.Tree data={tree} filter="ee" />)],
  ['Tree no match', () => vue(V.MlTree, { data: tree, filter: 'qq', emptyText: 'None' }), () => react(<R.Tree data={tree} filter="qq" emptyText="None" />)],
  ['Transfer', () => vue(V.MlTransfer, { data: items }), () => react(<R.Transfer data={items} />)],
  ['Transfer value', () => vue(V.MlTransfer, { data: items, modelValue: [4, 1], titles: ['From', 'To'], filterable: true, buttonTexts: ['Back', 'Go'] }), () => react(<R.Transfer data={items} value={[4, 1]} titles={['From', 'To']} filterable buttonTexts={['Back', 'Go']} />)],
  ['Transfer empty', () => vue(V.MlTransfer, { data: [], emptyText: 'Nothing' }), () => react(<R.Transfer data={[]} emptyText="Nothing" />)],
  ['VirtualList', () => vue(V.MlVirtualList, { items: rows, itemHeight: 40, label: 'Rows' }), () => react(<R.VirtualList items={rows} itemHeight={40} label="Rows" />)],
  ['VirtualList height', () => vue(V.MlVirtualList, { items: rows, itemHeight: 20, height: 100, overscan: 2 }), () => react(<R.VirtualList items={rows} itemHeight={20} height={100} overscan={2} />)],
  ['VirtualList empty', () => vue(V.MlVirtualList, { items: [], itemHeight: 20, height: '50vh' }), () => react(<R.VirtualList items={[]} itemHeight={20} height="50vh" />)],
]

describe('React ↔ Vue markup parity: data', () => {
  for (const [name, fromVue, fromReact] of cases) {
    it(name, async () => {
      expect(fromReact()).toBe(await fromVue())
    })
  }

  it('VirtualList renders the same window of rows', async () => {
    const { createSSRApp, h } = await import('vue')
    const { renderToString } = await import('vue/server-renderer')
    const { renderToStaticMarkup } = await import('react-dom/server')
    const app = createSSRApp({ render: () => h(V.MlVirtualList, { items: rows, itemHeight: 30, height: 120 }, { default: ({ item }: { item: string }) => h('b', item) }) })
    const v = await renderToString(app)
    const r = renderToStaticMarkup(<R.VirtualList items={rows} itemHeight={30} height={120}>{(item) => <b>{item}</b>}</R.VirtualList>)
    const texts = (html: string) => [...html.matchAll(/<b>([^<]*)<\/b>/g)].map((m) => m[1])
    expect(texts(r)).toEqual(texts(v))
    expect(texts(r)).toHaveLength(10)
    expect(r).toContain('height:3000px')
  })
})
