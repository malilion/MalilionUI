<script setup lang="ts">
import { ref } from 'vue'
import type { MlLotteryPrize } from '@malilion/ui'

const prizes: MlLotteryPrize[] = [
  { label: '小獅子', icon: 'lion', tone: 'gold', weight: 2 },
  { label: '貓貓', icon: 'cat', tone: 'steel', weight: 8 },
  { label: '兔兔', icon: 'bunny', tone: 'bean', weight: 8 },
  { label: '熊熊', icon: 'bear', tone: 'gold', weight: 8 },
  { label: '青蛙', icon: 'frog', tone: 'success', weight: 8 },
  { label: '機器人', icon: 'robot', tone: 'tech', weight: 4 },
  { label: '熊貓', icon: 'panda', tone: 'steel', weight: 6 },
]
const chances = ref(5)
const collected = ref<string[]>([])
</script>

<template>
  <div class="demo">
    <MlGacha :prizes="prizes" :chances="chances" @start="chances--" @result="(p) => collected.push(p.label)" />
    <div class="side">
      <p>收集到：{{ collected.join('、') || '還沒有' }}</p>
      <MlButton size="sm" variant="outline" @click="chances = 5">補 5 枚代幣</MlButton>
    </div>
  </div>
</template>

<style scoped>
.demo { display: flex; gap: 24px; align-items: center; flex-wrap: wrap; }
.side { display: grid; gap: 10px; justify-items: start; color: var(--ml-text-muted); font-size: 14px; }
.side p { margin: 0; }
</style>
