<script setup lang="ts">
const months = [
  { label: 'Jan', value: 8200 },
  { label: 'Feb', value: 14800 },
  { label: 'Mar', value: 11600 },
  { label: 'Apr', value: 22400 },
  { label: 'May', value: 42560 },
  { label: 'Jun', value: 31800 },
  { label: 'Jul', value: 36900 },
]
</script>

<template>
  <MlBarChart :data="months" :format="(v) => (v >= 1000 ? `${Math.round(v / 1000)}K` : `${v}`)" label="每月造訪數，五月最高 42,560" />
</template>
