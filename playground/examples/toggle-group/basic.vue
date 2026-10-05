<script setup lang="ts">
import { ref } from 'vue'
import type { MlToggleGroupValue } from '@malilion/ui'

const marks = ref<MlToggleGroupValue>(['bold'])
const align = ref<MlToggleGroupValue>('left')
</script>

<template>
  <div class="stack">
    <MlToggleGroup
      v-model="marks"
      multiple
      label="文字樣式"
      :options="[
        { value: 'bold', label: '粗體' },
        { value: 'italic', label: '斜體' },
        { value: 'underline', label: '底線' },
        { value: 'code', label: '程式碼', disabled: true },
      ]"
    />
    <MlToggleGroup
      v-model="align"
      size="sm"
      label="對齊"
      :options="[
        { value: 'left', label: '靠左' },
        { value: 'center', label: '置中' },
        { value: 'right', label: '靠右' },
      ]"
    />
    <p class="ml-hud-label">marks = {{ JSON.stringify(marks) }} · align = {{ JSON.stringify(align) }}</p>
  </div>
</template>

<style scoped>
.stack {
  display: grid;
  gap: 16px;
  justify-items: start;
}
</style>
