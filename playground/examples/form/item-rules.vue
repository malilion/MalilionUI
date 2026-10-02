<script setup lang="ts">
import { reactive } from 'vue'

const model = reactive({ password: '', confirm: '' })
</script>

<template>
  <MlForm :model="model" class="demo">
    <MlFormItem prop="password" :rules="[{ required: true }, { min: 8 }, { pattern: /\d/, message: '至少要有一個數字' }]">
      <MlInput v-model="model.password" label="密碼" type="password" />
    </MlFormItem>
    <MlFormItem
      prop="confirm"
      :rules="{ required: true, validator: (v) => v === model.password || '兩次輸入的密碼不一樣' }"
    >
      <MlInput v-model="model.confirm" label="確認密碼" type="password" />
    </MlFormItem>
    <MlButton type="submit">設定密碼</MlButton>
  </MlForm>
</template>

<style scoped>
.demo {
  max-width: 420px;
  justify-items: start;
}

.demo > :not(button) {
  justify-self: stretch;
}
</style>
