<script setup lang="ts">
import { ref } from 'vue'

const revenue = ref(1284000)

function bump() {
  revenue.value += Math.round(Math.random() * 90000)
}
</script>

<template>
  <div class="grid">
    <MlCard eyebrow="Pride / Revenue" title="本月營收">
      <p class="big"><MlCountUp :value="revenue" prefix="NT$ " /></p>
      <MlButton size="sm" variant="ghost" @click="bump">再進帳一筆</MlButton>
    </MlCard>
    <MlCard eyebrow="Uptime" title="服務可用率">
      <p class="big"><MlCountUp :value="99.98" :decimals="2" suffix="%" :duration="2200" /></p>
    </MlCard>
    <MlCard eyebrow="Stars" title="GitHub 星星">
      <p class="big"><MlCountUp :value="4821" :from="4000" /></p>
    </MlCard>
  </div>
</template>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.big {
  margin: 0 0 10px;
  color: var(--ml-accent-text);
  font-family: var(--ml-font-display);
  font-size: var(--ml-text-2xl);
  font-weight: 700;
}
</style>
