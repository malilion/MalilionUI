<script setup lang="ts">
import { ref } from 'vue'
import type { MlMenuItem } from '@malilion/ui'

const active = ref('dashboard')
const collapsed = ref(false)

const items: MlMenuItem[] = [
  {
    key: 'g-main',
    label: '主要',
    group: true,
    children: [
      { key: 'dashboard', label: '儀表板', icon: 'grid' },
      { key: 'calendar', label: '行事曆', icon: 'calendar' },
      { key: 'inbox', label: '收件匣', icon: 'bell', badge: 8 },
    ],
  },
  {
    key: 'g-team',
    label: '團隊',
    group: true,
    children: [
      {
        key: 'projects',
        label: '專案',
        icon: 'folder',
        children: [
          { key: 'malilion-ui', label: 'MalilionUI' },
          { key: 'roar-api', label: 'Roar API' },
        ],
      },
      { key: 'explore', label: '探索', icon: 'compass' },
    ],
  },
]
</script>

<template>
  <div class="demo">
    <MlSwitch v-model="collapsed" label="收合成圖示列" />
    <MlMenu v-model="active" :items="items" :collapsed="collapsed" accordion :class="['side', { 'side--rail': collapsed }]" />
  </div>
</template>

<style scoped>
.demo {
  display: grid;
  gap: 16px;
  min-height: 330px;
  align-content: start;
}

.side {
  width: 240px;
  transition: width var(--ml-dur) var(--ml-ease);
}

.side--rail {
  width: 56px;
}
</style>
