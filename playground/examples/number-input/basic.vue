<script setup lang="ts">
import { ref } from 'vue'

const seats = ref(1)
const price = ref(9.5)
</script>

<template>
  <div class="row">
    <MlNumberInput v-model="seats" label="座位數" :min="1" :max="10" />
    <MlNumberInput v-model="price" label="價格" :step="0.5" :min="0" hint="以 0.5 為單位" />
  </div>
</template>

<style scoped>
.row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 220px));
  gap: 20px;
}
</style>
