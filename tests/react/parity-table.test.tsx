// Markup parity for Table (see parity.test.tsx).
import { describe, expect, it } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { createApp, createSSRApp, h, nextTick } from 'vue'
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
const editCols = [
  { key: 'name', title: 'Name', editable: true, resizable: true, sortable: true, validate: (v: unknown) => (v ? undefined : 'Required') },
  { key: 'age', title: 'Age', editable: 'number' as const, align: 'right' as const, resizable: true, width: '90px', minWidth: 60, maxWidth: 200 },
  { key: 'role', title: 'Role', editable: 'select' as const, options: [{ value: 'king', label: 'King' }, { value: 'cub', label: 'Cub' }] },
]
const editRows = [
  { id: 1, name: 'Simba', age: 5, role: 'king' },
  { id: 2, name: 'Kiara', age: 1, role: 'cub' },
]
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
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
  ['editable + resizable', () => vue(V.MlTable, { columns: editCols, rows: editRows, columnWidths: { name: 180 } }), () => react(<R.Table columns={editCols} rows={editRows} columnWidths={{ name: 180 }} />)],
  ['resizable fixed + selectable', () => vueExpand({ columns: editCols.map((c, i) => (i === 0 ? { ...c, fixed: 'left' as const } : c)), rows: editRows, selectable: true }), () => react(<R.Table columns={editCols.map((c, i) => (i === 0 ? { ...c, fixed: 'left' as const } : c))} rows={editRows} selectable renderExpand={({ row }) => `More ${row.name}`} />)],
]

describe('Table markup parity', () => {
  for (const [name, fromVue, fromReact] of cases) {
    it(name, async () => {
      expect(fromReact()).toBe(await fromVue())
    })
  }
})

/* Interactive states (editing, invalid, after a commit) can't be server-rendered: drive both live and compare. */
const key = (el: Element, k: string) => el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }))
const setValue = (el: Element, text: string) => {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(el, text)
  el.dispatchEvent(new Event('input', { bubbles: true }))
}
const editor = (host: Element) => host.querySelector('.ml-table__editor .ml-input__control')!
const cell = (host: Element, r: number, c: number) => host.querySelectorAll('tbody tr')[r].querySelectorAll('td')[c]

/** Run the same steps on a live Vue and a live React table; return both signatures. */
async function bothLive(steps: ((host: Element) => unknown)[]) {
  // One at a time: a focused editor in one table would blur (and commit) when the other opens.
  const vueHost = document.body.appendChild(document.createElement('div'))
  const app = createApp({ render: () => h(V.MlTable, { columns: editCols, rows: editRows }) })
  app.mount(vueHost)
  for (const step of steps) {
    step(vueHost)
    await nextTick()
  }
  const fromVue = signature(vueHost.innerHTML)
  app.unmount()
  document.body.innerHTML = ''
  const reactHost = document.body.appendChild(document.createElement('div'))
  const root = createRoot(reactHost)
  act(() => root.render(<R.Table columns={editCols} rows={editRows} />))
  for (const step of steps) act(() => void step(reactHost))
  const fromReact = signature(reactHost.innerHTML)
  act(() => root.unmount())
  document.body.innerHTML = ''
  return [fromVue, fromReact]
}

describe('Table live parity', () => {
  it('text editor with an error', async () => {
    const [v, r] = await bothLive([
      (host) => cell(host, 0, 0).dispatchEvent(new MouseEvent('dblclick', { bubbles: true })),
      (host) => setValue(editor(host), ''),
      (host) => key(editor(host), 'Enter'),
    ])
    expect(v).toContain('ml-table__edit-error')
    expect(r).toBe(v)
  })

  it('select editor', async () => {
    const [v, r] = await bothLive([(host) => key(cell(host, 1, 2), 'F2')])
    expect(v).toContain('ml-input__chevron')
    expect(r).toBe(v)
  })

  it('after a commit the parent ignored', async () => {
    const [v, r] = await bothLive([
      (host) => key(cell(host, 0, 1), 'Enter'),
      (host) => setValue(editor(host), '9'),
      (host) => key(editor(host), 'Enter'),
    ])
    expect(v).not.toContain('ml-table__editor')
    expect(r).toBe(v)
  })
})
