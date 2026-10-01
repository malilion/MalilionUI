<script setup lang="ts">
import { ref } from 'vue'

const volume = ref(60)
const opacity = ref(0.4)
</script>

<template>
  <div class="stack">
    <MlSlider v-model="volume" label="Volume" unit="%" />
    <MlSlider v-model="opacity" label="Opacity" tone="tech" :min="0" :max="1" :step="0.05" />
    <MlSlider :model-value="30" label="Disabled" disabled />
  </div>
</template>

<style scoped>
.stack {
  display: grid;
  gap: 22px;
  max-width: 420px;
}
</style>
