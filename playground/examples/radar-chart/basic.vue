<script setup lang="ts">
const indicators = [
  { label: '前端', max: 100 },
  { label: '後端', max: 100 },
  { label: '設計', max: 100 },
  { label: '測試', max: 100 },
  { label: '溝通', max: 100 },
  { label: '睡覺', max: 100 },
]
const series = [
  { name: '碼力獅', values: [95, 72, 88, 80, 76, 60], tone: 'gold' as const },
  { name: 'Nala', values: [70, 92, 55, 85, 90, 75], tone: 'tech' as const },
]
</script>

<template>
  <div class="row">
    <MlRadarChart :indicators="indicators" :series="series" />
    <MlRadarChart :indicators="indicators" :series="[series[0]]" :polygon="false" :size="220" />
  </div>
</template>

<style scoped>
.row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 32px;
}
</style>
