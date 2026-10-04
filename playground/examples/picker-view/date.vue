<script setup lang="ts">
import { computed, ref } from 'vue'
import { datePickerColumns, pickerValueToDate, timePickerColumns, type MlPickerValue } from '@malilion/ui'

// Build the column functions once; the day column follows the year and month.
const dateColumns = datePickerColumns({
  min: new Date(2020, 1, 15),
  max: new Date(2030, 11, 31),
  format: { year: (y) => `${y} 年`, month: (m) => `${m} 月`, day: (d) => `${d} 日` },
})
const timeColumns = timePickerColumns({ minuteStep: 5 })

const date = ref<MlPickerValue[]>([2024, 2, 29])
const time = ref<MlPickerValue[]>([9, 30])

const weekday = computed(() => pickerValueToDate(date.value).toLocaleDateString('zh-TW', { weekday: 'long' }))
const pad = (n: MlPickerValue) => String(n).padStart(2, '0')
</script>

<template>
  <div class="demo">
    <section>
      <h4>年 / 月 / 日</h4>
      <MlPickerView v-model="date" :columns="dateColumns" :labels="['年', '月', '日']" :visible-count="7" :item-height="36" />
      <p>{{ date[0] }}-{{ pad(date[1]) }}-{{ pad(date[2]) }}（{{ weekday }}）</p>
    </section>
    <section>
      <h4>時 / 分（每 5 分）</h4>
      <MlPickerView v-model="time" :columns="timeColumns" :labels="['時', '分']" :visible-count="7" :item-height="36" />
      <p>{{ pad(time[0]) }}:{{ pad(time[1]) }}</p>
    </section>
  </div>
</template>

<style scoped>
.demo {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 24px;
  width: 100%;
  max-width: 620px;
}

h4 {
  margin: 0 0 6px;
  color: var(--ml-text-muted);
  font-size: var(--ml-text-xs);
  letter-spacing: var(--ml-tracking-hud);
}

p {
  margin: 8px 0 0;
  color: var(--ml-accent-text);
  font-family: var(--ml-font-mono);
  font-size: var(--ml-text-sm);
  text-align: center;
}
</style>
