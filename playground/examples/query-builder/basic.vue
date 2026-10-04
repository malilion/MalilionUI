<script setup lang="ts">
import { computed, ref } from 'vue'
import { evaluateQuery, type MlQueryField, type MlQueryGroup } from '@malilion/ui'

const fields: MlQueryField[] = [
  { key: 'name', label: '姓名', type: 'text' },
  { key: 'age', label: '年齡', type: 'number' },
  { key: 'city', label: '縣市', type: 'select', options: ['台北市', '台中市', '高雄市'].map((c) => ({ value: c, label: c })) },
  { key: 'joined', label: '加入日期', type: 'date' },
  { key: 'vip', label: 'VIP', type: 'boolean' },
]

const query = ref<MlQueryGroup>({
  id: 'root',
  combinator: 'and',
  rules: [
    { id: 'r1', field: 'city', operator: 'in', value: ['台北市', '台中市'] },
    {
      id: 'g1',
      combinator: 'or',
      rules: [
        { id: 'r2', field: 'age', operator: 'gte', value: 30 },
        { id: 'r3', field: 'vip', operator: 'isTrue' },
      ],
    },
  ],
})

const people = [
  { name: '陳大文', age: 34, city: '台北市', joined: '2024-03-01', vip: false },
  { name: '林美玲', age: 26, city: '台中市', joined: '2025-07-12', vip: true },
  { name: '王小明', age: 41, city: '高雄市', joined: '2023-11-20', vip: true },
  { name: '張雅婷', age: 22, city: '台北市', joined: '2026-01-05', vip: false },
]
const matched = computed(() => people.filter((p) => evaluateQuery(query.value, p, fields)))
</script>

<template>
  <div class="stack">
    <MlQueryBuilder v-model="query" :fields="fields" show-text />
    <p class="out">符合：{{ matched.map((p) => p.name).join('、') || '（無）' }}</p>
  </div>
</template>

<style scoped>
.stack {
  display: grid;
  gap: 10px;
}
.out {
  margin: 0;
  font-size: 0.875rem;
}
</style>
