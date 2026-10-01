<script setup lang="ts">
import { ref } from 'vue'

const plan = ref('pride')
const plans = [
  { value: 'cub', label: 'Cub', hint: '個人專案 · 免費' },
  { value: 'pride', label: 'Pride', hint: '小團隊 · NT$ 290 / 月' },
  { value: 'king', label: 'King', hint: '企業 · 聯絡我們' },
]
</script>

<template>
  <MlRadioGroup v-model="plan" label="選擇方案" variant="card" :options="plans" />
</template>
