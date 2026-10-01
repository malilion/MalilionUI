<script setup lang="ts">
import { ref } from 'vue'

const agree = ref(true)
const newsletter = ref(false)
</script>

<template>
  <MlCheckbox v-model="agree" label="我同意獅群公約" hint="包含程式碼審查與每週分享" />
  <MlCheckbox v-model="newsletter" label="訂閱碼力獅電子報" />
  <MlCheckbox :model-value="true" label="已停用" disabled />
</template>
