<script setup lang="ts">
const today = new Date()
const data = Array.from({ length: 120 }, (_, i) => ({
  date: new Date(today.getFullYear(), today.getMonth(), today.getDate() - i),
  count: Math.round(Math.abs(Math.sin(i * 0.7)) * 6),
}))
</script>

<template>
  <div class="grid">
    <MlHeatmap :data="data" :weeks="18" tone="tech" :week-starts-on="1" />
    <MlHeatmap :data="data" :weeks="18" tone="bean" cell="paw" />
  </div>
</template>

<style scoped>
.grid {
  display: flex;
  flex-wrap: wrap;
  gap: 28px;
}
</style>
