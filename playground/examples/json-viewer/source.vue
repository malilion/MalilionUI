<script setup lang="ts">
import { ref } from 'vue'

const text = ref(`{
  "lion": "Nala",
  "paws": 4,
  "roars": [1, 2, 3,]
}`)
</script>

<template>
  <div class="grid">
    <MlTextarea v-model="text" :rows="8" label="JSON 原始字串" class="mono" />
    <MlJsonViewer :source="text" :toolbar="false" />
  </div>
</template>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 16px;
  width: 100%;
}

.mono :deep(textarea) {
  font-family: var(--ml-font-mono);
}
</style>
