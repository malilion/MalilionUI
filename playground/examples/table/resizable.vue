<script setup lang="ts">
import { ref } from 'vue'
import type { MlTableColumn, MlTableSort } from '@malilion/ui'

const columns: MlTableColumn[] = [
  { key: 'name', title: '專案', sortable: true, resizable: true, minWidth: 100, maxWidth: 320, fixed: 'left' },
  { key: 'desc', title: '說明', resizable: true, ellipsis: true, minWidth: 120 },
  { key: 'stars', title: 'Stars', sortable: true, align: 'right', mono: true, resizable: true, minWidth: 80 },
  { key: 'updated', title: '更新', mono: true, width: '120px' },
]

const rows = [
  { id: 'stock', name: 'StockLion', desc: '台股即時報價與自選股，盤中推播漲跌提醒', stars: 342, updated: '2026-09-28' },
  { id: 'context', name: 'ContextLion', desc: '把專案脈絡整理成給 AI 看的說明文件', stars: 518, updated: '2026-09-30' },
  { id: 'lucky', name: 'LuckyLion', desc: '抽獎、轉盤、刮刮樂，活動頁一次搞定', stars: 97, updated: '2026-08-14' },
  { id: 'gift', name: 'GiftLion', desc: '交換禮物配對，避開同組與去年的對象', stars: 156, updated: '2026-09-02' },
]

const widths = ref<Record<string, number>>({ name: 160, desc: 260 })
const sort = ref<MlTableSort | null>(null)
</script>

<template>
  <div class="stack">
    <MlTable v-model:column-widths="widths" v-model:sort="sort" :columns="columns" :rows="rows" selectable :max-height="240" />
    <p class="ml-hud-label">
      欄寬 {{ Object.entries(widths).map(([k, w]) => `${k} ${w}px`).join(' · ') }}（拖曳表頭右緣，或聚焦後按 ← → 調整，Shift 一次 50px）
    </p>
  </div>
</template>

<style scoped>
.stack {
  display: grid;
  gap: 12px;
}
</style>
