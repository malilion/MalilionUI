<script setup lang="ts">
import { ref } from 'vue'

const lines = ['ACCESS GRANTED', 'WELCOME BACK, ALPHA', '碼力獅系統已上線']
const i = ref(0)
</script>

<template>
  <div class="stack">
    <h3 class="title"><MlDecryptText :text="lines[i]" trigger="mount" :duration="1100" /></h3>
    <p class="hint">滑過這行會重新解碼 → <MlDecryptText text="HOVER TO DECRYPT" trigger="hover" tag="strong" /></p>
    <MlButton size="sm" variant="tech" @click="i = (i + 1) % lines.length">下一則訊息</MlButton>
  </div>
</template>

<style scoped>
.stack {
  display: grid;
  gap: 14px;
  justify-items: start;
}

.title {
  margin: 0;
  color: var(--ml-text);
  font-family: var(--ml-font-mono);
  font-size: var(--ml-text-xl);
  letter-spacing: 0.08em;
}

.hint {
  margin: 0;
  color: var(--ml-text-muted);
  font-family: var(--ml-font-mono);
  font-size: var(--ml-text-sm);
}
</style>
