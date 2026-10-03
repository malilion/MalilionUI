<script setup lang="ts">
const items = [
  { label: '姓名', value: '小獅' },
  { label: '職稱', value: '前端工程師' },
  { label: 'Email', value: 'cub@malilion.dev', mono: true },
  { label: '加入日期', value: '2026-03-14', mono: true },
]
</script>

<template>
  <div class="grid">
    <MlDescriptions title="橫向標籤" :items="items" :columns="2" horizontal />
    <MlDescriptions title="無邊框" :items="items" :columns="2" variant="plain" />
  </div>
</template>

<style scoped>
.grid {
  display: grid;
  gap: 28px;
}
</style>
