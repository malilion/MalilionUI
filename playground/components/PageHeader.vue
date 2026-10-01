<script setup lang="ts">
defineProps<{
  eyebrow: string
  title: string
  zh?: string
  desc?: string
  isNew?: boolean
}>()
</script>

<template>
  <header class="page-head">
    <p class="page-head__eyebrow">{{ eyebrow }}</p>
    <h1 class="page-head__title">
      {{ title }}
      <span v-if="zh" class="page-head__zh">{{ zh }}</span>
      <MlBadge v-if="isNew" tone="bean" paw size="lg">New</MlBadge>
    </h1>
    <p v-if="desc" class="page-head__desc">{{ desc }}</p>
    <slot />
  </header>
</template>

<style scoped>
.page-head__eyebrow {
  margin: 0 0 8px;
  color: var(--ml-accent-text);
  font-family: var(--ml-font-mono);
  font-size: var(--ml-text-xs);
  letter-spacing: var(--ml-tracking-hud);
  text-transform: uppercase;
}

.page-head__title {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px 14px;
  margin: 0;
  font-family: var(--ml-font-display);
  font-size: clamp(2rem, 4vw, 2.75rem);
  font-weight: 700;
  line-height: 1.15;
  letter-spacing: 0.02em;
}

.page-head__zh {
  color: var(--ml-text-muted);
  font-size: 0.6em;
  font-weight: 600;
}

.page-head__desc {
  max-width: 46em;
  margin: 14px 0 0;
  color: var(--ml-text-muted);
  font-size: var(--ml-text-md);
  line-height: 1.8;
}

.page-head :deep(.code-block) {
  margin-top: 22px;
}
</style>
