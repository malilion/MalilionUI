<script setup lang="ts">
import { ref } from 'vue'
import type { MlTreeNode } from '@malilion/ui'

const data: MlTreeNode[] = [
  {
    key: 'src',
    label: 'src',
    icon: 'folder',
    children: [
      {
        key: 'components',
        label: 'components',
        icon: 'folder',
        children: [
          { key: 'button', label: 'MlButton.vue', icon: 'file' },
          { key: 'card', label: 'MlCard.vue', icon: 'file' },
          { key: 'tree', label: 'MlTree.vue', icon: 'file' },
        ],
      },
      { key: 'styles', label: 'styles', icon: 'folder', children: [{ key: 'tokens', label: 'tokens.css', icon: 'file' }] },
      { key: 'index', label: 'index.ts', icon: 'file' },
    ],
  },
  { key: 'readme', label: 'README.md', icon: 'file' },
  { key: 'secret', label: '.env (locked)', icon: 'file', disabled: true },
]

const expanded = ref<(string | number)[]>(['src'])
const selected = ref<string | number | null>('index')
const filter = ref('')
</script>

<template>
  <div class="box">
    <MlInput v-model="filter" placeholder="篩選檔案…" size="sm">
      <template #prefix><MlIcon name="search" /></template>
    </MlInput>
    <MlTree v-model:expanded="expanded" v-model:selected="selected" :data="data" :filter="filter" label="專案檔案" />
    <p class="ml-hud-label">selected = {{ selected ?? 'null' }}</p>
  </div>
</template>

<style scoped>
.box {
  display: grid;
  gap: 12px;
  max-width: 360px;
}
</style>
