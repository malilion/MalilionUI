<script setup lang="ts">
import { confirm, toast } from '@malilion/ui'

async function deploy() {
  const ok = await confirm({ title: '部署到正式站？', message: '即將把 main 分支推上 production。' })
  toast(ok ? '部署開始 🚀' : '已取消')
}

async function remove() {
  const ok = await confirm.danger({
    title: '刪除整個獅群？',
    message: '這個動作無法復原，所有成員與紀錄都會被永久刪除。',
    confirmText: '我確定，刪除',
  })
  if (ok) toast.danger('獅群已刪除')
}

async function rename() {
  const name = await confirm.prompt({
    title: '重新命名',
    prompt: { label: '獅群名稱', defaultValue: '碼力獅一號', placeholder: '輸入新名稱' },
  })
  if (name) toast.success(`改名為「${name}」`)
}

function info() {
  confirm.alert({ title: '已儲存', message: '你的設定已經同步到所有裝置。' })
}
</script>

<template>
  <MlButton @click="deploy">confirm()</MlButton>
  <MlButton variant="danger" @click="remove">confirm.danger()</MlButton>
  <MlButton variant="steel" @click="rename">confirm.prompt()</MlButton>
  <MlButton variant="outline" @click="info">confirm.alert()</MlButton>
</template>
