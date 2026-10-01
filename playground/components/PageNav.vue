<script setup lang="ts">
import { computed } from 'vue'
import { href } from '../router'
import { groups, pages } from '../registry'

const props = defineProps<{ id: string }>()

// Same order as the sidebar: group by group.
const ordered = groups.flatMap((group) => pages.filter((page) => page.group === group.id))
const index = computed(() => ordered.findIndex((page) => page.id === props.id))
const prev = computed(() => ordered[index.value - 1])
const next = computed(() => ordered[index.value + 1])
</script>

<template>
  <nav class="page-nav" aria-label="上一頁 / 下一頁">
    <a v-if="prev" :href="href(prev.id)" class="page-nav__link">
      <span class="ml-hud-label">← 上一頁</span>
      <span class="page-nav__title">{{ prev.title }} <small>{{ prev.zh }}</small></span>
    </a>
    <span v-else />
    <a v-if="next" :href="href(next.id)" class="page-nav__link page-nav__link--next">
      <span class="ml-hud-label">下一頁 →</span>
      <span class="page-nav__title">{{ next.title }} <small>{{ next.zh }}</small></span>
    </a>
  </nav>
</template>

<style scoped>
.page-nav {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-top: 64px;
  padding-top: 24px;
  border-top: 1px dashed var(--ml-line);
}

.page-nav__link {
  display: grid;
  gap: 4px;
  padding: 14px 18px;
  color: inherit;
  text-decoration: none;
  box-shadow: inset 0 0 0 1px var(--ml-line);
  transition: box-shadow var(--ml-dur) var(--ml-ease), background var(--ml-dur) var(--ml-ease);
}

.page-nav__link:hover {
  background: var(--ml-accent-soft);
  box-shadow: inset 0 0 0 1px var(--ml-line-strong);
}

.page-nav__link:focus-visible {
  outline: 2px solid var(--ml-focus);
  outline-offset: 2px;
}

.page-nav__link--next {
  text-align: right;
}

.page-nav__title {
  font-family: var(--ml-font-display);
  font-weight: 700;
  color: var(--ml-accent-text);
}

.page-nav__title small {
  color: var(--ml-text-dim);
  font-family: var(--ml-font-body);
  font-weight: 400;
}
</style>
