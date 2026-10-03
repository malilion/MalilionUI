<script setup lang="ts">
import { ref } from 'vue'

const logs = Array.from({ length: 40 }, (_, i) => ({
  id: i + 1,
  time: `09:${String(i).padStart(2, '0')}`,
  text: ['部署完成，獅群全員到齊', '快取已暖機', '偵測到可疑的貓砂', '金屬鬃毛拋光中', '肉球感應器校正'][i % 5],
}))
const bar = ref<{ scrollToTop: (smooth?: boolean) => void; scrollToBottom: (smooth?: boolean) => void }>()
const ends = ref(0)
</script>

<template>
  <div class="demo">
    <MlSpace>
      <MlButton size="sm" variant="outline" @click="bar?.scrollToTop()">回到頂端</MlButton>
      <MlButton size="sm" variant="outline" @click="bar?.scrollToBottom()">捲到最底</MlButton>
      <span class="hint">reach-end × {{ ends }}</span>
    </MlSpace>
    <MlScrollbar ref="bar" :max-height="260" direction="vertical" label="系統日誌" class="box" @reach-end="ends++">
      <div v-for="log in logs" :key="log.id" class="log">
        <span class="time">{{ log.time }}</span>
        <span>{{ log.text }}</span>
      </div>
    </MlScrollbar>
  </div>
</template>

<style scoped>
.demo {
  display: grid;
  gap: 12px;
  width: 100%;
  max-width: 460px;
}

.box {
  border-radius: var(--ml-radius);
  background: var(--ml-surface-inset);
  box-shadow: inset 0 0 0 1px var(--ml-line);
}

.log {
  display: flex;
  gap: 14px;
  padding: 9px 16px;
  border-bottom: 1px solid var(--ml-line-steel);
  font-size: var(--ml-text-sm);
}

.time,
.hint {
  color: var(--ml-text-dim);
  font-family: var(--ml-font-mono);
  font-size: var(--ml-text-xs);
}

.hint {
  align-self: center;
}
</style>
