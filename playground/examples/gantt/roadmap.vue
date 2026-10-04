<script setup lang="ts">
import { ref } from 'vue'
import type { MlGanttScale, MlGanttTask } from '@malilion/ui'

// 2026 產品路線圖（示意）
const tasks: MlGanttTask[] = [
  { id: 'q1', label: '會員系統改版', start: '2026-01-05', end: '2026-03-13', progress: 1, group: '平台', tone: 'tech' },
  { id: 'pay', label: '行動支付整合', start: '2026-02-16', end: '2026-05-08', progress: 1, group: '平台', tone: 'tech', deps: ['q1'] },
  { id: 'ai', label: 'AI 客服上線', start: '2026-05-11', end: '2026-08-28', progress: 0.9, group: '平台', tone: 'tech', deps: ['pay'] },
  { id: 'ds', label: '設計系統 2.0', start: '2026-03-02', end: '2026-06-26', progress: 1, group: '體驗', tone: 'bean' },
  { id: 'a11y', label: '無障礙稽核', start: '2026-07-01', end: '2026-09-30', progress: 0.6, group: '體驗', tone: 'bean', deps: ['ds'] },
  { id: 'dark', label: '深色模式', start: '2026-09-14', end: '2026-11-20', progress: 0.25, group: '體驗', tone: 'bean' },
  { id: 'beta', label: 'Beta 公開測試', start: '2026-06-01', end: '2026-06-01', milestone: true, tone: 'gold' },
  { id: 'year', label: '年度發表', start: '2026-12-10', end: '2026-12-10', milestone: true, tone: 'danger', deps: ['dark'] },
]

const scale = ref<MlGanttScale>('month')
</script>

<template>
  <div style="display: grid; gap: 12px">
    <MlSegmented
      v-model="scale"
      size="sm"
      label="時間刻度"
      :options="[
        { label: '日', value: 'day' },
        { label: '週', value: 'week' },
        { label: '月', value: 'month' },
      ]"
    />
    <MlGantt :tasks="tasks" :scale="scale" :side-width="150" />
  </div>
</template>
