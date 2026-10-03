<script setup lang="ts">
import { ref } from 'vue'
import type { MlMenuItem } from '@malilion/ui'

const active = ref('home')

const items: MlMenuItem[] = [
  { key: 'home', label: '首頁', icon: 'home' },
  {
    key: 'products',
    label: '產品',
    children: [
      { key: 'ui', label: 'MalilionUI 元件庫', icon: 'grid' },
      { key: 'icons', label: '圖示集', icon: 'heart' },
      {
        key: 'more',
        label: '更多',
        children: [
          { key: 'cli', label: 'CLI 工具' },
          { key: 'figma', label: 'Figma 套件' },
        ],
      },
    ],
  },
  { key: 'docs', label: '文件', icon: 'file' },
  { key: 'blog', label: '部落格', href: '#/menu' },
]
</script>

<template>
  <div class="demo">
    <MlMenu v-model="active" mode="horizontal" :items="items" class="bar" />
  </div>
</template>

<style scoped>
.demo {
  min-height: 240px;
}

.bar {
  border-bottom: 1px solid var(--ml-line);
}
</style>
