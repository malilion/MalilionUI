<script setup lang="ts">
import { ref } from 'vue'
import type { MlLotteryPrize } from '@malilion/ui'

const prizes: MlLotteryPrize[] = [
  { label: '獅王大獎', icon: 'crown', tone: 'gold', weight: 1 },
  { label: '珍奶', icon: 'bubbleTea', tone: 'bean', weight: 10 },
  { label: '咖啡', icon: 'coffee', tone: 'steel', weight: 10 },
  { label: '甜甜圈', icon: 'donut', tone: 'bean', weight: 10 },
  { label: '再接再厲', icon: 'cloud', tone: 'steel', weight: 30 },
  { label: '小禮物', icon: 'gift', tone: 'tech', weight: 10 },
  { label: '貼圖', icon: 'cat', tone: 'success', weight: 10 },
  { label: '紅利 50', icon: 'star', tone: 'gold', weight: 10 },
]
const chances = ref(3)
const won = ref('')
const lottery = ref<{ draw: (i?: number) => Promise<number> }>()
</script>

<template>
  <div class="demo">
    <MlGridLottery ref="lottery" :prizes="prizes" :chances="chances" @start="chances--" @result="(p) => (won = p.label)" />
    <div class="row">
      <MlButton size="sm" variant="outline" @click="chances = 3">補滿次數</MlButton>
      <MlButton size="sm" variant="ghost" @click="chances++; lottery?.draw(0)">指定獅王大獎</MlButton>
      <span class="log">{{ won && `抽中：${won}` }}</span>
    </div>
    <MlGridLottery :prizes="prizes" :size="220" :turns="2" :duration="3000" button-text="GO" label="小九宮格" />
  </div>
</template>

<style scoped>
.demo { display: grid; gap: 14px; justify-items: start; }
.row { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
.log { color: var(--ml-accent-text); }
</style>
