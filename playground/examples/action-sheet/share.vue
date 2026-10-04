<script setup lang="ts">
import { ref } from 'vue'
import { useToast, type MlActionSheetAction } from '@malilion/ui'

const toast = useToast()
const open = ref(false)
const actions: MlActionSheetAction[] = [
  { label: '傳訊息給獅群', value: 'message', icon: 'message' },
  { label: '複製連結', value: 'copy', icon: 'file', description: 'malilion.dev/pride/42' },
  { label: '加到最愛', value: 'fav', icon: 'heart', tone: 'accent' },
  { label: '匯出 PDF', value: 'pdf', icon: 'upload', disabled: true, description: '升級 Pro 才能使用' },
]
</script>

<template>
  <MlButton @click="open = true">分享</MlButton>
  <MlActionSheet
    v-model:open="open"
    title="分享這個獅群"
    :actions="actions"
    @select="(action) => toast(`選了「${action.label}」`)"
    @cancel="toast('已取消')"
  />
</template>
