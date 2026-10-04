<script setup lang="ts">
import { ref } from 'vue'
import { en, type TwBankKind } from '@malilion/ui'

// Add the e-payment institutions (街口、全支付、一卡通…) or keep only domestic banks.
const kinds: TwBankKind[] = ['bank', 'post', 'epay']
const wallet = ref<string | null>('396')
const english = ref<string | null>('808')
</script>

<template>
  <div class="demo">
    <MlBankPicker v-model:value="wallet" :kinds="kinds" short label="銀行、郵局或電子支付" />
    <MlConfigProvider :locale="en">
      <MlBankPicker v-model:value="english" label="Bank (English names)" />
    </MlConfigProvider>
  </div>
</template>

<style scoped>
.demo {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 16px;
  width: 100%;
}
</style>
