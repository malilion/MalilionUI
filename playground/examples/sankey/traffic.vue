<script setup lang="ts">
import type { MlSankeyLink, MlSankeyNode } from '@malilion/ui'

// 電商網站一週的流量漏斗（示意資料，單位：工作階段）
const nodes: MlSankeyNode[] = [
  { id: 'search', label: '自然搜尋' },
  { id: 'social', label: '社群' },
  { id: 'line', label: 'LINE 推播' },
  { id: 'ads', label: '廣告' },
  { id: 'home', label: '首頁' },
  { id: 'product', label: '商品頁' },
  { id: 'cart', label: '購物車' },
  { id: 'order', label: '完成訂單', tone: 'success' },
  { id: 'leave', label: '離開', tone: 'steel' },
]
const links: MlSankeyLink[] = [
  { source: 'search', target: 'product', value: 4200 },
  { source: 'search', target: 'home', value: 1800 },
  { source: 'social', target: 'home', value: 2600 },
  { source: 'line', target: 'product', value: 1900 },
  { source: 'ads', target: 'product', value: 2300 },
  { source: 'home', target: 'product', value: 2900 },
  { source: 'home', target: 'leave', value: 1500 },
  { source: 'product', target: 'cart', value: 3100 },
  { source: 'product', target: 'leave', value: 8200 },
  { source: 'cart', target: 'order', value: 1240 },
  { source: 'cart', target: 'leave', value: 1860 },
  // 回到首頁的連結會形成循環：桑基圖會自動略過它
  { source: 'cart', target: 'home', value: 300 },
]
</script>

<template>
  <MlSankey :nodes="nodes" :links="links" :width="720" :height="300" :node-width="10" :node-padding="18" tone="tech" :format="(v) => v.toLocaleString()" />
</template>
