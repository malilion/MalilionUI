<script setup lang="ts">
import { ref } from 'vue'

const status = ref<'success' | 'info' | 'warning' | 'error'>('success')
const options = [
  { value: 'success', label: '成功' },
  { value: 'info', label: '資訊' },
  { value: 'warning', label: '警告' },
  { value: 'error', label: '錯誤' },
]
</script>

<template>
  <div class="wrap">
    <MlSegmented v-model="status" :options="options" />
    <MlResult :key="status" :status="status">
      <template #actions>
        <MlButton stamp>回到首頁</MlButton>
        <MlButton variant="outline">查看詳情</MlButton>
      </template>
    </MlResult>
  </div>
</template>

<style scoped>
.wrap {
  display: grid;
  justify-items: center;
  gap: 8px;
  width: 100%;
}
</style>
