<script setup lang="ts">
import { ref } from 'vue'

const twd = ref<number | null>(128000)
const usd = ref<number | null>(1999.5)
const diff = ref<number | null>(null)
</script>

<template>
  <div class="stack">
    <MlAmountInput v-model="twd" label="匯款金額" currency="NT$" capital :max="10000000" hint="上限一千萬，離開欄位時套用" />
    <div class="row">
      <MlAmountInput v-model="usd" label="美金（兩位小數）" currency="US$" :decimals="2" />
      <MlAmountInput v-model="diff" label="調整（可負數）" allow-negative :min="-5000" :max="5000" placeholder="-5,000 ~ 5,000">
        <template #suffix>元</template>
      </MlAmountInput>
    </div>
    <p class="out">v-model：{{ twd }} · {{ usd }} · {{ diff }}</p>
  </div>
</template>

<style scoped>
.stack {
  display: grid;
  gap: 20px;
}
.row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 20px;
}
.out {
  margin: 0;
  color: var(--ml-text-dim);
  font-family: var(--ml-font-mono);
  font-size: 0.8125rem;
}
</style>
