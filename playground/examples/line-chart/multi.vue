<script setup lang="ts">
import type { MlLineSeries } from '@malilion/ui'

const labels = ['週一', '週二', '週三', '週四', '週五', '週六', '週日']
const series: MlLineSeries[] = [
  { name: 'API 請求', data: [120, 132, 101, 134, 190, 230, 210], tone: 'gold' },
  { name: '快取命中', data: [80, 92, 71, 104, 140, 180, 160], tone: 'tech' },
  { name: '錯誤', data: [6, 9, 4, 12, 7, 3, 5], tone: 'bean' },
]
</script>

<template>
  <MlLineChart :series="series" :labels="labels" :area="false" dots :height="240" />
</template>
