<script setup lang="ts">
import { ref } from 'vue'
import type { MlGlobePoint } from '@malilion/ui'

const places: (MlGlobePoint & { label: string })[] = [
  { label: '臺灣', lat: 23.7, lng: 121 },
  { label: '冰島', lat: 64.9, lng: -18.6 },
  { label: '巴西', lat: -10, lng: -52 },
  { label: '肯亞', lat: 0.2, lng: 37.9 },
  { label: '紐西蘭', lat: -41, lng: 174 },
]
const active = ref(0)
</script>

<template>
  <div class="globe-fly">
    <div class="controls">
      <MlButton v-for="(p, i) in places" :key="p.label" size="sm" :variant="active === i ? 'primary' : 'outline'" @click="active = i">{{ p.label }}</MlButton>
    </div>
    <MlGlobe :center="places[active]" :markers="[places[active]]" :auto-rotate="false" :size="300" tone="tech" labels />
  </div>
</template>

<style scoped>
.globe-fly { display: grid; justify-items: center; gap: 14px; width: 100%; }
.controls { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; }
</style>
