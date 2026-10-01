<template>
  <div class="grid">
    <MlCard v-for="card in cards" :key="card.label" class="stat">
      <span class="ml-hud-label">{{ card.label }}</span>
      <div class="row">
        <strong>{{ card.value }}</strong>
        <MlSparkline :data="card.data" :tone="card.tone" :width="110" />
      </div>
      <span :class="['delta', { down: card.delta < 0 }]">{{ card.delta > 0 ? '▲' : '▼' }} {{ Math.abs(card.delta) }}%</span>
    </MlCard>
  </div>
</template>

<script setup lang="ts">
const cards = [
  { label: 'Total Users', value: '24,532', delta: 12.6, tone: 'gold' as const, data: [8, 9, 7, 11, 10, 14, 13, 17, 16, 21] },
  { label: 'Revenue', value: 'NT$ 1.28M', delta: 18.4, tone: 'tech' as const, data: [3, 5, 4, 6, 8, 7, 9, 12, 11, 14] },
  { label: 'Bounce', value: '31%', delta: -4.2, tone: 'bean' as const, data: [12, 11, 13, 10, 9, 10, 8, 7, 8, 6] },
]
</script>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}

.row {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 10px;
  margin: 6px 0;
}

strong {
  font-family: var(--ml-font-display);
  font-size: 1.6rem;
}

.delta {
  color: var(--ml-success-text);
  font-family: var(--ml-font-mono);
  font-size: 12px;
}

.delta.down {
  color: var(--ml-danger-text);
}
</style>
