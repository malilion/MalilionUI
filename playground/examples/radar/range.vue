<script setup lang="ts">
import type { MlRadarBlip } from '@malilion/ui'

// x / y from -1 to 1 (y points up) instead of angle / distance.
const blips: MlRadarBlip[] = [
  { x: 0.3, y: 0.5, label: 'Alpha' },
  { x: -0.55, y: -0.2, label: 'Bravo' },
  { x: 0.1, y: -0.85, label: 'Charlie' },
]
</script>

<template>
  <MlRadar tone="gold" :blips="blips" :range="100" unit="km" :rings="5" :speed="60" :trail="140" :size="300" label="區域雷達" />
</template>
