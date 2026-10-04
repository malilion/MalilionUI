<template>
  <MlParticles class="hero">
    <p class="ml-hud-label">CONSTELLATION · REPEL</p>
    <h2>移動滑鼠推開星點，點一下爆開。</h2>
    <p class="lead">粒子數量依面積計算（每 100×100 px 約 1.2 顆），相近的粒子連成線；離開畫面或切換分頁時自動停下。</p>
    <MlButton>按鈕照常可以點</MlButton>
  </MlParticles>
</template>

<style scoped>
.hero {
  min-height: 300px;
  padding: 48px 32px;
  border-radius: var(--ml-radius);
  background: radial-gradient(ellipse at 50% 0%, var(--ml-surface-2), var(--ml-bg) 70%);
  box-shadow: inset 0 0 0 1px var(--ml-line);
}
h2 {
  margin: 8px 0 10px;
  font-family: var(--ml-font-display);
  font-size: clamp(1.4rem, 3.5vw, 2rem);
}
.lead {
  max-width: 34em;
  margin: 0 0 20px;
  color: var(--ml-text-muted);
}
</style>
