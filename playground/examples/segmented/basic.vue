<script setup lang="ts">
import { ref } from 'vue'

const range = ref('week')
const view = ref('grid')
</script>

<template>
  <div class="stack">
    <MlSegmented
      v-model="range"
      label="時間範圍"
      :options="[
        { value: 'day', label: '日' },
        { value: 'week', label: '週' },
        { value: 'month', label: '月' },
        { value: 'year', label: '年', disabled: true },
      ]"
    />
    <MlSegmented
      v-model="view"
      label="檢視方式"
      size="sm"
      :options="[
        { value: 'grid', label: '格狀', icon: 'grid' },
        { value: 'list', label: '列表', icon: 'menu' },
        { value: 'folder', label: '資料夾', icon: 'folder' },
      ]"
    />
    <p class="ml-hud-label">range = {{ range }} · view = {{ view }}</p>
  </div>
</template>

<style scoped>
.stack {
  display: grid;
  gap: 16px;
  justify-items: start;
}
</style>
