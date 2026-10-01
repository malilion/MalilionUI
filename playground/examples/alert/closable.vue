<script setup lang="ts">
import { ref } from 'vue'

const key = ref(0)
</script>

<template>
  <div class="stack">
    <MlAlert :key="key" tone="success" title="可以關掉我" closable>按右上角的 × 關閉。</MlAlert>
    <MlButton size="sm" variant="ghost" @click="key++">重新顯示</MlButton>
  </div>
</template>

<style scoped>
.stack {
  display: grid;
  gap: 12px;
  justify-items: start;
}

.stack > :first-child {
  justify-self: stretch;
}
</style>
