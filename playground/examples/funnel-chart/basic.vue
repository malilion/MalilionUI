<script setup lang="ts">
import { ref } from 'vue'
import type { MlFunnelDatum } from '@malilion/ui'

const data: MlFunnelDatum[] = [
  { label: '造訪網站', value: 48200 },
  { label: '瀏覽商品', value: 30150 },
  { label: '加入購物車', value: 12480 },
  { label: '進入結帳', value: 6920 },
  { label: '完成付款', value: 4310, tone: 'success' },
]
const picked = ref('')
</script>

<template>
  <div style="display: grid; gap: 10px">
    <MlFunnelChart :data="data" @select="(_i, d) => (picked = `${d.label}：${d.value.toLocaleString()}`)" />
    <p style="margin: 0; color: var(--ml-text-dim); font-size: 12px">已選：{{ picked || '點一下任一階段' }}</p>
  </div>
</template>
