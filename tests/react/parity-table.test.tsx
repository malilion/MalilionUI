// Markup parity for Table (see parity.test.tsx).
import { describe, expect, it } from 'vitest'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import * as V from '../../src'
import * as R from '../../src/react/table'
import { react, signature, vue } from './parity-utils'

const columns = [
  { key: 'name', title: 'Name', sortable: true },
  { key: 'age', title: 'Age', align: 'right' as const, mono: true, sortable: true },
  { key: 'note', title: 'Note', ellipsis: true, width: '120px' },
]
const rows = [
  { id: 1, name: 'Nala', age: 3, note: 'Queen' },
  { id: 2, name: 'Simba', age: 5, note: null },
  { id: 3, name: 'Kiara', age: 1, note: 'Cub' },
]
const fixedCols = [{ ...columns[0], fixed: 'left' as const }, columns[1], { ...columns[2], fixed: 'right' as const }]
const tree = [{ id: 1, name: 'Pride', age: 9, children: [{ id: 11, name: 'Nala', age: 3 }] }, { id: 2, name: 'Solo', age: 4 }]

async function vueExpand(props: Record<string, unknown>) {
  const app = createSSRApp({ render: () => h(V.MlTable, props, { expand: ({ row }: { row: { name: string } }) => `More ${row.name}` }) })
  return signature(await renderToString(app))
}

const cases: [string, () => Promise<string>, () => string][] = [
  ['basic', () => vue(V.MlTable, { columns, rows, caption: 'Lions', striped: true }), () => react(<R.Table columns={columns} rows={rows} caption="Lions" striped />)],
  ['sorted desc', () => vue(V.MlTable, { columns, rows, sort: { key: 'age', order: 'desc' }, dense: true }), () => react(<R.Table columns={columns} rows={rows} sort={{ key: 'age', order: 'desc' }} dense />)],
  ['selectable some', () => vue(V.MlTable, { columns, rows, selectable: true, selected: [2] }), () => react(<R.Table columns={columns} rows={rows} selectable selected={[2]} />)],
  ['selectable all', () => vue(V.MlTable, { columns, rows, selectable: true, selected: [1, 2, 3], hoverPaw: false }), () => react(<R.Table columns={columns} rows={rows} selectable selected={[1, 2, 3]} hoverPaw={false} />)],
  ['expandable', () => vueExpand({ columns, rows, expanded: [1], rowExpandable: (r: { id: number }) => r.id !== 3 }), () => react(<R.Table columns={columns} rows={rows} expanded={[1]} rowExpandable={(r) => r.id !== 3} renderExpand={({ row }) => `More ${row.name}`} />)],
  ['fixed columns', () => vueExpand({ columns: fixedCols, rows, selectable: true, maxHeight: 200 }), () => react(<R.Table columns={fixedCols} rows={rows} selectable maxHeight={200} renderExpand={({ row }) => `More ${row.name}`} />)],
  ['tree', () => vue(V.MlTable, { columns, rows: tree, treeOpen: [1] }), () => react(<R.Table columns={columns} rows={tree} treeOpen={[1]} />)],
  ['empty', () => vue(V.MlTable, { columns, rows: [], emptyText: 'Nothing', selectable: true }), () => react(<R.Table columns={columns} rows={[]} emptyText="Nothing" selectable />)],
  ['loading', () => vue(V.MlTable, { columns, rows: [], loading: true }), () => react(<R.Table columns={columns} rows={[]} loading />)],
  ['loading with rows', () => vue(V.MlTable, { columns, rows, loading: true }), () => react(<R.Table columns={columns} rows={rows} loading />)],
  ['paged', () => vue(V.MlTable, { columns, rows, pageSize: 2, page: 2 }), () => react(<R.Table columns={columns} rows={rows} pageSize={2} page={2} />)],
]

describe('Table markup parity', () => {
  for (const [name, fromVue, fromReact] of cases) {
    it(name, async () => {
      expect(fromReact()).toBe(await fromVue())
    })
  }
})
