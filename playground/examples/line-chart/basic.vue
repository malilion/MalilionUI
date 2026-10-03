<script setup lang="ts">
const labels = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月']
const series = [
  { name: '活躍用戶', data: [820, 932, 901, 1134, 1290, 1330, 1320, 1490, 1610, 1580, 1720, 1890] },
]
</script>

<template>
  <MlLineChart :series="series" :labels="labels" :format="(v) => `${(v / 1000).toFixed(1)}k`" />
</template>
