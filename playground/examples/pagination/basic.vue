<script setup lang="ts">
import { ref } from 'vue'

const page = ref(1)
const page2 = ref(10)
</script>

<template>
  <div class="stack">
    <MlPagination v-model:page="page" :total="10" />
    <MlPagination v-model:page="page2" :total="20" />
    <span class="ml-hud-label">page = {{ page }} · page2 = {{ page2 }}</span>
  </div>
</template>

<style scoped>
.stack {
  display: grid;
  gap: 16px;
  justify-items: start;
}
</style>
