<template>
  <div class="stack">
    <MlProgress :value="64" label="Mane Reactor" />
    <MlProgress :value="72" label="CPU" tone="tech" />
    <MlProgress :value="38" label="記憶體" tone="success" />
    <MlProgress :value="91" label="磁碟" tone="danger" />
  </div>
</template>

<style scoped>
.stack {
  display: grid;
  gap: 18px;
}
</style>
