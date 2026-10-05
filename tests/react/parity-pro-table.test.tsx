// Markup parity for MlProTable ↔ <ProTable>.
import { describe, expect, it } from 'vitest'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { renderToStaticMarkup } from 'react-dom/server'
import * as V from '../../src'
import MlConfigProvider from '../../src/components/MlConfigProvider.vue'
import * as R from '../../src/react'
import { ConfigProvider } from '../../src/react/locale'
import { en } from '../../src/locale-data'
import { react, signature, vue } from './parity-utils'

interface Lion {
  id: number
  name: string
  role: string
  age: number
}

const roles = [
  { value: 'king', label: '獅王' },
  { value: 'cub', label: '幼獅' },
]
const columns: V.MlProTableColumn<Lion>[] = [
  { key: 'id', title: 'ID', mono: true },
  { key: 'name', title: '名字', sortable: true, filter: true, form: { required: true } },
  { key: 'role', title: '角色', options: roles, filter: true, form: true },
  { key: 'age', title: '年齡', align: 'right', filter: { type: 'number-range' }, form: { type: 'number' } },
  { key: 'note', title: '備註', hideInTable: true, form: { type: 'textarea' } },
]
const noFilters = columns.map((c) => ({ ...c, filter: false }))
const data: Lion[] = [
  { id: 1, name: 'Leo', role: 'king', age: 9 },
  { id: 2, name: 'Simba', role: 'cub', age: 2 },
  { id: 3, name: 'Nala', role: 'cub', age: 3 },
]
const noop = () => {}
const request = () => new Promise<{ data: Lion[]; total: number }>(noop)
const sort = { key: 'name', order: 'desc' as const }

const cases: [string, () => Promise<string>, () => string][] = [
  ['ProTable: local, read-only', () => vue(V.MlProTable, { columns, data, title: '獅群' }), () => react(<R.ProTable columns={columns} data={data} title="獅群" />)],
  [
    'ProTable: CRUD hooks, selection, sort, page size',
    () => vue(V.MlProTable, { columns, data, onCreate: noop, onUpdate: noop, onDelete: noop, selected: [2, 3], sort, pageSize: 2, striped: true, dense: true }),
    () => react(<R.ProTable columns={columns} data={data} onCreate={noop} onUpdate={noop} onDelete={noop} selected={[2, 3]} sort={sort} pageSize={2} striped dense />),
  ],
  [
    'ProTable: remote, loading, custom actions, one page size',
    () => vue(V.MlProTable, { columns, request, rowActions: [{ key: 'view', label: '查看' }], pageSizes: [20], pageSize: 20, emptyText: '沒有資料' }),
    () => react(<R.ProTable columns={columns} request={request} rowActions={[{ key: 'view', label: '查看' }]} pageSizes={[20]} pageSize={20} emptyText="沒有資料" />),
  ],
  [
    'ProTable: no filters, actions hidden, empty',
    () => vue(V.MlProTable, { columns: noFilters, data: [], onDelete: noop, rowActions: false, selectable: false }),
    () => react(<R.ProTable columns={noFilters} data={[]} onDelete={noop} rowActions={false} selectable={false} />),
  ],
  [
    'English locale',
    async () => signature(await renderToString(createSSRApp({ render: () => h(MlConfigProvider, { locale: en }, () => h(V.MlProTable, { columns, data, onCreate: noop, onDelete: noop, selected: [1] })) }))),
    () =>
      signature(
        renderToStaticMarkup(
          <ConfigProvider locale={en}>
            <R.ProTable columns={columns} data={data} onCreate={noop} onDelete={noop} selected={[1]} />
          </ConfigProvider>,
        ),
      ),
  ],
]

describe('React ↔ Vue markup parity: ProTable', () => {
  for (const [name, fromVue, fromReact] of cases) {
    it(name, async () => {
      expect(fromReact()).toBe(await fromVue())
    })
  }
})
