<script setup lang="ts">
import { ref } from 'vue'
import { toast, type MlKanbanColumn } from '@malilion/ui'

interface Card {
  id: number
  title: string
  owner: string
  tag: string
}

const columns = ref<MlKanbanColumn<Card>[]>([
  { key: 'todo', title: '待辦', tone: 'steel', items: [
    { id: 1, title: 'Tour 新手導覽', owner: 'Nala', tag: 'feature' },
    { id: 2, title: '雷達圖', owner: 'Simba', tag: 'chart' },
  ] },
  { key: 'doing', title: '進行中', tone: 'gold', limit: 3, items: [
    { id: 3, title: '表格固定欄', owner: '碼力獅', tag: 'table' },
  ] },
  { key: 'review', title: '審查', tone: 'tech', items: [] },
  { key: 'done', title: '完成', tone: 'success', items: [
    { id: 4, title: '多語系', owner: '碼力獅', tag: 'i18n' },
  ] },
])
const titleOf = (id: string) => columns.value.find((c) => c.key === id)?.title
</script>

<template>
  <MlKanban
    v-model="columns"
    :item-label="(c) => c.title"
    @move="(e) => e.from !== e.to && toast(`「${e.item.title}」→ ${titleOf(e.to)}`)"
  >
    <template #card="{ item }">
      <p class="title">{{ item.title }}</p>
      <div class="meta">
        <MlTag tone="steel">{{ item.tag }}</MlTag>
        <span>{{ item.owner }}</span>
      </div>
    </template>
  </MlKanban>
</template>

<style scoped>
.title {
  margin: 0 0 8px;
  font-size: var(--ml-text-sm);
}

.meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: var(--ml-text-dim);
  font-size: var(--ml-text-xs);
}
</style>
