<script setup lang="ts">
import { ref } from 'vue'

const pinned = ref(false)
</script>

<template>
  <div class="scroller">
    <p class="hint">往下捲動這個區塊 ↓</p>
    <MlAffix target=".scroller" :offset-top="12" @change="pinned = $event">
      <div :class="['bar', { 'bar--pinned': pinned }]">
        <MlIcon name="bell" />
        {{ pinned ? '已固定在頂端' : '捲過去我就會黏住' }}
      </div>
    </MlAffix>
    <p v-for="n in 14" :key="n" class="line">第 {{ n }} 段內容 · 獅子巡邏中……</p>
  </div>
</template>

<style scoped>
.scroller {
  height: 260px;
  overflow: auto;
  padding: 16px;
  background: var(--ml-surface-inset);
}

.hint,
.line {
  margin: 0 0 14px;
  color: var(--ml-text-muted);
}

.bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: var(--ml-surface-3);
  box-shadow: inset 0 0 0 1px var(--ml-line-strong);
  color: var(--ml-text);
  transition: background var(--ml-dur) var(--ml-ease);
}

.bar--pinned {
  background: var(--ml-metal-gold-soft);
  color: var(--ml-text-on-metal);
}

.bar svg {
  width: 16px;
  height: 16px;
}
</style>
