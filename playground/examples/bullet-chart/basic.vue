<script setup lang="ts">
const data = [
  { label: '營收', sublabel: '萬元', value: 270, target: 250, ranges: [150, 225, 300] },
  { label: '毛利率', sublabel: '%', value: 22, target: 26, ranges: [20, 25, 30], tone: 'tech' as const },
  { label: '新客數', sublabel: '人', value: 1650, target: 2100, ranges: [1400, 2000, 2500], tone: 'bean' as const },
  { label: '滿意度', sublabel: '1–5', value: 4.6, target: 4.2, ranges: [3.5, 4.25, 5], max: 5, tone: 'success' as const },
]
</script>

<template>
  <MlBulletChart :data="data" :band-labels="['差', '普通', '良好']" />
</template>
