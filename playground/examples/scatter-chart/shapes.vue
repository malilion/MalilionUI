<script setup lang="ts">
import { ref } from 'vue'
import type { MlScatterSeries, MlScatterShape } from '@malilion/ui'

const shape = ref<MlScatterShape>('paw')
const shapes = [
  { value: 'paw', label: '獅掌' },
  { value: 'circle', label: '圓點' },
  { value: 'diamond', label: '菱形' },
]

// 用簡單的公式產生固定的點：晨跑距離與配速
const series: MlScatterSeries[] = [
  {
    name: '小獅子',
    tone: 'gold',
    points: Array.from({ length: 14 }, (_, i) => ({ x: 2 + i * 0.6, y: +(5.2 + ((i * 7) % 5) * 0.18 + i * 0.05).toFixed(2) })),
  },
  {
    name: '大獅子',
    tone: 'steel',
    points: Array.from({ length: 14 }, (_, i) => ({ x: 3 + i * 0.7, y: +(4.6 + ((i * 3) % 4) * 0.15 + i * 0.03).toFixed(2) })),
  },
]
</script>

<template>
  <div style="display: grid; gap: 14px">
    <MlSegmented v-model="shape" :options="shapes" size="sm" />
    <MlScatterChart
      :series="series"
      :shape="shape"
      :point-size="6"
      x-title="距離（km）"
      y-title="配速（分/km）"
      :format="(v) => v.toFixed(1)"
    />
  </div>
</template>
