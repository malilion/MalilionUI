<script setup lang="ts">
import { ref } from 'vue'
import { useToast, type MlSwipeAction } from '@malilion/ui'

const toast = useToast()

const mails = ref([
  { id: 1, from: 'Malilion Bot', subject: '你的設計稿通過審核了', time: '10:24', unread: true },
  { id: 2, from: 'Figma Team', subject: '3 則新留言', time: '09:12', unread: true },
  { id: 3, from: '碼力獅', subject: '0.12.0 發佈筆記', time: '昨天', unread: false },
  { id: 4, from: 'GitHub', subject: '[MalilionUI] CI passed', time: '週一', unread: false },
])

const leftActions: MlSwipeAction[] = [{ label: '已讀', value: 'read', icon: 'check', tone: 'accent' }]
const rightActions: MlSwipeAction[] = [
  { label: '標記', value: 'flag', icon: 'bell', tone: 'warning' },
  { label: '封存', value: 'archive', icon: 'folder' },
  { label: '刪除', value: 'delete', icon: 'close', tone: 'danger' },
]

function onAction(id: number, action: MlSwipeAction) {
  const mail = mails.value.find((m) => m.id === id)!
  if (action.value === 'read') mail.unread = !mail.unread
  else if (action.value === 'flag') toast(`已標記「${mail.subject}」`)
  else {
    mails.value = mails.value.filter((m) => m.id !== id)
    toast(action.value === 'delete' ? '已刪除' : '已封存')
  }
}
</script>

<template>
  <div class="screen">
    <MlList title="收件匣">
      <MlSwipeCell
        v-for="mail in mails"
        :key="mail.id"
        :title="mail.from"
        :subtitle="mail.subject"
        :meta="mail.time"
        :badge="mail.unread ? '新' : undefined"
        :left-actions="leftActions"
        :right-actions="rightActions"
        full-swipe
        clickable
        @select="toast(`打開：${mail.subject}`)"
        @action="(action) => onAction(mail.id, action)"
      >
        <template #leading><MlAvatar :name="mail.from" :lion="mail.from === '碼力獅'" size="sm" /></template>
      </MlSwipeCell>
    </MlList>
    <MlEmpty v-if="!mails.length" art="paws" title="收件匣清空了" />
    <p class="ml-hud-label hint">左滑看動作、右滑標已讀，用力一路滑到底直接刪除。鍵盤：Shift+F10 或「更多動作」按鈕。</p>
  </div>
</template>

<style scoped>
.screen {
  display: grid;
  gap: 12px;
  width: 360px;
  max-width: 100%;
  padding: 16px 0;
  border-radius: 16px;
  background: var(--ml-bg);
  box-shadow: inset 0 0 0 1px var(--ml-line);
}

.hint {
  margin: 0;
  padding: 0 16px;
}
</style>
