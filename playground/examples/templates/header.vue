<script setup lang="ts">
import { ref } from 'vue'

const active = ref('home')
const links = [
  { id: 'home', label: 'Home' },
  { id: 'components', label: 'Components' },
  { id: 'templates', label: 'Templates' },
  { id: 'playground', label: 'Playground' },
]
</script>

<template>
  <header class="appbar">
    <a href="#/home" class="brand">
      <MlMascot :size="34" frame="ring" title="" />
      <span>碼力獅 <b>Malilion UI</b></span>
    </a>
    <nav class="links" aria-label="主要選單">
      <a
        v-for="link in links"
        :key="link.id"
        href="#"
        :aria-current="active === link.id ? 'page' : undefined"
        @click.prevent="active = link.id"
      >
        {{ link.label }}
      </a>
    </nav>
    <MlInput placeholder="Search components..." size="sm" aria-label="搜尋" class="search">
      <template #prefix>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="6.5" /><path d="M16 16l5 5" /></svg>
      </template>
      <template #suffix><MlKbd>⌘K</MlKbd></template>
    </MlInput>
    <MlAvatar lion size="sm" status="online" />
    <MlButton size="sm" stamp>Get Started →</MlButton>
  </header>
</template>

<style scoped>
.appbar {
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 10px 16px;
  background: var(--ml-brushed), var(--ml-surface);
  box-shadow: inset 0 0 0 1px var(--ml-line), inset 0 -2px 0 rgb(240 173 47 / 0.25);
  clip-path: polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px);
  flex-wrap: wrap;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--ml-text);
  font-weight: 600;
  text-decoration: none;
}

.brand b {
  color: var(--ml-accent-text);
}

.links {
  display: flex;
  gap: 4px;
  flex: 1;
}

.links a {
  padding: 6px 10px;
  color: var(--ml-text-muted);
  font-size: 14px;
  text-decoration: none;
}

.links a:hover {
  color: var(--ml-text);
}

.links a[aria-current='page'] {
  color: var(--ml-accent-text);
  box-shadow: inset 0 -2px 0 var(--ml-accent);
}

.search {
  width: 240px;
}
</style>
