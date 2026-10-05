<script setup lang="ts">
import { ref } from 'vue'
import type { MlTableCellEdit, MlTableColumn } from '@malilion/ui'

interface Item {
  id: string
  name: string
  stock: number
  status: string
}

const columns: MlTableColumn<Item>[] = [
  { key: 'id', title: '料號', mono: true, width: '110px' },
  {
    key: 'name',
    title: '品名',
    editable: true,
    validate: (v) => (String(v).trim() ? undefined : '品名不能空白'),
  },
  {
    key: 'stock',
    title: '庫存',
    editable: 'number',
    align: 'right',
    mono: true,
    validate: (v) => (typeof v === 'number' && v >= 0 && Number.isInteger(v) ? undefined : '請輸入 0 以上的整數'),
  },
  {
    key: 'status',
    title: '狀態',
    editable: 'select',
    options: [
      { value: 'on', label: '上架中' },
      { value: 'off', label: '已下架' },
      { value: 'soon', label: '即將推出' },
    ],
  },
]

const rows = ref<Item[]>([
  { id: 'ML-001', name: '獅子鬃毛梳', stock: 42, status: 'on' },
  { id: 'ML-002', name: '金屬爪印徽章', stock: 0, status: 'off' },
  { id: 'ML-003', name: '碼力獅貼紙組', stock: 128, status: 'on' },
  { id: 'ML-004', name: '機械獅模型', stock: 7, status: 'soon' },
])

const log = ref('雙擊儲存格，或用 Tab 移到儲存格後按 Enter / F2 開始編輯')

// The table only reports the edit — saving it (here: right away) is up to you.
function onEdit({ row, key, value, oldValue }: MlTableCellEdit<Item>) {
  rows.value = rows.value.map((r) => (r.id === row.id ? { ...r, [key]: value } : r))
  log.value = `${row.id} 的 ${key}：${oldValue} → ${value}`
}
</script>

<template>
  <div class="stack">
    <MlTable :columns="columns" :rows="rows" @cell-edit="onEdit" />
    <p class="ml-hud-label">{{ log }}</p>
  </div>
</template>

<style scoped>
.stack {
  display: grid;
  gap: 12px;
}
</style>
