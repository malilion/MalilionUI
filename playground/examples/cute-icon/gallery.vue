<script setup lang="ts">
import { ref } from 'vue'
import { CUTE_ICON_GROUPS, toast, type CuteIconName } from '@malilion/ui'

const titles = { animals: '動物', food: '美食', nature: '自然與天氣', things: '生活小物', tech: '科技工坊' }
const picked = ref<CuteIconName>('lion')

function pick(name: CuteIconName) {
  picked.value = name
  toast({ message: `<MlCuteIcon name="${name}" />` })
}
</script>

<template>
  <div class="cute-gallery">
    <section v-for="g in CUTE_ICON_GROUPS" :key="g.id">
      <h4>{{ titles[g.id] }}</h4>
      <div class="cute-gallery__grid">
        <button
          v-for="name in g.names"
          :key="name"
          type="button"
          :class="['cute-gallery__cell', { 'is-on': picked === name }]"
          @click="pick(name)"
        >
          <MlCuteIcon :name="name" :size="44" animate="bounce" hover />
          <span>{{ name }}</span>
        </button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.cute-gallery { display: grid; gap: 18px; width: 100%; }
h4 { margin: 0 0 8px; font-size: 13px; color: var(--ml-text-muted); letter-spacing: 0.08em; }
.cute-gallery__grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(84px, 1fr)); gap: 8px; }
.cute-gallery__cell {
  display: grid; justify-items: center; gap: 6px; padding: 12px 4px 8px;
  border: 1px solid var(--ml-line); border-radius: 10px; background: var(--ml-surface);
  color: var(--ml-text-muted); font: 11px var(--ml-font-mono); cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}
.cute-gallery__cell:hover, .cute-gallery__cell.is-on { border-color: var(--ml-accent); background: var(--ml-accent-soft); color: var(--ml-text); }
.cute-gallery__cell:focus-visible { outline: 2px solid var(--ml-focus); outline-offset: 2px; }
</style>
