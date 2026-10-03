<script setup lang="ts">
import { ref } from 'vue'
import { toast } from '@malilion/ui'

// A year of fake commits: busier on weekdays, with a few sprints.
const today = new Date()
const data = Array.from({ length: 371 }, (_, i) => {
  const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i)
  const weekday = date.getDay() % 6 !== 0
  const sprint = Math.sin(i / 23) > 0.6 ? 6 : 0
  const seed = Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1
  const count = seed < (weekday ? 0.22 : 0.65) ? 0 : Math.round(seed * (weekday ? 9 : 3) + sprint)
  return { date, count }
})
const cell = ref<'square' | 'paw'>('square')
</script>

<template>
  <div class="wrap">
    <MlSegmented v-model="cell" :options="[{ value: 'square', label: '方格' }, { value: 'paw', label: '腳印' }]" />
    <MlHeatmap :data="data" :cell="cell" @select="(d, n) => toast(`${d.toLocaleDateString()}：${n} 次`)" />
  </div>
</template>

<style scoped>
.wrap {
  display: grid;
  gap: 14px;
  width: 100%;
}
</style>
