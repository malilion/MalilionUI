<script setup lang="ts">
import { ref } from 'vue'
import type { MlToggleGroupValue } from '@malilion/ui'

const view = ref<MlToggleGroupValue>('grid')
const panels = ref<MlToggleGroupValue>(['files'])
</script>

<template>
  <div class="row">
    <MlToggleGroup
      v-model="view"
      :allow-empty="false"
      label="檢視方式"
      :options="[
        { value: 'grid', icon: 'grid', title: '格狀' },
        { value: 'list', icon: 'menu', title: '列表' },
        { value: 'calendar', icon: 'calendar', title: '月曆' },
      ]"
    />
    <MlToggleGroup
      v-model="panels"
      multiple
      vertical
      label="側邊面板"
      :options="[
        { value: 'files', label: '檔案', icon: 'folder' },
        { value: 'search', label: '搜尋', icon: 'search' },
        { value: 'settings', label: '設定', icon: 'settings' },
      ]"
    />
  </div>
</template>

<style scoped>
.row {
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
  align-items: flex-start;
}
</style>
