<script setup lang="ts">
import { ref } from 'vue'
import type { MlRadarBlip } from '@malilion/ui'

const blips: MlRadarBlip[] = [
  { angle: 32, distance: 0.62, label: '貓咪 #7' },
  { angle: 118, distance: 0.38, label: '補給站', tone: 'gold' },
  { angle: 205, distance: 0.8, label: '未知訊號', tone: 'danger' },
  { angle: 290, distance: 0.5, label: '隊友', tone: 'success' },
  { angle: 340, distance: 0.22 },
]
const picked = ref('')
</script>

<template>
  <div class="demo">
    <MlRadar :blips="blips" @select="(b) => (picked = b.label ?? '無名目標')" />
    <p class="hint">{{ picked ? `鎖定：${picked}` : '掃描線經過時目標亮起再淡出；點擊或 Tab 聚焦目標看名稱，Esc 取消鎖定。' }}</p>
  </div>
</template>

<style scoped>
.demo { display: grid; justify-items: center; gap: 10px; width: 100%; }
.hint { margin: 0; color: var(--ml-text-muted); font-size: 13px; text-align: center; }
</style>
