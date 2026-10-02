<script setup lang="ts">
const items = [
  { title: '建立 PR #42', time: '09:12', desc: '新增 Combobox 與表單驗證。' },
  { title: 'CI 通過', time: '09:20', tone: 'success' as const, icon: 'success' as const },
  { title: '收到審查意見', time: '10:05', tone: 'tech' as const, icon: 'message' as const, desc: '「Popover 的方向可以再加一個 auto 嗎？」' },
  { title: '合併到 main', time: '11:30', paw: true },
]
</script>

<template>
  <MlTimeline :items="items" pending="部署中…" />
</template>
