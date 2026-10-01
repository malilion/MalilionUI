<script setup lang="ts">
import { useToast } from '@malilion/ui'

const toast = useToast()
</script>

<template>
  <MlButton stamp @click="toast('嗷嗚～這是一則腳印通知')">腳印</MlButton>
  <MlButton variant="tech" @click="toast.info('新版本已經可以下載')">資訊</MlButton>
  <MlButton variant="steel" @click="toast.success('部署完成！')">成功</MlButton>
  <MlButton variant="outline" @click="toast.warning('額度剩下 12%')">警告</MlButton>
  <MlButton variant="danger" @click="toast.danger('建置失敗，請檢查 log')">錯誤</MlButton>
</template>
