<script setup lang="ts">
// 1,000 readings: the viewer only renders 100 at a time.
const readings = Array.from({ length: 1000 }, (_, i) => ({ t: i, temp: Math.round(Math.sin(i / 20) * 80 + 300) / 10 }))

// Circular references are caught instead of looping forever.
const pride: Record<string, unknown> = { name: 'Pride Rock', cubs: ['Kiara', 'Kion'] }
pride.self = pride

const data = { sensor: 'mane-01', readings, pride }
</script>

<template>
  <MlJsonViewer :data="data" :expand-depth="2" :chunk-size="100" path-style="dot" filter :max-height="360" class="full" />
</template>

<style scoped>
.full {
  width: 100%;
}
</style>
