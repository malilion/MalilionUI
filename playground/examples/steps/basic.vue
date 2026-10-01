<script setup lang="ts">
import { ref } from 'vue'

const current = ref(2)
const steps = [
  { title: 'Setup', desc: '建立專案' },
  { title: 'Configure', desc: '設定主題' },
  { title: 'Review', desc: '檢查元件' },
  { title: 'Complete', desc: '上線！' },
]
</script>

<template>
  <div class="stack">
    <MlSteps :items="steps" :current="current" />
    <div class="row">
      <MlButton size="sm" variant="ghost" :disabled="current === 0" @click="current--">上一步</MlButton>
      <MlButton size="sm" stamp :disabled="current === steps.length" @click="current++">下一步</MlButton>
    </div>
  </div>
</template>

<style scoped>
.stack {
  display: grid;
  gap: 24px;
}

.row {
  display: flex;
  justify-content: center;
  gap: 12px;
}
</style>
