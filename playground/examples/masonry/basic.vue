<script setup lang="ts">
const tones = ['gold', 'tech', 'bean', 'steel'] as const
// Deterministic "random" heights so the server and client render the same thing.
const cards = Array.from({ length: 14 }, (_, i) => ({
  id: i + 1,
  title: ['晨間巡邏', '金屬鬃毛保養', '肉球按摩', '部署日誌', '獅群會議', '夜間值班', '咖啡補給'][i % 7],
  lines: 1 + ((i * 5) % 4),
  tall: 60 + Math.round(70 * Math.abs(Math.sin(i * 2.3))),
  tone: tones[i % 4],
}))
</script>

<template>
  <MlMasonry :items="cards" :item-key="(c) => c.id" :columns="{ 0: 1, 420: 2, 680: 3 }" :gap="14" label="獅群動態" class="wall">
    <template #default="{ item }">
      <article :class="['card', `card--${item.tone}`]">
        <div class="art" :style="{ height: `${item.tall}px` }"><MlPaw :tone="item.tone" :size="28" /></div>
        <h4>#{{ item.id }} {{ item.title }}</h4>
        <p v-for="n in item.lines" :key="n">今天的任務順利完成，小獅子們互相擊掌。</p>
      </article>
    </template>
  </MlMasonry>
</template>

<style scoped>
.wall {
  width: 100%;
}

.card {
  overflow: hidden;
  border-radius: var(--ml-radius);
  background: var(--ml-surface-2);
  box-shadow: inset 0 0 0 1px var(--ml-line-steel);
  font-size: var(--ml-text-sm);
}

.art {
  display: grid;
  place-items: center;
  background: var(--ml-brushed), var(--ml-surface-3);
}

.card--gold .art { background: var(--ml-brushed), var(--ml-accent-soft); }
.card--tech .art { background: var(--ml-brushed), var(--ml-tech-soft); }
.card--bean .art { background: var(--ml-brushed), rgb(255 143 168 / 0.14); }

h4 {
  margin: 10px 12px 4px;
  font-family: var(--ml-font-display);
  font-size: var(--ml-text-sm);
}

p {
  margin: 0 12px 10px;
  color: var(--ml-text-muted);
  font-size: var(--ml-text-xs);
  line-height: 1.6;
}
</style>
