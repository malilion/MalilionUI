<script setup lang="ts">
import { ref } from 'vue'
import type { MlGlobeArc, MlGlobeMarker } from '@malilion/ui'

const taipei = { lat: 25.03, lng: 121.56 }
const markers: MlGlobeMarker[] = [
  { ...taipei, label: '臺北', size: 4 },
  { lat: 35.68, lng: 139.69, label: '東京', tone: 'tech' },
  { lat: 37.77, lng: -122.42, label: '舊金山', tone: 'tech' },
  { lat: 51.51, lng: -0.13, label: '倫敦', tone: 'bean' },
  { lat: -33.87, lng: 151.21, label: '雪梨', tone: 'success' },
  { lat: 1.35, lng: 103.82, label: '新加坡', tone: 'bean' },
]
const arcs: MlGlobeArc[] = markers.slice(1).map((m) => ({ from: taipei, to: m, tone: m.tone }))
const picked = ref('')
</script>

<template>
  <div class="globe-demo">
    <MlGlobe :markers="markers" :arcs="arcs" @select="(m) => (picked = m.label ?? '')" />
    <p class="hint">{{ picked ? `飛往：${picked}` : '拖曳旋轉、點標記飛過去；聚焦後可用方向鍵。' }}</p>
  </div>
</template>

<style scoped>
.globe-demo { display: grid; justify-items: center; gap: 8px; width: 100%; }
.hint { margin: 0; color: var(--ml-text-muted); font-size: 13px; }
</style>
