<script setup lang="ts">
import { toast } from '@malilion/ui'
</script>

<template>
  <MlPopconfirm
    title="刪除這個專案？"
    description="所有部署紀錄都會一起刪除，無法復原。"
    tone="danger"
    confirm-text="刪除"
    @confirm="toast({ tone: 'danger', title: '專案已刪除' })"
  >
    <MlButton variant="danger">刪除專案</MlButton>
  </MlPopconfirm>

  <MlPopconfirm title="要重新部署嗎？" placement="bottom" @confirm="toast({ title: '開始部署' })">
    <MlButton variant="outline">重新部署</MlButton>
  </MlPopconfirm>
</template>
