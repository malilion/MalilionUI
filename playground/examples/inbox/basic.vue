<script setup lang="ts">
import { ref } from 'vue'
import { lionAvatarUrl, useToast, type MlInboxItem } from '@malilion/ui'

const toast = useToast()
const min = 60_000
const ago = (minutes: number) => Date.now() - minutes * min

const items = ref<MlInboxItem[]>([
  { id: 1, type: 'mention', title: '阿哲在「0.13 規劃」提到你', body: '@你 貼圖選擇器的鍵盤操作可以再幫忙看一下嗎？', time: ago(4), avatar: lionAvatarUrl },
  { id: 2, type: 'success', title: '部署完成', body: 'malilion-ui-docs 已發佈到正式環境（v0.13.0）', time: ago(26) },
  { id: 3, type: 'warning', title: '試用期剩 3 天', body: '升級專業版即可保留所有專案。', time: ago(95), read: true },
  { id: 4, type: 'danger', title: 'CI 失敗：tests/react', body: 'interaction-inbox.test.tsx 有 1 個測試未通過', time: ago(60 * 20) },
  { id: 5, type: 'info', title: '每週摘要', body: '本週新增 4 個元件、修了 12 個問題。', time: ago(60 * 30), read: true },
  { id: 6, type: 'mention', title: 'Yuki 回覆了你的留言', body: '「深色主題真的很好看！」', time: ago(60 * 24 * 4), read: true },
])
</script>

<template>
  <div class="bar">
    <span class="brand">碼力獅後台</span>
    <MlInbox v-model:items="items" @select="(item) => toast(`打開：${item.title}`)" />
  </div>
</template>

<style scoped>
.bar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  width: 100%;
  min-height: 540px;
  padding: 10px 14px;
  box-shadow: inset 0 0 0 1px var(--ml-line);
}
.brand { font-family: var(--ml-font-display); font-weight: 700; line-height: 40px; }
</style>
