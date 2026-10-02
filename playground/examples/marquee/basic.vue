<script setup lang="ts">
const tech = ['Vue 3', 'TypeScript', 'Vite', 'Vitest', 'Pinia', 'Nuxt', 'Playwright', 'CSS Variables']
const ticker = [
  { s: 'LION', v: '+4.2%', up: true },
  { s: 'PAW', v: '+1.8%', up: true },
  { s: 'MANE', v: '-0.6%', up: false },
  { s: 'ROAR', v: '+12.0%', up: true },
  { s: 'CUB', v: '-2.3%', up: false },
]
</script>

<template>
  <div class="stack">
    <MlMarquee label="使用的技術">
      <MlTag v-for="t in tech" :key="t" tone="steel" variant="outline">{{ t }}</MlTag>
    </MlMarquee>
    <MlMarquee direction="right" :speed="40" label="獅群指數">
      <span v-for="t in ticker" :key="t.s" class="tick">
        <MlPaw tone="current" /> {{ t.s }} <b :class="t.up ? 'up' : 'down'">{{ t.v }}</b>
      </span>
    </MlMarquee>
  </div>
</template>

<style scoped>
.stack {
  display: grid;
  gap: 18px;
}

.tick {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--ml-text-muted);
  font-family: var(--ml-font-mono);
  font-size: var(--ml-text-sm);
  white-space: nowrap;
}

.up { color: var(--ml-success-text); }
.down { color: var(--ml-danger-text); }
</style>
