<script setup lang="ts">
import { useToast } from '@malilion/ui'

const toast = useToast()

function archive() {
  toast.success({
    title: '已封存 3 則訊息',
    message: '可以在封存區找到它們。',
    action: { label: '復原', onClick: () => toast('已復原') },
  })
}

function persistent() {
  toast.warning({
    title: '連線不穩定',
    message: '這則通知不會自己消失，按 × 關閉。',
    duration: 0,
  })
}
</script>

<template>
  <MlButton @click="archive">附帶動作</MlButton>
  <MlButton variant="outline" @click="persistent">常駐通知</MlButton>
  <MlButton variant="ghost" @click="toast.clear()">全部清除</MlButton>
</template>
