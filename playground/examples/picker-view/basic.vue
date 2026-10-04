<script setup lang="ts">
import { ref } from 'vue'
import type { MlPickerOption, MlPickerValue } from '@malilion/ui'

const drinks: MlPickerOption[] = [
  { label: '珍珠奶茶', value: 'boba' },
  { label: '四季春', value: 'four-seasons' },
  { label: '冬瓜檸檬', value: 'winter-melon' },
  { label: '芋頭鮮奶', value: 'taro', disabled: true },
  { label: '多多綠', value: 'yakult' },
  { label: '紅茶拿鐵', value: 'black-latte' },
  { label: '仙草凍飲', value: 'grass-jelly' },
]
const sugar: MlPickerOption[] = ['無糖', '一分糖', '微糖', '半糖', '少糖', '全糖'].map((label, i) => ({ label, value: i * 2 }))

const value = ref<MlPickerValue[]>(['four-seasons', 4])
const last = ref('')

function onChange(_: MlPickerValue[], selected: MlPickerOption[], column: number) {
  last.value = `第 ${column + 1} 欄停在「${selected[column].label}」`
}
</script>

<template>
  <div class="demo">
    <MlPickerView v-model="value" :columns="[drinks, sugar]" :labels="['飲料', '甜度']" label="點飲料" @change="onChange" />
    <pre class="value">{{ value }}　{{ last }}</pre>
  </div>
</template>

<style scoped>
.demo {
  display: grid;
  gap: 12px;
  width: 340px;
  max-width: 100%;
}

.value {
  margin: 0;
  color: var(--ml-text-muted);
  font-family: var(--ml-font-mono);
  font-size: var(--ml-text-xs);
  white-space: pre-wrap;
}
</style>
