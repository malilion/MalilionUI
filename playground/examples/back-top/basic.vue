<template>
  <div class="scroller">
    <p v-for="n in 30" :key="n">第 {{ n }} 行 · 往下捲，右下角會出現回到頂端按鈕，外圈是捲動進度。</p>
    <MlBackTop target=".scroller" :visibility-height="120" />
  </div>
</template>

<style scoped>
.scroller {
  position: relative;
  height: 280px;
  overflow: auto;
  padding: 16px;
  background: var(--ml-surface-inset);
  /* Make the fixed button stay inside this demo box */
  transform: translateZ(0);
}

p {
  margin: 0 0 12px;
  color: var(--ml-text-muted);
}
</style>
