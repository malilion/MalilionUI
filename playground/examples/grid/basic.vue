<template>
  <div class="stack">
    <MlGrid :cols="12" gap="sm">
      <MlGridItem :span="8"><div class="cell">span 8</div></MlGridItem>
      <MlGridItem :span="4"><div class="cell">span 4</div></MlGridItem>
      <MlGridItem :span="4"><div class="cell">4</div></MlGridItem>
      <MlGridItem :span="4"><div class="cell">4</div></MlGridItem>
      <MlGridItem :span="4"><div class="cell">4</div></MlGridItem>
      <MlGridItem :span="6" :offset="4"><div class="cell cell--gold">offset 4 · span 6</div></MlGridItem>
    </MlGrid>
    <MlGrid min-item-width="160px" gap="md">
      <div v-for="n in 7" :key="n" class="cell">自動欄 {{ n }}</div>
    </MlGrid>
  </div>
</template>

<style scoped>
.stack {
  display: grid;
  gap: 24px;
  width: 100%;
}

.cell {
  display: grid;
  place-items: center;
  min-height: 52px;
  background: var(--ml-surface-2);
  box-shadow: inset 0 0 0 1px var(--ml-line-steel-strong);
  color: var(--ml-text-muted);
  font-family: var(--ml-font-mono);
  font-size: var(--ml-text-xs);
}

.cell--gold {
  background: var(--ml-accent-soft);
  box-shadow: inset 0 0 0 1px var(--ml-line-strong);
  color: var(--ml-accent-text);
}
</style>
