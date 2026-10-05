<script setup lang="ts">
import { computed, ref } from 'vue'
import { matchFilters, type MlFilterField, type MlFilterValue } from '@malilion/ui'

const fields: MlFilterField[] = [
  { key: 'q', label: '關鍵字', type: 'text', placeholder: '訂單編號或客戶' },
  {
    key: 'status',
    label: '狀態',
    type: 'select',
    options: [
      { value: 'paid', label: '已付款' },
      { value: 'shipped', label: '已出貨' },
      { value: 'refund', label: '退款中' },
    ],
  },
  {
    key: 'city',
    label: '縣市',
    type: 'multi',
    options: ['台北市', '新北市', '台中市', '台南市', '高雄市'].map((c) => ({ value: c, label: c })),
  },
  { key: 'amount', label: '金額', type: 'number-range' },
  { key: 'date', label: '下單日期', type: 'date-range' },
]

const orders = [
  { q: 'ML-1001 陳大文', status: 'paid', city: '台北市', amount: 1280, date: new Date(2026, 9, 1) },
  { q: 'ML-1002 林美玲', status: 'shipped', city: '台中市', amount: 560, date: new Date(2026, 9, 2) },
  { q: 'ML-1003 王小明', status: 'refund', city: '高雄市', amount: 3200, date: new Date(2026, 9, 3) },
  { q: 'ML-1004 張雅婷', status: 'paid', city: '新北市', amount: 890, date: new Date(2026, 9, 4) },
  { q: 'ML-1005 李建宏', status: 'shipped', city: '台北市', amount: 4500, date: new Date(2026, 9, 5) },
]

const draft = ref<MlFilterValue>({ status: 'paid' })
const applied = ref<MlFilterValue>({ status: 'paid' })
const rows = computed(() => orders.filter((o) => matchFilters(o, applied.value, fields)))
const statusText: Record<string, string> = { paid: '已付款', shipped: '已出貨', refund: '退款中' }
</script>

<template>
  <div class="stack">
    <MlFilterBar v-model="draft" :fields="fields" :collapse="3" @search="applied = $event" />
    <ul class="rows">
      <li v-for="o in rows" :key="o.q">
        <span>{{ o.q }}</span><span>{{ statusText[o.status] }}</span><span>{{ o.city }}</span><b>NT$ {{ o.amount.toLocaleString() }}</b>
      </li>
      <li v-if="!rows.length" class="none">沒有符合的訂單</li>
    </ul>
  </div>
</template>

<style scoped>
.stack {
  display: grid;
  gap: 14px;
}
.rows {
  display: grid;
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: 0.8125rem;
}
.rows li {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr;
  gap: 8px;
  padding: 8px 12px;
  background: var(--ml-surface-inset);
}
.rows b {
  font-family: var(--ml-font-mono);
  text-align: right;
}
.rows .none {
  display: block;
  color: var(--ml-text-dim);
}
</style>
