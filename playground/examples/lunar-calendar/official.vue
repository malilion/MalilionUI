<script setup lang="ts">
import type { MlLunarHolidays } from '@malilion/ui'

// 補假 and 調整放假 are announced each year by 行政院人事行政總處 — feed them in.
// These are the 補假 of its 115 年（2026）「政府行政機關辦公日曆表」
// (政府資料開放平臺 https://data.gov.tw/dataset/14718); a 補行上班 Saturday would be
// `{ name: '補行上班', off: false }`.
const holidays: MlLunarHolidays = {
  '2026-02-20': '補假',
  '2026-02-27': '補假',
  '2026-04-03': '補假',
  '2026-04-06': '補假',
  '2026-10-09': '補假',
  '2026-10-26': '補假',
}
</script>

<template>
  <div class="demo">
    <MlLunarCalendar :holidays="holidays" :today="new Date(2026, 1, 17)" />
    <MlLunarCalendar :holidays="holidays" :today="new Date(2026, 3, 1)" :week-starts-on="1" :observances="false" />
  </div>
</template>

<style scoped>
.demo {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
}
</style>
