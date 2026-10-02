<script setup lang="ts">
import { lionFullUrl } from '@malilion/ui'

const fits = ['cover', 'contain', 'fill'] as const
</script>

<template>
  <figure v-for="fit in fits" :key="fit" class="fig">
    <MlImage :src="lionFullUrl" :alt="`fit: ${fit}`" :width="120" :height="80" :fit="fit" />
    <figcaption class="ml-hud-label">{{ fit }}</figcaption>
  </figure>
  <figure class="fig">
    <MlImage src="/does-not-exist.png" alt="壞掉的圖片" :width="120" :height="80" />
    <figcaption class="ml-hud-label">error</figcaption>
  </figure>
</template>

<style scoped>
.fig {
  display: grid;
  gap: 6px;
  margin: 0;
  justify-items: center;
}
</style>
