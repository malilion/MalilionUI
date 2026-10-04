<script setup lang="ts">
const data = {
  name: '碼力獅',
  version: '0.12.0',
  stable: true,
  stars: 1280,
  license: null,
  homepage: 'https://malilion.github.io/MalilionUI/',
  released: '2026-10-04T09:30:00+08:00',
  keywords: ['vue', 'react', 'lion', 'metal'],
  theme: { dark: 'Night Pride', light: 'Daylight', accent: '#f0ad2f' },
  motto: '把每一顆按鈕都打磨成金屬，再在角落留下一個小小的獅掌印。從 Night Pride 的深夜金屬到 Daylight 的鈦金日光，碼力獅希望你在寫介面的時候，也能感受到一點點被陪伴的溫度——就像大貓在鍵盤旁邊打盹一樣。',
}
</script>

<template>
  <MlJsonViewer :data="data" :toolbar="false" class="full" />
</template>

<style scoped>
.full {
  width: 100%;
}
</style>
