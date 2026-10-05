<script setup lang="ts">
import { ref } from 'vue'
import { formatTwAddress, isTwAddressComplete, type MlTaiwanAddressValue } from '@malilion/ui'

const address = ref<MlTaiwanAddressValue>({
  county: '臺北市',
  district: '中正區',
  zip: '100',
  road: '重慶南路',
  section: '1',
  number: '122',
})
</script>

<template>
  <div class="stack">
    <MlTaiwanAddress v-model="address" label="收件地址" required english />
    <p class="out">
      {{ isTwAddressComplete(address) ? '✓ 地址完整' : '還缺行政區、路名或門牌號碼' }} ·
      <code>{{ formatTwAddress(address, { zip: false }) }}</code>
    </p>
  </div>
</template>

<style scoped>
.stack {
  display: grid;
  gap: 12px;
}
.out {
  margin: 0;
  color: var(--ml-text-dim);
  font-size: 0.8125rem;
}
</style>
