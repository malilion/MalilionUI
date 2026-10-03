<script setup lang="ts">
const story =
  '碼力獅的鬃毛是用拋光的黃金打造，每一根都刻著一行程式碼。夜晚巡邏伺服器機房時，鬃毛會隨著 CPU 的溫度微微發光；遇到 bug 時，牠會先低吼一聲，再用肉球輕輕把錯誤推回開發者的鍵盤上。'
</script>

<template>
  <div class="demo">
    <div class="row">
      <span class="tag">1 行</span>
      <MlEllipsis :text="story" />
    </div>
    <div class="row">
      <span class="tag">2 行</span>
      <MlEllipsis :text="story" :lines="2" />
    </div>
    <div class="row">
      <span class="tag">放得下</span>
      <MlEllipsis text="短短一句，不會截斷，也就不會出現提示。" />
    </div>
  </div>
</template>

<style scoped>
.demo {
  display: grid;
  gap: 14px;
  width: 100%;
  max-width: 460px;
}

.row {
  display: grid;
  grid-template-columns: 56px minmax(0, 1fr);
  align-items: start;
  gap: 12px;
  padding: 12px 14px;
  border-radius: var(--ml-radius);
  background: var(--ml-surface-2);
  box-shadow: inset 0 0 0 1px var(--ml-line-steel);
  font-size: var(--ml-text-sm);
}

.tag {
  color: var(--ml-text-dim);
  font-family: var(--ml-font-mono);
  font-size: var(--ml-text-xs);
  line-height: 1.7;
}
</style>
