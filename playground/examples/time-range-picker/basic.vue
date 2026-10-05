<script setup lang="ts">
import { ref } from 'vue'
import type { MlTimeRange, MlTimeRangePreset } from '@malilion/ui'

const hours = ref<MlTimeRange>(['09:00', '18:00'])
const lunch = ref<MlTimeRange>([null, null])
const presets: MlTimeRangePreset[] = [
  { label: '全天', value: ['09:00', '18:00'] },
  { label: '上午', value: ['09:00', '12:00'] },
  { label: '下午', value: ['13:30', '18:00'] },
]
</script>

<template>
  <div class="form">
    <MlTimeRangePicker v-model="hours" index="01" label="營業時間" :minute-step="30" :presets="presets" clearable />
    <MlTimeRangePicker v-model="lunch" index="02" label="午休" :minute-step="15" min="11:00" max="14:30" hint="只能選 11:00 – 14:30" />
    <p class="ml-hud-label">hours = {{ hours.join(' – ') }} · lunch = {{ lunch.join(' – ') }}</p>
  </div>
</template>

<style scoped>
.form {
  display: grid;
  gap: 18px;
  max-width: 380px;
  min-height: 420px;
  align-content: start;
}
</style>
