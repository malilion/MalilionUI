<script setup lang="ts">
const traffic = [
  { label: 'Direct', value: 38 },
  { label: 'Search', value: 28 },
  { label: 'Social', value: 18 },
  { label: 'Referral', value: 10 },
  { label: 'Others', value: 6 },
]
</script>

<template>
  <MlDonut :data="traffic" title="42,560" caption="Total Visits" />
</template>
