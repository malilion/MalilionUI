<script setup lang="ts">
import { ref } from 'vue'

const open = ref(false)
const notify = ref(true)
const theme = ref('dark')
</script>

<template>
  <MlButton @click="open = true">開啟設定</MlButton>

  <MlDrawer v-model:open="open" eyebrow="Console · Settings" title="偏好設定">
    <div class="stack">
      <MlSwitch v-model="notify">桌面通知</MlSwitch>
      <MlRadioGroup
        v-model="theme"
        label="主題"
        :options="[
          { value: 'dark', label: 'Night Pride' },
          { value: 'light', label: 'Daylight Titanium' },
        ]"
      />
    </div>
    <template #footer="{ close }">
      <MlButton variant="ghost" @click="close">取消</MlButton>
      <MlButton @click="close">儲存</MlButton>
    </template>
  </MlDrawer>
</template>

<style scoped>
.stack {
  display: grid;
  gap: 20px;
}
</style>
