<template>
  <div class="row">
    <MlSpotlight class="panel">
      <p class="ml-hud-label">Spotlight · gold</p>
      <h3>把滑鼠移進來</h3>
      <p>游標像手電筒一樣照亮底下的 HUD 格線，最靠近的邊框也會亮起。</p>
    </MlSpotlight>
    <MlSpotlight tone="tech" :size="220" class="panel">
      <p class="ml-hud-label">Spotlight · tech</p>
      <h3>小一點的光圈</h3>
      <p>size 控制光圈半徑。</p>
    </MlSpotlight>
  </div>
</template>

<style scoped>
.row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 20px;
}

.panel {
  min-height: 200px;
  padding: 24px;
  background: var(--ml-surface);
  box-shadow: inset 0 0 0 1px var(--ml-line);
}

h3 {
  margin: 6px 0;
  color: var(--ml-text);
  font-family: var(--ml-font-display);
}

p {
  margin: 0;
  color: var(--ml-text-muted);
}
</style>
