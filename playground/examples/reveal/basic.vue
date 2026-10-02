<script setup lang="ts">
const effects = ['fade-up', 'fade', 'zoom', 'slide-left', 'slide-right', 'blur', 'flip'] as const
</script>

<template>
  <div class="scroller">
    <p class="hint">往下捲動，卡片會在進入畫面時出場 ↓（once 關閉，所以捲回去會再播一次）</p>
    <MlReveal v-for="e in effects" :key="e" :effect="e" :once="false" class="item">
      <MlCard :eyebrow="`effect: ${e}`" :title="e" />
    </MlReveal>
  </div>
</template>

<style scoped>
.scroller {
  display: grid;
  gap: 40px;
  height: 340px;
  overflow: auto;
  padding: 16px 16px 120px;
  background: var(--ml-surface-inset);
}

.hint {
  margin: 0 0 200px;
  color: var(--ml-text-muted);
}
</style>
