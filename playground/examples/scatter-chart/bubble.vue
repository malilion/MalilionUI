<script setup lang="ts">
import type { MlScatterSeries } from '@malilion/ui'

const series: MlScatterSeries[] = [
  {
    name: '亞洲',
    tone: 'gold',
    points: [
      { label: '台灣', x: 33, y: 81, size: 23 },
      { label: '日本', x: 34, y: 84, size: 124 },
      { label: '韓國', x: 33, y: 83, size: 52 },
      { label: '新加坡', x: 82, y: 84, size: 6 },
      { label: '越南', x: 4, y: 74, size: 99 },
    ],
  },
  {
    name: '歐洲',
    tone: 'bean',
    points: [
      { label: '德國', x: 52, y: 81, size: 84 },
      { label: '法國', x: 44, y: 83, size: 68 },
      { label: '瑞士', x: 99, y: 84, size: 9 },
      { label: '波蘭', x: 22, y: 78, size: 37 },
    ],
  },
]
</script>

<template>
  <MlScatterChart
    :series="series"
    :height="280"
    :size-range="[6, 26]"
    x-title="人均 GDP（千美元）"
    y-title="平均壽命（歲）"
    :x-format="(v) => `${v}k`"
  />
</template>
