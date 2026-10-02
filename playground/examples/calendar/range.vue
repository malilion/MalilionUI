<script setup lang="ts">
import { ref } from 'vue'
import type { MlDateRange } from '@malilion/ui'

const range = ref<MlDateRange>([null, null])
const today = new Date()
const fmt = (d: Date | null) => d?.toLocaleDateString('zh-TW') ?? '…'
</script>

<template>
  <MlCalendar
    v-model:range="range"
    mode="range"
    :week-starts-on="1"
    :min="today"
    :disabled-date="(d) => d.getDay() === 0"
  />
  <p class="ml-hud-label">{{ fmt(range[0]) }} → {{ fmt(range[1]) }}</p>
</template>
