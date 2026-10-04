<script setup lang="ts">
import { ref } from 'vue'

const open = ref(false)
const snap = ref(1)
const snapPoints = ['30%', '60%', '95%']
const members = ['獅王 Leo', '小金 Goldie', '鬃毛 Mane', '肉球 Bean', '鐵爪 Claw', '閃電 Bolt', '咕嚕 Purr', '星塵 Dusty']
</script>

<template>
  <MlPhone :width="280" label="可停靠高度的底部面板">
    <MlNavBar title="獅群" />
    <div class="screen">
      <p class="ml-hud-label">目前高度：{{ snapPoints[snap] }}</p>
      <MlButton block stamp @click="open = true">查看成員</MlButton>
    </div>
    <MlBottomSheet v-model:open="open" v-model:snap="snap" :snap-points="snapPoints" inline title="獅群成員">
      <MlList>
        <MlListItem v-for="name in members" :key="name" :title="name" subtitle="在線上" clickable>
          <template #leading><MlAvatar :name="name" size="sm" /></template>
        </MlListItem>
      </MlList>
    </MlBottomSheet>
  </MlPhone>
</template>

<style scoped>
.screen {
  display: grid;
  gap: 14px;
  padding: 20px 16px;
}

.screen .ml-hud-label {
  margin: 0;
  text-align: center;
}
</style>
