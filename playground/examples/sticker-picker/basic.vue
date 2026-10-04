<script setup lang="ts">
import { ref } from 'vue'
import type { CuteIconName } from '@malilion/ui'

const picked = ref<CuteIconName>('lion')
const count = ref(0)
</script>

<template>
  <div class="demo">
    <MlStickerPicker storage-key="ml-docs-stickers" @select="(n) => ((picked = n), count++)" />
    <div class="preview">
      <MlCuteIcon :key="count" :name="picked" :size="96" animate="bounce" />
      <p class="ml-hud-label">試試搜尋「珍奶」、「獅子」或「rocket」</p>
    </div>
  </div>
</template>

<style scoped>
.demo { display: flex; flex-wrap: wrap; gap: 24px; align-items: center; }
.preview { display: grid; justify-items: center; gap: 10px; min-width: 180px; }
</style>
