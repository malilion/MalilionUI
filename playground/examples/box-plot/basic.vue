<script setup lang="ts">
// Response times (ms) of four services; a few slow requests become outliers.
const data = [
  { label: 'API', values: [120, 132, 140, 151, 155, 160, 172, 180, 195, 420] },
  { label: '搜尋', values: [210, 230, 236, 250, 262, 275, 290, 310, 330, 345], tone: 'tech' as const },
  { label: '付款', values: [310, 320, 335, 340, 360, 380, 395, 410, 120, 720], tone: 'bean' as const },
  { label: '圖片', stats: { min: 40, q1: 70, median: 95, q3: 130, max: 190, outliers: [260] }, tone: 'steel' as const },
]
</script>

<template>
  <MlBoxPlot :data="data" :height="240" :format="(v) => `${Math.round(v)} ms`" />
</template>
