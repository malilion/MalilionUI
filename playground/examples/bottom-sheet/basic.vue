<script setup lang="ts">
import { ref } from 'vue'

const open = ref(false)
const notify = ref(true)
const sound = ref(false)
</script>

<template>
  <MlButton @click="open = true">開啟面板</MlButton>

  <MlBottomSheet v-model:open="open" title="通知設定" description="往下拖、按 Esc 或點背景都能關閉。">
    <div class="stack">
      <MlSwitch v-model="notify">推播通知</MlSwitch>
      <MlSwitch v-model="sound">提示音效</MlSwitch>
    </div>
    <template #footer="{ close }">
      <MlButton variant="ghost" @click="close">取消</MlButton>
      <MlButton stamp @click="close">儲存</MlButton>
    </template>
  </MlBottomSheet>
</template>

<style scoped>
.stack {
  display: grid;
  gap: 16px;
}
</style>
