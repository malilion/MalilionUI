<script setup lang="ts">
import type { MlLunarHolidays } from '@malilion/ui'

// 2024–2027 的補假、調整放假與補行上班已內建（行政院人事行政總處「政府行政機關辦公日曆表」，
// 政府資料開放平臺 https://data.gov.tw/dataset/14718），official 預設開啟。
// 公司自己的假日、或之後年份公布的補假，用 holidays 加上去即可；
// 補行上班的週六寫成 { name: '補行上班', off: false }。
const company: MlLunarHolidays = {
  '2026-02-23': '春酒補休',
  '2026-04-07': { name: '員工旅遊', off: true },
}
</script>

<template>
  <div class="demo">
    <figure>
      <MlLunarCalendar :holidays="company" :today="new Date(2026, 1, 17)" />
      <figcaption>預設：內建官方補假（2/20、2/27）＋公司假日</figcaption>
    </figure>
    <figure>
      <MlLunarCalendar :official="false" :today="new Date(2026, 3, 1)" :week-starts-on="1" :observances="false" />
      <figcaption>official=false：只有法定假日，不含補假（4/3、4/6）</figcaption>
    </figure>
  </div>
</template>

<style scoped>
.demo { display: flex; flex-wrap: wrap; gap: 20px; }
figure { display: grid; gap: 8px; margin: 0; }
figcaption { color: var(--ml-text-muted); font-size: 13px; }
</style>
