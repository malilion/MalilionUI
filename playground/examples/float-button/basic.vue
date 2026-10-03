<script setup lang="ts">
import { toast, type MlFloatAction } from '@malilion/ui'

const actions: MlFloatAction[] = [
  { key: 'msg', label: '傳訊息', icon: 'message' },
  { key: 'upload', label: '上傳檔案', icon: 'upload' },
  { key: 'cal', label: '新增行程', icon: 'calendar' },
]
</script>

<template>
  <div class="stage">
    <p class="ml-hud-label">放在區塊內示範（inline）；實際使用時預設固定在視窗角落</p>
    <div class="row">
      <MlFloatButton inline :actions="actions" @select="(a) => toast(a.label)" />
      <MlFloatButton inline icon="message" label="客服" :badge="3" tone="tech" @click="toast('開啟客服')" />
      <MlFloatButton inline icon="arrowUp" label="回到頂端" tone="steel" />
    </div>
  </div>
</template>

<style scoped>
.stage {
  display: grid;
  gap: 16px;
  width: 100%;
  min-height: 260px;
  align-content: end;
}

.row {
  display: flex;
  align-items: flex-end;
  gap: 28px;
  padding-left: 120px;
}
</style>
