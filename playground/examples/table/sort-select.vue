<script setup lang="ts">
import { ref } from 'vue'
import type { MlTableSort } from '@malilion/ui'

const columns = [
  { key: 'name', title: '專案', sortable: true },
  { key: 'stars', title: 'Stars', sortable: true, align: 'right' as const, mono: true },
  { key: 'issues', title: 'Issues', sortable: true, align: 'right' as const, mono: true },
  { key: 'updated', title: '更新', sortable: true, mono: true },
]

const rows = [
  { id: 'stock', name: 'StockLion', stars: 342, issues: 12, updated: '2026-09-28' },
  { id: 'context', name: 'ContextLion', stars: 518, issues: 4, updated: '2026-09-30' },
  { id: 'lucky', name: 'LuckyLion', stars: 97, issues: null, updated: '2026-08-14' },
  { id: 'gift', name: 'GiftLion', stars: 156, issues: 9, updated: '2026-09-02' },
  { id: 'toeic', name: 'ToeicLion', stars: 233, issues: 21, updated: '2026-07-19' },
]

const sort = ref<MlTableSort | null>({ key: 'stars', order: 'desc' })
const selected = ref<(string | number)[]>(['context'])
</script>

<template>
  <div class="stack">
    <MlTable v-model:sort="sort" v-model:selected="selected" :columns="columns" :rows="rows" selectable striped />
    <p class="ml-hud-label">
      已選 {{ selected.length }} 項 · 排序 {{ sort ? `${sort.key} ${sort.order}` : '無' }}
    </p>
  </div>
</template>

<style scoped>
.stack {
  display: grid;
  gap: 12px;
}
</style>
