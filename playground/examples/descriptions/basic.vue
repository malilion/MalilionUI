<script setup lang="ts">
import type { MlDescriptionItem } from '@malilion/ui'

const items: MlDescriptionItem[] = [
  { label: '專案名稱', value: 'MalilionUI' },
  { label: '版本', value: 'v0.6.0', mono: true },
  { label: '負責人', value: '碼力獅' },
  { label: 'Commit', value: '4ec7609', mono: true },
  { label: '部署環境', value: 'Production' },
  { label: '狀態' },
  { label: '說明', value: '以獅子為魂、科技為骨、金屬為甲的 Vue 3 元件庫，再踩上一串可愛的肉球腳印。', span: 3 },
]
</script>

<template>
  <MlDescriptions title="部署資訊" :items="items">
    <template #extra><MlButton size="sm" variant="outline">編輯</MlButton></template>
    <template #item-5><MlBadge tone="success" dot>運行中</MlBadge></template>
  </MlDescriptions>
</template>
