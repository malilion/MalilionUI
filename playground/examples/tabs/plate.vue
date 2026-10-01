<script setup lang="ts">
import { ref } from 'vue'

const range = ref('week')
const ranges = [
  { value: 'day', label: '日' },
  { value: 'week', label: '週' },
  { value: 'month', label: '月' },
  { value: 'year', label: '年' },
]
</script>

<template>
  <MlTabs v-model="range" :items="ranges" variant="plate" label="時間範圍" />
  <span class="ml-hud-label">範圍：{{ range }}</span>
</template>
