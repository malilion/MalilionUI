<script setup lang="ts">
import { ref } from 'vue'
import type { MlLotteryPrize } from '@malilion/ui'

const prizes: MlLotteryPrize[] = [
  { label: '機器人', icon: 'robot', tone: 'tech' },
  { label: '晶片', icon: 'chip', tone: 'gold' },
  { label: '閃電', icon: 'bolt', tone: 'gold' },
  { label: '盾牌', icon: 'shield', tone: 'tech' },
  { label: '鑰匙', icon: 'key', tone: 'gold' },
  { label: '電池', icon: 'battery', tone: 'success' },
  { label: 'Bug', icon: 'bug', tone: 'success', disabled: true },
  { label: '賽博獅', icon: 'cyberLion', tone: 'steel' },
]
const status = ref('')

// The server decides; the light keeps running until the answer arrives.
async function beforeDraw() {
  status.value = '向伺服器要結果…'
  await new Promise((r) => setTimeout(r, 1500))
  const index = Math.floor(Math.random() * 6)
  status.value = `伺服器回傳 ${index}`
  return index
}
</script>

<template>
  <div class="demo">
    <MlGridLottery :prizes="prizes" :before-draw="beforeDraw" :size="300" />
    <span class="log">{{ status }}</span>
  </div>
</template>

<style scoped>
.demo { display: grid; gap: 10px; justify-items: start; }
.log { color: var(--ml-text-muted); font-size: 13px; }
</style>
