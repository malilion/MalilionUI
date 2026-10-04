<script setup lang="ts">
import { ref } from 'vue'
import type { MlChartTone, MlTreemapDatum } from '@malilion/ui'

// 一個虛構投資組合的持股市值（示意資料，單位：千元）
const holdings: MlTreemapDatum[] = [
  { label: '半導體', value: 4820 },
  { label: '電子零組件', value: 1630 },
  { label: '金融', value: 1240 },
  { label: '航運', value: 610 },
  { label: '生技', value: 480 },
  { label: '傳產', value: 420 },
  { label: '綠能', value: 330 },
  { label: '觀光', value: 160 },
  { label: '現金', value: 900 },
]

const palette = ref<'mixed' | 'tech'>('mixed')
const tones: Record<'mixed' | 'tech', MlChartTone | MlChartTone[]> = { mixed: ['gold', 'tech', 'bean', 'steel'], tech: 'tech' }
</script>

<template>
  <div style="display: grid; gap: 12px">
    <MlSegmented
      v-model="palette"
      size="sm"
      label="配色"
      :options="[
        { label: '輪替色盤', value: 'mixed' },
        { label: '單一色調', value: 'tech' },
      ]"
    />
    <MlTreemap :data="holdings" :tone="tones[palette]" :height="260" :format="(v) => `${(v / 10).toLocaleString()} 萬`" label="投資組合市值分布" />
  </div>
</template>
