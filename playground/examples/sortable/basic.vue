<script setup lang="ts">
import { ref } from 'vue'

const tasks = ref([
  { id: 1, title: '設計 Menu 元件', done: true },
  { id: 2, title: '寫多語系', done: true },
  { id: 3, title: '表格固定欄', done: false },
  { id: 4, title: '新手導覽', done: false },
  { id: 5, title: '發布 0.7.0', done: false },
])
const tags = ref(['Vue', 'TypeScript', 'Vite', 'Vitest', 'CSS'].map((name) => ({ id: name, name })))
</script>

<template>
  <div class="grid">
    <div>
      <p class="ml-hud-label">拖曳整列（滑鼠或觸控）</p>
      <MlSortable v-model="tasks" :item-label="(t) => t.title">
        <template #default="{ item, index }">
          <div class="row">
            <span class="n">{{ index + 1 }}</span>
            <MlCheckbox v-model="item.done" :label="item.title" paw />
          </div>
        </template>
      </MlSortable>
    </div>
    <div>
      <p class="ml-hud-label">只能拖握把 · 鍵盤：Tab 到握把按空白鍵，再用方向鍵</p>
      <MlSortable v-model="tags" handle direction="horizontal" :item-label="(t) => t.name">
        <template #default="{ item }">
          <MlTag tone="tech" variant="outline">{{ item.name }}</MlTag>
        </template>
      </MlSortable>
    </div>
  </div>
</template>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 28px;
  width: 100%;
}

.row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  background: var(--ml-surface-2);
  box-shadow: inset 0 0 0 1px var(--ml-line-steel-strong);
}

.n {
  width: 18px;
  color: var(--ml-text-dim);
  font-family: var(--ml-font-mono);
  font-size: var(--ml-text-xs);
}
</style>
