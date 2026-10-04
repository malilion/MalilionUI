<script setup lang="ts">
import { ref } from 'vue'
import type { MlTreemapDatum } from '@malilion/ui'

// 碼力獅科技 年度預算（示意資料，單位：萬元）
const budget: MlTreemapDatum[] = [
  {
    label: '研發',
    value: 0,
    tone: 'tech',
    children: [
      { label: '前端團隊', value: 1280 },
      { label: '後端團隊', value: 1460 },
      { label: 'AI 實驗室', value: 920 },
      { label: '雲端主機', value: 640 },
      { label: '資安', value: 310 },
    ],
  },
  {
    label: '行銷',
    value: 0,
    tone: 'gold',
    children: [
      { label: '數位廣告', value: 860 },
      { label: '品牌活動', value: 420 },
      { label: '社群經營', value: 260 },
    ],
  },
  {
    label: '營運',
    value: 0,
    tone: 'bean',
    children: [
      { label: '辦公室租金', value: 720 },
      { label: '客服', value: 380 },
      { label: '法務', value: 150 },
    ],
  },
  { label: '員工福利', value: 540, tone: 'steel' },
]

const picked = ref<string | null>(null)
</script>

<template>
  <div style="display: grid; gap: 12px">
    <MlTreemap v-model:selected="picked" :data="budget" selectable :height="360" :format="(v) => `${v.toLocaleString()} 萬`" />
    <p style="margin: 0; color: var(--ml-text-muted)">選取：{{ picked ?? '（無）' }}</p>
  </div>
</template>
