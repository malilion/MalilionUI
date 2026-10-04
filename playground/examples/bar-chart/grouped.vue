<script setup lang="ts">
import type { MlBarSeries } from '@malilion/ui'

const labels = ['Q1', 'Q2', 'Q3', 'Q4']
const series: MlBarSeries[] = [
  { name: '2024', data: [182, 236, 268, 274], tone: 'steel' },
  { name: '2025', data: [214, 268, 251, 322], tone: 'gold' },
  { name: '增減', data: [32, 32, -17, 48], tone: 'bean' },
]
</script>

<template>
  <MlBarChart :series="series" :labels="labels" :height="220" />
</template>
