<script setup lang="ts">
import { ref } from 'vue'

const mobile = ref('')
const phone = ref('')
const id = ref('')
const ubn = ref('')
const card = ref('')
const carrier = ref('')
const rocDate = ref('')
const zip = ref('')
</script>

<template>
  <div class="grid">
    <MlInputMask v-model="mobile" preset="mobile" label="手機" :hint="`v-model：${mobile || '—'}`" />
    <MlInputMask v-model="phone" preset="phone" label="市話" :hint="`v-model：${phone || '—'}`" />
    <MlInputMask v-model="id" preset="id" label="身分證／居留證" hint="英文字母自動轉大寫" />
    <MlInputMask v-model="ubn" preset="ubn" label="統一編號" />
    <MlInputMask v-model="card" preset="card" label="信用卡號" :hint="`v-model：${card || '—'}`" />
    <MlInputMask v-model="carrier" preset="carrier" :unmask="false" label="手機條碼載具" :hint="`v-model：${carrier || '—'}（含斜線）`" />
    <MlInputMask v-model="rocDate" preset="roc-date" label="民國日期" />
    <MlInputMask v-model="zip" preset="zip" label="3+3 郵遞區號" />
  </div>
</template>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 20px;
}
</style>
