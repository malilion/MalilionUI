<script setup lang="ts">
import { ref } from 'vue'

const month = ref<Date | null>(new Date(2026, 9, 1))
const quarter = ref<Date | null>(null)
const year = ref<Date | null>(new Date(2026, 0, 1))
// 只開放到今年年底
const max = new Date(new Date().getFullYear(), 11, 31)
</script>

<template>
  <div class="form">
    <MlDatePicker v-model="month" type="month" index="01" label="帳單月份" clearable />
    <MlDatePicker v-model="quarter" type="quarter" index="02" label="財報季度" :max="max" hint="未來的季度不能選" />
    <MlDatePicker v-model="year" type="year" index="03" label="年度" />
  </div>
  <p class="value">
    v-model：{{ month?.toLocaleDateString('sv') ?? '—' }} / {{ quarter?.toLocaleDateString('sv') ?? '—' }} /
    {{ year?.toLocaleDateString('sv') ?? '—' }}
  </p>
</template>

<style scoped>
.form {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  max-width: 720px;
  min-height: 360px;
  align-content: start;
}
.value {
  margin: 12px 0 0;
  color: var(--ml-text-dim);
  font-family: var(--ml-font-mono);
  font-size: var(--ml-text-sm);
}
</style>
