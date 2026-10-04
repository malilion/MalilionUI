<script setup lang="ts">
import { ref } from 'vue'
import type { MlFilterField, MlFilterValue } from '@malilion/ui'

const fields: MlFilterField[] = [
  { key: 'name', label: '名稱', type: 'text' },
  { key: 'tag', label: '標籤', type: 'select', options: [{ value: 'vue', label: 'Vue' }, { value: 'react', label: 'React' }] },
  { key: 'day', label: '日期', type: 'date' },
]
const value = ref<MlFilterValue>({})
const log = ref<string[]>([])
</script>

<template>
  <div class="stack">
    <MlFilterBar v-model="value" :fields="fields" immediate size="sm" @search="log = [JSON.stringify($event), ...log].slice(0, 3)">
      <template #field-name="{ value: v, update }">
        <MlInput :model-value="(v as string) ?? ''" label="名稱（自訂插槽）" size="sm" placeholder="輸入就會搜尋" @update:model-value="update" />
      </template>
    </MlFilterBar>
    <code v-for="(l, i) in log" :key="i" class="log">search {{ l }}</code>
  </div>
</template>

<style scoped>
.stack {
  display: grid;
  gap: 8px;
}
.log {
  color: var(--ml-text-dim);
  font-size: 0.75rem;
}
</style>
