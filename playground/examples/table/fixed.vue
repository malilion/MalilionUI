<script setup lang="ts">
import { ref } from 'vue'
import type { MlTableColumn } from '@malilion/ui'

const regions = ['台北', '新竹', '台中', '高雄', '東京', '新加坡']
const rows = Array.from({ length: 46 }, (_, i) => ({
  id: `D-${String(1001 + i)}`,
  service: ['roar-api', 'paw-cdn', 'mane-auth', 'den-db'][i % 4],
  region: regions[i % regions.length],
  cpu: 12 + ((i * 37) % 80),
  memory: `${(0.4 + ((i * 13) % 30) / 10).toFixed(1)} GB`,
  requests: 1200 + ((i * 7919) % 90000),
  latency: 18 + ((i * 31) % 240),
  updated: `2026-10-${String(1 + (i % 28)).padStart(2, '0')}`,
}))

const columns: MlTableColumn[] = [
  { key: 'id', title: '部署', width: '110px', fixed: 'left', mono: true },
  { key: 'service', title: '服務', width: '140px', sortable: true },
  { key: 'region', title: '區域', width: '110px' },
  { key: 'cpu', title: 'CPU %', width: '100px', align: 'right', sortable: true, mono: true },
  { key: 'memory', title: '記憶體', width: '110px', align: 'right', mono: true },
  { key: 'requests', title: '請求數', width: '130px', align: 'right', sortable: true, mono: true, format: (v) => Number(v).toLocaleString() },
  { key: 'latency', title: '延遲 ms', width: '110px', align: 'right', sortable: true, mono: true },
  { key: 'updated', title: '更新', width: '130px', mono: true },
  { key: 'actions', title: '操作', width: '96px', fixed: 'right', align: 'center' },
]

const page = ref(1)
const selected = ref<(string | number)[]>([])
</script>

<template>
  <MlTable
    v-model:page="page"
    v-model:selected="selected"
    :columns="columns"
    :rows="rows"
    :page-size="10"
    :max-height="320"
    selectable
    dense
  >
    <template #cell-actions>
      <MlButton size="sm" variant="ghost">查看</MlButton>
    </template>
  </MlTable>
</template>
