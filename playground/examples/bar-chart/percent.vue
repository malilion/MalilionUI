<script setup lang="ts">
import type { MlBarSeries } from '@malilion/ui'

const labels = ['北部', '中部', '南部', '東部']
const series: MlBarSeries[] = [
  { name: '新客', data: [420, 310, 280, 60] },
  { name: '回訪', data: [880, 540, 610, 90] },
  { name: '會員', data: [300, 150, 210, 40] },
]
</script>

<template>
  <MlBarChart
    :series="series"
    :labels="labels"
    mode="percent"
    show-total
    :format="(v) => v.toLocaleString()"
    label="各區客群占比：北部回訪客最多"
  />
</template>
