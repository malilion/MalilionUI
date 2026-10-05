<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import DocSidebar from './components/DocSidebar.vue'
import PageNav from './components/PageNav.vue'
import ComponentPage from './pages/ComponentPage.vue'
import HomePage from './pages/HomePage.vue'
import QuickStartPage from './pages/QuickStartPage.vue'
import TokensPage from './pages/TokensPage.vue'
import ReactPage from './pages/ReactPage.vue'
import { route } from './router'
import { framework } from './framework'
import { groups, pageById } from './registry'

const page = computed(() => pageById.get(route.value) ?? pageById.get('home')!)
const group = computed(() => groups.find((g) => g.id === page.value.group))

const frameworks = [
  { label: 'Vue', value: 'vue' },
  { label: 'React', value: 'react' },
]

/* Mobile drawer */
const drawer = ref(false)
watch(route, () => (drawer.value = false))

/* Theme: <MlThemeToggle> + the shared store (main.ts sets the 'ml-docs-theme' key). */

watch(
  page,
  (current) => {
    document.title = current.id === 'home' ? 'MalilionUI · 碼力獅元件庫' : `${current.title} ${current.zh} · MalilionUI`
  },
  { immediate: true },
)
</script>

<template>
  <div class="layout">
    <DocSidebar :open="drawer" @close="drawer = false" />
    <div v-if="drawer" class="scrim" @click="drawer = false" />

    <div class="main">
      <header class="topbar">
        <button type="button" class="menu-btn" aria-label="開啟選單" @click="drawer = true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 7h16M4 12h16M4 17h10" />
          </svg>
        </button>
        <p class="crumbs">
          <span>{{ group?.label }}</span>
          <MlPaw tone="current" class="crumbs__sep" />
          <strong>{{ page.title }}</strong>
          <span class="crumbs__zh">{{ page.zh }}</span>
        </p>
        <MlSegmented v-model="framework" :options="frameworks" size="sm" label="程式碼框架" class="framework-switch" />
        <MlThemeToggle label="日光模式" class="theme-switch" />
      </header>

      <main class="content">
        <HomePage v-if="page.id === 'home'" />
        <QuickStartPage v-else-if="page.id === 'start'" />
        <TokensPage v-else-if="page.id === 'tokens'" />
        <ReactPage v-else-if="page.id === 'react'" />
        <ComponentPage v-else :key="page.id" :page="page" />
        <PageNav :id="page.id" />
      </main>
    </div>
  </div>
  <MlToastHost placement="bottom-right" />
</template>

<style>
html {
  scroll-padding-top: 72px;
}

body {
  margin: 0;
}

.layout {
  min-height: 100vh;
}

.main {
  min-width: 0;
  padding-left: 272px;
}

.topbar {
  position: sticky;
  top: 0;
  z-index: 40;
  display: flex;
  align-items: center;
  gap: 16px;
  height: 60px;
  padding: 0 40px;
  background: color-mix(in srgb, var(--ml-bg) 84%, transparent);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  box-shadow: inset 0 -1px 0 var(--ml-line);
}

.menu-btn {
  display: none;
  width: 38px;
  height: 38px;
  padding: 0;
  border: 0;
  background: none;
  color: var(--ml-text);
  cursor: pointer;
}

.menu-btn svg {
  width: 22px;
  height: 22px;
}

.menu-btn:focus-visible {
  outline: 2px solid var(--ml-focus);
}

.crumbs {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  margin: 0;
  color: var(--ml-text-dim);
  font-family: var(--ml-font-mono);
  font-size: var(--ml-text-xs);
  letter-spacing: 0.06em;
  white-space: nowrap;
}

.crumbs strong {
  color: var(--ml-text);
  font-weight: 600;
}

.crumbs__sep {
  width: 11px;
  height: 11px;
  color: var(--ml-accent);
  rotate: 90deg;
}

.crumbs__zh {
  overflow: hidden;
  text-overflow: ellipsis;
}

.framework-switch {
  flex: none;
  margin-left: auto;
}

.theme-switch {
  flex: none;
  font-size: var(--ml-text-xs);
}

.content {
  max-width: 1040px;
  margin: 0 auto;
  padding: 40px 40px 72px;
}

.scrim {
  position: fixed;
  inset: 0;
  z-index: 55;
  background: var(--ml-backdrop);
}

@media (max-width: 1023px) {
  .main {
    padding-left: 0;
  }

  .menu-btn {
    display: grid;
    place-items: center;
    margin-left: -8px;
  }

  .topbar {
    padding: 0 20px;
  }

  .content {
    padding: 28px 20px 56px;
  }
}

@media (max-width: 520px) {
  .topbar {
    gap: 10px;
    padding: 0 16px;
  }

  .content {
    padding: 24px 16px 48px;
  }

  .crumbs__zh {
    display: none;
  }

  .theme-switch .ml-theme-toggle__label {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
  }
}
</style>
