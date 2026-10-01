<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'

const value = ref(30)
let timer: ReturnType<typeof setInterval> | undefined

function run() {
  clearInterval(timer)
  value.value = 0
  timer = setInterval(() => {
    value.value = Math.min(100, value.value + Math.ceil(Math.random() * 8))
    if (value.value >= 100) clearInterval(timer)
  }, 180)
}

onBeforeUnmount(() => clearInterval(timer))
</script>

<template>
  <div class="stack">
    <MlProgress :value="value" label="小獅子回家中" size="lg" paw />
    <MlProgress :value="value" label="Tech" tone="tech" paw smooth />
    <MlButton size="sm" variant="outline" stamp @click="run">出發！</MlButton>
  </div>
</template>

<style scoped>
.stack {
  display: grid;
  gap: 22px;
  justify-items: start;
}

.stack > :not(button) {
  justify-self: stretch;
}
</style>
