<script setup lang="ts">
import { ref } from 'vue'

// 100,000 rows — only the ~20 on screen are actually in the DOM.
const rows = Array.from({ length: 100_000 }, (_, i) => ({
  id: i + 1,
  name: `小獅子 #${String(i + 1).padStart(6, '0')}`,
  roar: Math.round(40 + 60 * Math.abs(Math.sin(i * 1.7))),
}))
const list = ref<{ scrollToIndex: (i: number, align?: 'start' | 'center' | 'end') => void }>()
const jump = ref(50000)
</script>

<template>
  <div class="wrap">
    <MlSpace>
      <MlNumberInput v-model="jump" :min="1" :max="100000" />
      <MlButton size="sm" variant="outline" @click="list?.scrollToIndex(jump - 1, 'center')">跳到第 {{ jump }} 隻</MlButton>
    </MlSpace>
    <MlVirtualList ref="list" :items="rows" :item-height="44" :height="300" :item-key="(r) => r.id" label="獅群名冊" class="list">
      <template #default="{ item }">
        <div class="row">
          <span class="id">{{ item.id }}</span>
          <span class="name">{{ item.name }}</span>
          <MlProgress :value="item.roar" size="sm" :show-value="false" class="bar" />
        </div>
      </template>
    </MlVirtualList>
  </div>
</template>

<style scoped>
.wrap {
  display: grid;
  gap: 12px;
  width: 100%;
}

.list {
  box-shadow: inset 0 0 0 1px var(--ml-line);
}

.row {
  display: flex;
  align-items: center;
  gap: 14px;
  height: 100%;
  padding: 0 14px;
  border-bottom: 1px solid var(--ml-line-steel);
}

.id {
  width: 56px;
  color: var(--ml-text-dim);
  font-family: var(--ml-font-mono);
  font-size: var(--ml-text-xs);
}

.name {
  flex: 1;
  font-size: var(--ml-text-sm);
}

.bar {
  width: 120px;
}
</style>
