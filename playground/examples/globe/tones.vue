<script setup lang="ts">
import type { MlGlobeMarker } from '@malilion/ui'

const pins: MlGlobeMarker[] = [
  { lat: 25.03, lng: 121.56, label: 'Taipei' },
  { lat: 40.71, lng: -74.01, label: 'New York' },
  { lat: 48.86, lng: 2.35, label: 'Paris' },
]
</script>

<template>
  <MlGlobe tone="tech" :size="220" :markers="pins" labels :speed="14" />
  <MlGlobe tone="bean" :size="220" :speed="-10" :graticule="false" :center="{ lat: 20, lng: 0 }" />
  <MlGlobe tone="success" :size="220" :auto-rotate="false" :atmosphere="false" :center="{ lat: -15, lng: -60 }" />
</template>
