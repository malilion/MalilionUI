<script setup lang="ts">
import { ref } from 'vue'

const open = ref(false)
const deploying = ref(false)

function deploy(close: () => void) {
  deploying.value = true
  setTimeout(() => {
    deploying.value = false
    close()
  }, 1200)
}
</script>

<template>
  <MlButton @click="open = true">開啟對話框</MlButton>

  <MlModal v-model:open="open" eyebrow="Command · Deploy" title="部署到正式站？">
    即將把 <strong>main</strong> 分支的最新版本推上 production。
    <template #footer="{ close }">
      <MlButton variant="ghost" @click="close">取消</MlButton>
      <MlButton :loading="deploying" stamp @click="deploy(close)">確認部署</MlButton>
    </template>
  </MlModal>
</template>
