<script setup lang="ts">
import type { MlAuroraPalette } from '@malilion/ui'

const palettes: { palette: MlAuroraPalette | string[]; name: string }[] = [
  { palette: 'pride', name: 'pride · 金銅' },
  { palette: 'circuit', name: 'circuit · 青綠' },
  { palette: 'bean', name: 'bean · 肉球粉' },
  { palette: 'night', name: 'night · 深藍紫' },
  { palette: ['#ff5c48', '#f0ad2f', '#3eeed0'], name: '自訂顏色陣列' },
]
</script>

<template>
  <div class="grid">
    <MlAurora v-for="p in palettes" :key="p.name" :palette="p.palette" class="tile">
      <span class="name">{{ p.name }}</span>
    </MlAurora>
  </div>
</template>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 14px;
  width: 100%;
}
.tile {
  display: grid;
  align-items: end;
  min-height: 140px;
  padding: 14px;
  border-radius: var(--ml-radius);
}
.name {
  font-family: var(--ml-font-mono);
  font-size: 12px;
}
</style>
