<script setup lang="ts">
import { ref } from 'vue'

const score = ref(3)
const half = ref(3.5)
const mood = ref(4)
</script>

<template>
  <div class="stack">
    <MlRate v-model="score" show-value label="整體評分" />
    <MlRate v-model="half" allow-half tone="bean" size="lg" show-value label="可愛程度" />
    <MlRate v-model="mood" :texts="['很差', '普通', '不錯', '很好', '獅吼級']" tone="tech" clearable label="心情" />
    <MlRate :model-value="4.5" readonly allow-half size="sm" label="平均評分" />
  </div>
</template>

<style scoped>
.stack {
  display: grid;
  gap: 14px;
}
</style>
