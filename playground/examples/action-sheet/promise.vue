<script setup lang="ts">
import { useActionSheet, useToast } from '@malilion/ui'

const actionSheet = useActionSheet()
const toast = useToast()

async function remove() {
  const choice = await actionSheet({
    title: '刪除這張照片？',
    description: '刪除後會從所有裝置移除，無法復原。',
    actions: [
      { label: '刪除照片', value: 'delete', tone: 'danger', icon: 'close' },
      { label: '移到封存', value: 'archive', icon: 'folder' },
    ],
    cancelText: '先不要',
  })
  if (choice === 'delete') toast.danger('照片已刪除')
  else if (choice === 'archive') toast.success('已移到封存')
  else toast('什麼都沒做')
}
</script>

<template>
  <MlButton variant="danger" @click="remove">刪除照片…</MlButton>
</template>
