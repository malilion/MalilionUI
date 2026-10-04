<template>
  <MlAurora class="hero" scanlines>
    <p class="ml-hud-label">MALILION · NIGHT PRIDE</p>
    <h2>寫程式的獅子，<br />在極光下發光。</h2>
    <p class="lead">MlAurora 是一層緩緩流動的柔光背景，內容直接放進預設插槽。動畫全在 CSS，React 或純 HTML 套上 class 就能用。</p>
    <div class="actions">
      <MlButton>開始使用</MlButton>
      <MlButton variant="ghost">看元件</MlButton>
    </div>
  </MlAurora>
</template>

<style scoped>
.hero {
  padding: 56px 32px;
  border-radius: var(--ml-radius);
}
h2 {
  margin: 8px 0 12px;
  font-family: var(--ml-font-display);
  font-size: clamp(1.6rem, 4vw, 2.4rem);
  line-height: 1.2;
}
.lead {
  max-width: 34em;
  margin: 0 0 24px;
  color: var(--ml-text-muted);
}
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}
</style>
