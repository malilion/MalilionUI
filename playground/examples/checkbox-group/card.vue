<script setup lang="ts">
import { ref } from 'vue'

const perks = ref<(string | number)[]>(['cdn'])
const options = [
  { value: 'cdn', label: '全球 CDN', hint: '靜態資源就近派送' },
  { value: 'backup', label: '每日備份', hint: '保留 30 天' },
  { value: 'waf', label: '網站防火牆', hint: '擋下常見攻擊' },
  { value: 'support', label: '專人支援', hint: '工作日 4 小時內回覆' },
]
</script>

<template>
  <MlCheckboxGroup v-model="perks" label="加購項目" variant="card" :max="2" hint="最多選 2 項" :options="options" paw />
</template>
