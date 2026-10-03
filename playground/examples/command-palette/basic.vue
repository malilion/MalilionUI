<script setup lang="ts">
import { ref } from 'vue'
import { toast, type MlCommandItem } from '@malilion/ui'

const open = ref(false)

const items: MlCommandItem[] = [
  { value: 'new-file', label: '新增檔案', group: '檔案', icon: 'file', shortcut: '⌘ N' },
  { value: 'open-folder', label: '開啟資料夾', group: '檔案', icon: 'folder', shortcut: '⌘ O' },
  { value: 'upload', label: '上傳到雲端', group: '檔案', icon: 'upload', keywords: ['deploy', 'sync'] },
  { value: 'go-home', label: '前往首頁', group: '導覽', icon: 'home', shortcut: 'G H' },
  { value: 'go-settings', label: '開啟設定', group: '導覽', icon: 'settings', shortcut: '⌘ ,' },
  { value: 'calendar', label: '查看行事曆', group: '導覽', icon: 'calendar' },
  { value: 'theme', label: '切換日光 / 夜間模式', group: '偏好', icon: 'rotate', keywords: ['dark', 'light', 'theme'] },
  { value: 'notify', label: '通知設定', group: '偏好', icon: 'bell' },
  { value: 'roar', label: '獅吼一聲', group: '彩蛋', icon: 'heart', keywords: ['roar', 'lion'] },
  { value: 'locked', label: '刪除整個獅群（已停用）', group: '彩蛋', icon: 'warning', disabled: true },
]

function run(item: MlCommandItem) {
  toast({ title: '執行指令', message: item.label })
}
</script>

<template>
  <MlCommandPalette v-model:open="open" :items="items" @select="run">
    <template #trigger="{ keys }">
      <button type="button" class="search" @click="open = true">
        <MlIcon name="search" />
        <span>搜尋指令…</span>
        <span class="keys"><MlKbd v-for="k in keys" :key="k">{{ k }}</MlKbd></span>
      </button>
    </template>
  </MlCommandPalette>
</template>

<style scoped>
.search {
  display: flex;
  align-items: center;
  gap: 10px;
  width: min(100%, 340px);
  padding: 10px 12px;
  border: 0;
  background: var(--ml-surface-inset);
  box-shadow: inset 0 0 0 1px var(--ml-line-steel-strong);
  color: var(--ml-text-dim);
  font: inherit;
  font-size: var(--ml-text-sm);
  cursor: pointer;
}

.search:hover {
  box-shadow: inset 0 0 0 1px var(--ml-line-strong);
}

.search svg {
  width: 16px;
  height: 16px;
}

.keys {
  display: flex;
  gap: 4px;
  margin-left: auto;
}
</style>
