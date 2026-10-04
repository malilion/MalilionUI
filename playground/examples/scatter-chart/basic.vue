<script setup lang="ts">
import type { MlScatterSeries } from '@malilion/ui'

// 固定的示範資料（不使用亂數，伺服器端與瀏覽器渲染結果一致）
const series: MlScatterSeries[] = [
  {
    name: '前端',
    tone: 'gold',
    points: [
      [1, 42], [2, 48], [2, 55], [3, 58], [4, 61], [4, 70], [5, 72], [6, 78], [7, 86], [8, 92], [9, 95], [10, 108],
    ].map(([x, y]) => ({ x, y })),
  },
  {
    name: '後端',
    tone: 'tech',
    points: [
      [1, 50], [2, 52], [3, 63], [3, 66], [4, 72], [5, 80], [6, 85], [6, 91], [7, 98], [8, 104], [9, 118], [10, 122],
    ].map(([x, y]) => ({ x, y })),
  },
]
</script>

<template>
  <MlScatterChart :series="series" trend x-title="年資（年）" y-title="年薪（萬）" :x-format="(v) => `${v} 年`" />
</template>
