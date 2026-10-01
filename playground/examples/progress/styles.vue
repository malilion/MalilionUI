<template>
  <div class="stack">
    <MlProgress :value="55" label="Striped" striped />
    <MlProgress :value="55" label="Smooth" tone="success" smooth />
    <MlProgress label="同步獅群資料" tone="tech" />
    <MlProgress :value="80" size="sm" label="Small" />
    <MlProgress :value="80" size="lg" label="Large" />
  </div>
</template>

<style scoped>
.stack {
  display: grid;
  gap: 18px;
}
</style>
