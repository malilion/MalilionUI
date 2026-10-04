<template>
  <div class="row">
    <MlParticles class="tile" tone="tech" :fps="30" :speed="1.6">
      <span class="ml-hud-label">tech · fps 30 · speed 1.6</span>
    </MlParticles>
    <MlParticles class="tile" tone="steel" interaction="none" :burst="false" :link-distance="0" :density="2.4">
      <span class="ml-hud-label">steel · 無連線、不互動</span>
    </MlParticles>
    <MlParticles class="tile" :density="0.6" :link-distance="160" :seed="42">
      <span class="ml-hud-label">gold · 稀疏、長連線</span>
    </MlParticles>
  </div>
</template>

<style scoped>
.row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 14px;
  width: 100%;
}
.tile {
  height: 180px;
  padding: 12px;
  border-radius: var(--ml-radius);
  background: var(--ml-surface);
  box-shadow: inset 0 0 0 1px var(--ml-line);
}
</style>
