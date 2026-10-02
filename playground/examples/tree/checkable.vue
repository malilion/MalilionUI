<script setup lang="ts">
import { ref } from 'vue'
import type { MlTreeNode } from '@malilion/ui'

const data: MlTreeNode[] = [
  {
    key: 'project',
    label: '專案',
    children: [
      { key: 'project.read', label: '檢視' },
      { key: 'project.write', label: '編輯' },
      { key: 'project.delete', label: '刪除' },
    ],
  },
  {
    key: 'deploy',
    label: '部署',
    children: [
      { key: 'deploy.staging', label: 'Staging' },
      { key: 'deploy.prod', label: 'Production' },
    ],
  },
  { key: 'billing', label: '帳務（僅擁有者）', disabled: true },
]

const tree = ref<{ expandAll: () => void; collapseAll: () => void }>()
const expanded = ref<(string | number)[]>(['project', 'deploy'])
const checked = ref<(string | number)[]>(['project.read', 'deploy.staging'])
</script>

<template>
  <div class="box">
    <div class="actions">
      <MlButton size="sm" variant="ghost" @click="tree?.expandAll()">全部展開</MlButton>
      <MlButton size="sm" variant="ghost" @click="tree?.collapseAll()">全部收合</MlButton>
    </div>
    <MlTree
      ref="tree"
      v-model:expanded="expanded"
      v-model:checked="checked"
      :data="data"
      checkable
      :selectable="false"
      label="權限"
    />
    <p class="ml-hud-label">{{ checked.join(', ') || '—' }}</p>
  </div>
</template>

<style scoped>
.box {
  display: grid;
  gap: 10px;
  max-width: 360px;
}

.actions {
  display: flex;
  gap: 6px;
}
</style>
