<script setup lang="ts">
const data = [
  { label: '期初', value: 1200, total: true },
  { label: '營收', value: 860 },
  { label: '服務', value: 240 },
  { label: '成本', value: -520 },
  { label: '人事', value: -380 },
  { label: '毛利', total: true },
  { label: '稅', value: -150 },
  { label: '期末', total: true },
]
</script>

<template>
  <div class="stack">
    <MlWaterfallChart :data="data" :format="(v) => `${v.toLocaleString()} 萬`" />
    <MlWaterfallChart :data="data" up-color="green" :show-values="false" :height="160" />
  </div>
</template>

<style scoped>
.stack {
  display: grid;
  gap: 28px;
}
</style>
