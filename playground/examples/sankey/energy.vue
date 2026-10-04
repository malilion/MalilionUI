<script setup lang="ts">
import type { MlSankeyLink, MlSankeyNode } from '@malilion/ui'

// 某城市一天的電力流向（示意資料，單位：GWh；比例只為示範，非官方統計）
const nodes: MlSankeyNode[] = [
  { id: 'gas', label: '燃氣', tone: 'tech' },
  { id: 'coal', label: '燃煤', tone: 'steel' },
  { id: 'solar', label: '太陽光電', tone: 'gold' },
  { id: 'wind', label: '離岸風電', tone: 'success' },
  { id: 'grid', label: '輸電網', tone: 'steel' },
  { id: 'storage', label: '儲能', tone: 'bean' },
  { id: 'industry', label: '工業', tone: 'gold' },
  { id: 'home', label: '住宅', tone: 'bean' },
  { id: 'business', label: '商業', tone: 'tech' },
  { id: 'loss', label: '線損', tone: 'danger' },
]
const links: MlSankeyLink[] = [
  { source: 'gas', target: 'grid', value: 42 },
  { source: 'coal', target: 'grid', value: 33 },
  { source: 'solar', target: 'grid', value: 9 },
  { source: 'solar', target: 'storage', value: 3 },
  { source: 'wind', target: 'grid', value: 8 },
  { source: 'storage', target: 'home', value: 3 },
  { source: 'grid', target: 'industry', value: 52 },
  { source: 'grid', target: 'home', value: 18 },
  { source: 'grid', target: 'business', value: 18 },
  { source: 'grid', target: 'loss', value: 4 },
]
</script>

<template>
  <MlSankey :nodes="nodes" :links="links" :height="340" :format="(v) => `${v} GWh`" />
</template>
