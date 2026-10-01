<script setup lang="ts">
import { ref } from 'vue'

defineProps<{
  id: string
  index: string
  title: string
  subtitle: string
  code?: string
}>()

const showCode = ref(false)
const openLabel = '</> 程式碼'
</script>

<template>
  <section :id="id" class="demo-section">
    <header class="demo-section__head">
      <div>
        <p class="demo-section__index">{{ index }} //</p>
        <h2 class="demo-section__title">{{ title }}</h2>
        <p class="demo-section__subtitle">{{ subtitle }}</p>
      </div>
      <MlButton v-if="code" variant="ghost" size="sm" :aria-expanded="showCode" @click="showCode = !showCode">
        {{ showCode ? '收起程式碼' : openLabel }}
      </MlButton>
    </header>
    <pre v-if="code && showCode" class="demo-code"><code>{{ code.trim() }}</code></pre>
    <slot />
  </section>
</template>

<style scoped>
.demo-section {
  scroll-margin-top: 88px;
  padding: 56px 0 8px;
}

.demo-section__head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 24px;
}

.demo-section__index {
  margin: 0 0 4px;
  font-family: var(--ml-font-mono);
  font-size: var(--ml-text-xs);
  letter-spacing: var(--ml-tracking-hud);
  color: var(--ml-accent-text);
}

.demo-section__title {
  margin: 0;
  font-family: var(--ml-font-display);
  font-size: var(--ml-text-2xl);
  font-weight: 700;
  letter-spacing: 0.02em;
}

.demo-section__subtitle {
  margin: 4px 0 0;
  color: var(--ml-text-muted);
  font-size: var(--ml-text-sm);
}

.demo-code {
  margin: 0 0 24px;
  padding: 16px 18px;
  overflow-x: auto;
  background: var(--ml-surface-inset);
  box-shadow: inset 0 0 0 1px var(--ml-line);
  border-left: 2px solid var(--ml-accent);
  color: var(--ml-text);
  font-family: var(--ml-font-mono);
  font-size: 0.8125rem;
  line-height: 1.7;
}
</style>
