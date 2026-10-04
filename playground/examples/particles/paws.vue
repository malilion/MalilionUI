<script setup lang="ts">
import { ref } from 'vue'

const box = ref<{ burst: (x: number, y: number) => void }>()
</script>

<template>
  <div class="demo">
    <MlParticles ref="box" class="stage" tone="bean" shape="paw" interaction="attract" :density="1.2" :link-distance="90" />
    <MlButton size="sm" variant="outline" @click="box?.burst(160, 110)">從程式觸發 burst(160, 110)</MlButton>
  </div>
</template>

<style scoped>
.demo {
  display: grid;
  justify-items: start;
  gap: 12px;
  width: 100%;
}
.stage {
  width: 100%;
  height: 240px;
  border-radius: var(--ml-radius);
  background: var(--ml-surface);
  box-shadow: inset 0 0 0 1px var(--ml-line);
}
</style>
