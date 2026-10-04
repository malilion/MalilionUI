<script setup lang="ts">
import { ref } from 'vue'
import type { MlDateRange } from '@malilion/ui'

const months = ref<MlDateRange>([new Date(2026, 0, 1), new Date(2026, 5, 1)])
const years = ref<MlDateRange>([null, null])
</script>

<template>
  <div class="form">
    <MlDateRangePicker v-model="months" type="month" index="01" label="統計月份" clearable />
    <MlDateRangePicker v-model="years" type="year" index="02" label="年度區間" clearable />
  </div>
</template>

<style scoped>
.form {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
  min-height: 380px;
  align-content: start;
}
</style>
