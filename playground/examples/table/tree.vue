<script setup lang="ts">
import { ref } from 'vue'

const columns = [
  { key: 'name', title: '名稱', sortable: true },
  { key: 'size', title: '大小', align: 'right' as const, mono: true, sortable: true, format: (v: unknown) => `${v} KB` },
  { key: 'type', title: '類型' },
]
const rows = [
  {
    id: 'src',
    name: 'src',
    size: 412,
    type: '資料夾',
    children: [
      {
        id: 'components',
        name: 'components',
        size: 318,
        type: '資料夾',
        children: [
          { id: 'MlTable.vue', name: 'MlTable.vue', size: 14, type: 'Vue' },
          { id: 'MlMenu.vue', name: 'MlMenu.vue', size: 5, type: 'Vue' },
        ],
      },
      { id: 'locale.ts', name: 'locale.ts', size: 16, type: 'TypeScript' },
    ],
  },
  { id: 'package.json', name: 'package.json', size: 2, type: 'JSON' },
]
const open = ref<(string | number)[]>(['src'])
</script>

<template>
  <MlTable v-model:tree-open="open" :columns="columns" :rows="rows" :hover-paw="false" />
</template>
