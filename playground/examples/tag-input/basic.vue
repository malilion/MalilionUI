<script setup lang="ts">
import { ref } from 'vue'

const tags = ref(['Vue', 'TypeScript'])
const emails = ref<string[]>([])
const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || '請輸入有效的 Email'
</script>

<template>
  <div class="form">
    <MlTagInput v-model="tags" index="01" label="技術標籤" :max="5" clearable hint="Enter 或逗號新增；Backspace 兩下刪除最後一個" />
    <MlTagInput v-model="emails" index="02" label="收件人" placeholder="name@example.com" :validate="isEmail" :separators="[',', ' ', ';']" />
  </div>
</template>

<style scoped>
.form {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
}
</style>
