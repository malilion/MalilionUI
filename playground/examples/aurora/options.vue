<script setup lang="ts">
import { ref } from 'vue'

const intensity = ref(70)
const speed = ref(10)
const grain = ref(true)
const scanlines = ref(false)
const paused = ref(false)
</script>

<template>
  <div class="demo">
    <MlAurora palette="night" class="stage" :intensity="intensity / 100" :speed="speed / 10" :grain="grain" :scanlines="scanlines" :paused="paused">
      <p class="ml-hud-label">intensity {{ (intensity / 100).toFixed(2) }} · speed {{ (speed / 10).toFixed(1) }}×</p>
    </MlAurora>
    <div class="controls">
      <MlSlider v-model="intensity" class="slider" label="強度" :min="0" :max="100" unit="%" />
      <MlSlider v-model="speed" class="slider" label="速度（×0.1）" :min="1" :max="50" />
      <MlSwitch v-model="grain" label="顆粒" />
      <MlSwitch v-model="scanlines" label="掃描線" />
      <MlSwitch v-model="paused" label="暫停" />
    </div>
  </div>
</template>

<style scoped>
.demo {
  display: grid;
  gap: 16px;
  width: 100%;
}
.stage {
  display: grid;
  place-items: center;
  min-height: 220px;
  border-radius: var(--ml-radius);
}
.controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px 24px;
}
.slider {
  flex: 1 1 200px;
}
</style>
