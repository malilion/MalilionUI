<script setup lang="ts">
import { lionAvatarUrl, type MlWheelPrize } from '@malilion/ui'

// `color` takes any CSS colour (dark ones get light text); `image` draws a picture in the slice.
const prizes: MlWheelPrize[] = [
  { label: '獅子抱枕', image: lionAvatarUrl, color: '#2b1b06' },
  { label: '咖啡', color: '#cd7631' },
  { label: '電影票', color: '#f9c757' },
  { label: '獅子貼圖', image: lionAvatarUrl, color: '#12151c' },
  { label: '甜點', color: '#ff8fa8' },
  { label: '再一次', color: '#3eeed0' },
  { label: '紅包', color: '#e5402d' },
  { label: '小禮物', color: '#e3e7ed' },
]
</script>

<template>
  <MlLuckyWheel :prizes="prizes" :size="260" :duration="4500" :turns="4" spin-text="抽" />
  <MlLuckyWheel :prizes="prizes.slice(0, 4)" :size="200" :confetti="false" label="小轉盤" />
  <MlLuckyWheel :prizes="prizes.slice(0, 3)" :size="160" disabled />
</template>
