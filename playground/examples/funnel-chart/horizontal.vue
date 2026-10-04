<script setup lang="ts">
import type { MlFunnelDatum } from '@malilion/ui'

const data: MlFunnelDatum[] = [
  { label: '下載 App', value: 9800, tone: 'tech' },
  { label: '完成註冊', value: 6400, tone: 'tech' },
  { label: '綁定裝置', value: 4100, tone: 'gold' },
  { label: '首次訂閱', value: 1650, tone: 'gold' },
  { label: '續訂', value: 1120, tone: 'bean' },
]
</script>

<template>
  <div style="display: grid; gap: 28px">
    <MlFunnelChart :data="data" orientation="horizontal" :size="160" />
    <MlFunnelChart :data="data.map(({ label, value }) => ({ label, value }))" shape="rect" tone="steel" :size="40" :format="(v) => `${(v / 1000).toFixed(1)}k`" />
  </div>
</template>
