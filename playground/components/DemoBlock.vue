<script setup lang="ts">
import type { Component } from 'vue'
import CodeBlock from './CodeBlock.vue'

defineProps<{
  title: string
  desc?: string
  file: string
  component: Component
  source: string
  /** Full-width stage instead of a wrapping row. */
  block?: boolean
}>()
</script>

<template>
  <section class="demo">
    <header class="demo__head">
      <h3 class="demo__title">{{ title }}</h3>
      <p v-if="desc" class="demo__desc">{{ desc }}</p>
    </header>
    <div :class="['demo__stage', { 'demo__stage--block': block }]">
      <component :is="component" />
    </div>
    <CodeBlock :code="source" :filename="`${file}.vue`" collapsible />
  </section>
</template>

<style scoped>
.demo {
  margin-top: 36px;
}

.demo__head {
  margin-bottom: 14px;
}

.demo__title {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
  font-family: var(--ml-font-display);
  font-size: var(--ml-text-lg);
  font-weight: 700;
}

.demo__title::before {
  content: '';
  width: 10px;
  height: 10px;
  background: var(--ml-metal-gold);
  clip-path: polygon(30% 0, 100% 0, 100% 70%, 70% 100%, 0 100%, 0 30%);
}

.demo__desc {
  margin: 6px 0 0;
  color: var(--ml-text-muted);
  font-size: var(--ml-text-sm);
}

.demo__stage {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 14px;
  padding: 28px 24px;
  background: var(--ml-brushed), var(--ml-surface);
  box-shadow: inset 0 0 0 1px var(--ml-line);
  border-bottom: 0;
}

.demo__stage--block {
  display: block;
}
</style>
