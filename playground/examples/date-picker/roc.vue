<script setup lang="ts">
import { computed, ref } from 'vue'
import { formatRocDate, parseRocDate } from '@malilion/ui'

const birthday = ref<Date | null>(new Date(1990, 4, 20))
const month = ref<Date | null>(new Date())
const range = ref<[Date | null, Date | null]>([null, null])
const typed = ref('115/10/04')
const parsed = computed(() => parseRocDate(typed.value))
</script>

<template>
  <div class="form">
    <MlDatePicker v-model="birthday" label="出生日期" calendar="roc" clearable />
    <MlDatePicker v-model="month" label="申報月份" type="month" calendar="roc" />
    <MlDateRangePicker v-model="range" label="請假期間" calendar="roc" />
    <div class="parse">
      <MlInput v-model="typed" label="輸入民國日期" hint="115/10/04、1151004、民國115年10月4日都可以" />
      <MlText size="sm" :tone="parsed ? 'success' : 'danger'">
        {{ parsed ? `西元 ${parsed.toLocaleDateString('zh-TW')} · 七碼 ${formatRocDate(parsed, '')}` : '看不懂這個日期' }}
      </MlText>
    </div>
  </div>
</template>

<style scoped>
.form {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 20px;
  max-width: 620px;
  min-height: 440px;
  align-content: start;
}

.parse {
  display: grid;
  gap: 6px;
}
</style>
