<script setup lang="ts">
import { ref } from 'vue'
import type { MlPuzzleTone } from '@malilion/ui'

const size = ref('4')
const tone = ref<MlPuzzleTone>('tech')
const lock = ref(true)
const puzzle = ref<{ shuffle: () => void; solve: () => void }>()
</script>

<template>
  <div class="puzzle-numbers">
    <div class="controls">
      <MlSegmented v-model="size" :options="[{ value: '3', label: '3×3' }, { value: '4', label: '4×4' }, { value: '5', label: '5×5' }]" size="sm" />
      <MlSegmented
        v-model="tone"
        :options="[{ value: 'gold', label: '金' }, { value: 'tech', label: '青' }, { value: 'bean', label: '粉' }, { value: 'steel', label: '鋼' }]"
        size="sm"
      />
      <MlSwitch v-model="lock" label="放對就鎖住" />
      <MlButton size="sm" variant="outline" @click="puzzle?.solve()">直接完成</MlButton>
    </div>
    <MlPuzzle ref="puzzle" :rows="+size" :cols="+size" :tone="tone" :lock="lock" :width="340" />
  </div>
</template>

<style scoped>
.puzzle-numbers { display: grid; gap: 14px; }
.controls { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
</style>
