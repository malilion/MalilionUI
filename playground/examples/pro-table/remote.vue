<script setup lang="ts">
import { ref } from 'vue'
import { localQuery, proFilterFields, type MlProTableColumn, type MlProTableRequestParams } from '@malilion/ui'

interface Order {
  no: string
  customer: string
  status: string
  amount: number
  created: Date
}

const statuses = [
  { value: 'paid', label: '已付款' },
  { value: 'shipped', label: '已出貨' },
  { value: 'refund', label: '退款中' },
]

const columns: MlProTableColumn<Order>[] = [
  { key: 'no', title: '訂單編號', mono: true, sortable: true, filter: { label: '訂單編號', placeholder: 'ML-' } },
  { key: 'customer', title: '客戶', filter: true, form: { required: true } },
  { key: 'status', title: '狀態', options: statuses, filter: { type: 'multi' }, form: { required: true } },
  { key: 'amount', title: '金額', align: 'right', mono: true, sortable: true, format: (v) => `NT$ ${Number(v).toLocaleString('zh-TW')}`, filter: { type: 'number-range' }, form: { type: 'number', min: 0, step: 100 } },
  { key: 'created', title: '下單日期', sortable: true, format: (v) => (v as Date).toLocaleDateString('zh-TW'), filter: { type: 'date-range' } },
]

// A pretend back end: 86 orders, filtered / sorted / paged "on the server".
const names = ['陳大文', '林美玲', '王小明', '張雅婷', '李建宏', '黃志豪', '吳佳穎', '劉家豪']
let db: Order[] = Array.from({ length: 86 }, (_, i) => ({
  no: `ML-${String(1001 + i)}`,
  customer: names[i % names.length],
  status: statuses[(i * 7) % 3].value,
  amount: 300 + ((i * 1373) % 9000),
  created: new Date(2026, 8, 1 + (i % 30)),
}))

const fail = ref(false)
const lastQuery = ref('')
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

let calls = 0
async function request(params: MlProTableRequestParams) {
  lastQuery.value = JSON.stringify({ ...params, filters: Object.keys(params.filters) })
  // The first page comes back quickly; later ones are slow enough to see the loader.
  await wait(calls++ ? 500 + Math.random() * 400 : 120)
  if (fail.value) throw new Error('伺服器忙碌中（503），請稍後再試')
  return localQuery(db, params, proFilterFields(columns))
}

async function onUpdate(row: Order, values: Record<string, unknown>) {
  await wait(600)
  if (Number(values.amount) > 50000) throw new Error('單筆金額不能超過 NT$ 50,000')
  db = db.map((o) => (o.no === row.no ? { ...o, ...values } : o))
}
async function onDelete(rows: Order[]) {
  await wait(400)
  const gone = new Set(rows.map((r) => r.no))
  db = db.filter((o) => !gone.has(o.no))
}
</script>

<template>
  <div class="stack">
    <MlProTable title="訂單管理" :columns="columns" :request="request" row-key="no" @update="onUpdate" @delete="onDelete">
      <template #toolbar>
        <MlSwitch v-model="fail" label="模擬伺服器錯誤" />
      </template>
    </MlProTable>
    <code class="query">request({{ lastQuery }})</code>
  </div>
</template>

<style scoped>
.stack {
  display: grid;
  gap: 10px;
}
.query {
  overflow-x: auto;
  padding: 8px 12px;
  background: var(--ml-surface-inset);
  color: var(--ml-text-muted);
  font-family: var(--ml-font-mono);
  font-size: 0.75rem;
  white-space: nowrap;
}
</style>
