<script setup lang="ts">
import { ref } from 'vue'
import { toast, type MlTourStep } from '@malilion/ui'

const open = ref(false)
const current = ref(0)
const steps: MlTourStep[] = [
  { title: '歡迎來到獅群！', content: '我是碼力獅，花 20 秒帶你認識這個頁面。用 ← → 也可以切換。' },
  { target: '#tour-search', title: '搜尋', content: '在這裡找任何專案或成員。', placement: 'bottom' },
  { target: '#tour-new', title: '建立專案', content: '按這顆金色按鈕開一個新的專案。', placement: 'bottom' },
  { target: '#tour-stats', title: '今日數據', content: '這裡會即時更新部署與錯誤數。', placement: 'top' },
]
</script>

<template>
  <div class="wrap">
    <div class="bar">
      <MlInput id="tour-search" placeholder="搜尋…" size="sm" class="search" />
      <MlButton id="tour-new" size="sm" stamp>建立專案</MlButton>
    </div>
    <div id="tour-stats" class="stats">
      <MlStat label="部署" value="42" />
      <MlStat label="錯誤" value="3" :delta="-40" />
    </div>
    <MlButton variant="outline" @click="current = 0; open = true">開始導覽</MlButton>
    <MlTour v-model:open="open" v-model:current="current" :steps="steps" @finish="toast.success('導覽完成！')" />
  </div>
</template>

<style scoped>
.wrap {
  display: grid;
  gap: 16px;
  width: 100%;
  justify-items: start;
}

.bar {
  display: flex;
  gap: 10px;
  width: 100%;
}

.search {
  flex: 1;
}

.stats {
  display: flex;
  gap: 32px;
  padding: 12px 16px;
  box-shadow: inset 0 0 0 1px var(--ml-line);
}
</style>
