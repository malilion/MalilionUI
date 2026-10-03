<script setup lang="ts">
import { ref } from 'vue'

const make = (i: number) => ({ id: i, h: 70 + Math.round(90 * Math.abs(Math.cos(i * 1.9))) })
const tiles = ref(Array.from({ length: 9 }, (_, i) => make(i + 1)))
function more() {
  const n = tiles.value.length
  tiles.value = [...tiles.value, ...Array.from({ length: 4 }, (_, i) => make(n + i + 1))]
}
function shuffle() {
  tiles.value = [...tiles.value].sort((a, b) => ((a.id * 7) % 5) - ((b.id * 7) % 5) || b.id - a.id)
}
</script>

<template>
  <div class="demo">
    <MlSpace>
      <MlButton size="sm" @click="more">再來 4 張</MlButton>
      <MlButton size="sm" variant="outline" @click="shuffle">重新排列</MlButton>
    </MlSpace>
    <MlMasonry :items="tiles" :item-key="(t) => t.id" :columns="4" :gap="10" animate>
      <template #default="{ item }">
        <div class="tile" :style="{ height: `${item.h}px` }">{{ item.id }}</div>
      </template>
    </MlMasonry>
  </div>
</template>

<style scoped>
.demo {
  display: grid;
  gap: 14px;
  width: 100%;
}

.tile {
  display: grid;
  place-items: center;
  border-radius: var(--ml-radius);
  background: var(--ml-brushed), var(--ml-surface-3);
  box-shadow: inset 0 0 0 1px var(--ml-line);
  color: var(--ml-accent-text);
  font-family: var(--ml-font-display);
  font-size: var(--ml-text-xl);
}
</style>
