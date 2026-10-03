<script setup lang="ts">
import { ref } from 'vue'

const cpu = ref(64)
</script>

<template>
  <div class="wrap">
    <div class="row">
      <MlGauge :value="cpu" unit="%" label="CPU" :bands="[{ from: 0, tone: 'success' }, { from: 70, tone: 'gold' }, { from: 90, tone: 'danger' }]" />
      <MlGauge :value="182" :max="300" unit="ms" label="回應時間" tone="tech" :size="180" />
      <MlGauge :value="4.6" :min="0" :max="5" label="滿意度" tone="bean" :size="160" :format="(v) => v.toFixed(1)" />
    </div>
    <MlSlider v-model="cpu" :min="0" :max="100" label="CPU 使用率" class="slider" />
  </div>
</template>

<style scoped>
.wrap {
  display: grid;
  gap: 16px;
  width: 100%;
}

.row {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 28px;
}

.slider {
  max-width: 360px;
}
</style>
