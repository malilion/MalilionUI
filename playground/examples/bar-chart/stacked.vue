<script setup lang="ts">
import type { MlBarSeries } from '@malilion/ui'

const labels = ['週一', '週二', '週三', '週四', '週五', '週六', '週日']
const series: MlBarSeries[] = [
  { name: '網站', data: [120, 132, 101, 134, 190, 230, 210], tone: 'gold' },
  { name: 'App', data: [80, 92, 71, 104, 140, 180, 160], tone: 'tech' },
  { name: '門市', data: [30, 28, 35, 40, 62, 95, 88], tone: 'bean' },
]
</script>

<template>
  <MlBarChart :series="series" :labels="labels" mode="stacked" show-total :height="220" />
</template>
