<script setup lang="ts">
import { ref } from 'vue'
import type { MlSwipeDirection } from '@malilion/ui'

const tips = [
  { title: '早點睡', body: '熬夜寫 code 的 bug 數量是白天的兩倍。' },
  { title: '寫測試', body: '未來的你會感謝現在的你。' },
  { title: '多喝水', body: '珍奶不算水，雖然很好喝。' },
  { title: '休息一下', body: '每 50 分鐘站起來伸展五分鐘。' },
]

const stack = ref<{ swipe: (d: MlSwipeDirection) => boolean; undo: () => boolean }>()
const index = ref(0)
</script>

<template>
  <div class="demo">
    <MlSwipeStack ref="stack" v-model:index="index" :items="tips" :buttons="false" :height="180" :width="280">
      <template #default="{ item }">
        <div class="tip">
          <MlCuteIcon name="bulb" :size="40" />
          <h4>{{ item.title }}</h4>
          <p>{{ item.body }}</p>
        </div>
      </template>
    </MlSwipeStack>
    <div class="row">
      <MlButton size="sm" variant="outline" @click="stack?.swipe('left')">略過</MlButton>
      <MlButton size="sm" variant="ghost" @click="stack?.undo()">復原</MlButton>
      <MlButton size="sm" @click="stack?.swipe('right')">收藏</MlButton>
      <MlButton size="sm" variant="ghost" @click="index = 0">重新開始</MlButton>
      <span class="ml-hud-label">{{ Math.min(index + 1, tips.length) }} / {{ tips.length }}</span>
    </div>
  </div>
</template>

<style scoped>
.demo { display: grid; gap: 14px; justify-items: center; width: 100%; }
.row { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; justify-content: center; }
.tip { display: grid; justify-items: center; align-content: center; gap: 4px; height: 100%; padding: 16px; text-align: center; background: var(--ml-brushed), var(--ml-surface-2); }
.tip h4 { margin: 0; font-size: 18px; }
.tip p { margin: 0; color: var(--ml-text-muted); font-size: 13px; }
</style>
