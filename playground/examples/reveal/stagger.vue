<template>
  <MlReveal :stagger="90" effect="zoom" class="grid">
    <MlCard v-for="n in 6" :key="n" :eyebrow="`0${n}`" title="依序出場" />
  </MlReveal>
</template>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 14px;
}
</style>
