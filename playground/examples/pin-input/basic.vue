<script setup lang="ts">
import { ref } from 'vue'
import { toast } from '@malilion/ui'

const code = ref('')
const error = ref('')
const pin = ref('')

function verify(value: string) {
  if (value === '123456') {
    error.value = ''
    toast.success('驗證成功')
  } else {
    error.value = '驗證碼錯誤（試試 123456）'
  }
}
</script>

<template>
  <div class="stack">
    <MlPinInput v-model="code" label="簡訊驗證碼" :group-size="3" :error="error" hint="可以直接貼上整串驗證碼" @complete="verify" />
    <MlPinInput v-model="pin" label="交易密碼" :length="4" mask size="sm" />
    <MlPinInput label="邀請碼" type="alphanumeric" :length="5" size="lg" />
  </div>
</template>

<style scoped>
.stack {
  display: grid;
  gap: 24px;
}
</style>
