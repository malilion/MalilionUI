<script setup lang="ts">
import { ref } from 'vue'
import { lionFullUrl, type MlPuzzleResult } from '@malilion/ui'

const result = ref<MlPuzzleResult | null>(null)
</script>

<template>
  <div class="puzzle-demo">
    <MlPuzzle :src="lionFullUrl" alt="碼力獅" :ratio="400 / 422" @complete="result = $event" @shuffle="result = null" />
    <p v-if="result" class="done">🎉 {{ result.moves }} 步完成，用時 {{ (result.time / 1000).toFixed(1) }} 秒</p>
  </div>
</template>

<style scoped>
.puzzle-demo { display: grid; gap: 10px; justify-items: start; }
.done { margin: 0; color: var(--ml-accent-text); }
</style>
