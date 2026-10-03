<script setup lang="ts">
const cubs = Array.from({ length: 16 }, (_, i) => ({ id: i + 1, name: `小獅 ${i + 1} 號`, roar: 40 + ((i * 37) % 60) }))
</script>

<template>
  <MlScrollbar always direction="horizontal" class="strip">
    <div class="row">
      <div v-for="c in cubs" :key="c.id" class="cub">
        <MlAvatar :name="c.name" size="sm" />
        <strong>{{ c.name }}</strong>
        <MlProgress :value="c.roar" size="sm" :show-value="false" />
      </div>
    </div>
  </MlScrollbar>
</template>

<style scoped>
.strip {
  width: 100%;
  border-radius: var(--ml-radius);
  background: var(--ml-surface-2);
  box-shadow: inset 0 0 0 1px var(--ml-line-steel);
}

.row {
  display: flex;
  gap: 12px;
  width: max-content;
  padding: 14px 14px 22px;
}

.cub {
  display: grid;
  justify-items: start;
  gap: 8px;
  width: 132px;
  padding: 12px;
  border-radius: var(--ml-radius);
  background: var(--ml-surface);
  box-shadow: inset 0 0 0 1px var(--ml-line);
  font-size: var(--ml-text-sm);
}

.cub :deep(.ml-progress) {
  width: 100%;
}
</style>
