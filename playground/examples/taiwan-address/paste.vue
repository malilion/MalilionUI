<script setup lang="ts">
import { ref } from 'vue'
import { emptyTaiwanAddress, parseTwAddress } from '@malilion/ui'

const address = ref(emptyTaiwanAddress())
const sample = '802高雄市苓雅區中山二路12巷3弄45號之1'
const parts = parseTwAddress('臺中市西屯區文華里12鄰台灣大道三段99號B1')
</script>

<template>
  <div class="stack">
    <p class="tip">把這串複製起來，貼到「路／街」欄位：<code>{{ sample }}</code></p>
    <MlTaiwanAddress v-model="address" size="sm" />
    <pre class="json">parseTwAddress('臺中市西屯區文華里12鄰台灣大道三段99號B1')
{{ JSON.stringify(parts, null, 2) }}</pre>
  </div>
</template>

<style scoped>
.stack {
  display: grid;
  gap: 12px;
}
.tip {
  margin: 0;
  font-size: 0.8125rem;
}
.json {
  margin: 0;
  padding: 10px 12px;
  background: var(--ml-surface-inset);
  color: var(--ml-text-muted);
  font-size: 0.75rem;
  white-space: pre-wrap;
}
</style>
