<script setup lang="ts">
import { ref } from 'vue'
import { toast, type MlInvoiceDraw, type MlInvoiceResult } from '@malilion/ui'

const draws: MlInvoiceDraw[] = [
  { period: '115年 7–8月', special: '89996565', grand: '91098182', first: ['54348835', '44991397', '06595111'] },
]
const mode = ref<'quick' | 'full'>('full')
const won = ref(0)

function onCheck(result: MlInvoiceResult) {
  if (result.status !== 'win') return
  won.value += result.amount
  toast({ tone: 'success', title: '中獎了！', message: `${result.number}・NT$${result.amount.toLocaleString()}` })
}
</script>

<template>
  <div class="demo">
    <p class="tip">完整 8 碼對獎（字軌可以一起貼上，例如「AB-14348835」）。累計獎金：NT${{ won.toLocaleString() }}</p>
    <MlInvoiceChecker v-model:mode="mode" :draws="draws" :history-limit="5" @check="onCheck" />
  </div>
</template>

<style scoped>
.demo {
  display: grid;
  gap: 12px;
}

.tip {
  margin: 0;
  color: var(--ml-text-muted);
  font-size: var(--ml-text-sm);
}
</style>
