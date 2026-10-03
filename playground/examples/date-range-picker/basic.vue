<script setup lang="ts">
import { ref } from 'vue'
import type { MlDateRange } from '@malilion/ui'

const range = ref<MlDateRange>([null, null])
const trip = ref<MlDateRange>([new Date(2026, 9, 10), new Date(2026, 9, 14)])
const today = new Date()
</script>

<template>
  <div class="form">
    <MlDateRangePicker v-model="range" index="01" label="報表區間" clearable />
    <MlDateRangePicker
      v-model="trip"
      index="02"
      label="出差日期"
      :min="today"
      :presets="[]"
      hint="沒有快速選項，只能選今天以後"
    />
  </div>
</template>

<style scoped>
.form {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
  min-height: 460px;
  align-content: start;
}
</style>
