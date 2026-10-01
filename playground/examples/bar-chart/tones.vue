<script setup lang="ts">
const week = [
  { label: 'Mon', value: 12 },
  { label: 'Tue', value: 19 },
  { label: 'Wed', value: 15 },
  { label: 'Thu', value: 24 },
  { label: 'Fri', value: 18 },
]
</script>

<template>
  <div class="grid">
    <MlBarChart :data="week" tone="tech" :height="140" />
    <MlBarChart :data="week" tone="bean" :height="140" :highlight="1" />
  </div>
</template>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 28px;
}
</style>
