<script setup lang="ts">
import { ref } from 'vue'
import { toast } from '@malilion/ui'

const pin = ref('')

function done(code: string) {
  toast.success(`密碼 ${code} 已送出`)
  pin.value = ''
}
</script>

<template>
  <div class="col">
    <MlPinInput v-model="pin" :length="6" mask label="交易密碼" @complete="done" />
    <MlNumberKeyboard v-model="pin" random :maxlength="6" title="每次打開都會重新排列數字" />
  </div>
</template>

<style scoped>
.col {
  display: grid;
  gap: 16px;
  justify-items: center;
}
</style>
