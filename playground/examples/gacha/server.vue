<script setup lang="ts">
import type { MlLotteryPrize } from '@malilion/ui'

const prizes: MlLotteryPrize[] = [
  { label: '甜甜圈', icon: 'donut', tone: 'bean' },
  { label: '杯子蛋糕', icon: 'cupcake', tone: 'bean' },
  { label: '冰淇淋', icon: 'iceCream', tone: 'tech' },
  { label: '草莓', icon: 'strawberry', tone: 'success' },
]

// The machine keeps shaking until the server answers.
const beforeDraw = () => new Promise<number>((r) => setTimeout(() => r(Math.floor(Math.random() * 4)), 1800))
</script>

<template>
  <MlGacha :prizes="prizes" :before-draw="beforeDraw" :size="220" button-text="投幣" />
</template>
