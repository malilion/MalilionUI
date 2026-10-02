<script setup lang="ts">
import { computed, ref } from 'vue'
import { href, route } from '../router'
import { groups, pages } from '../registry'
import { version } from '../../package.json'

defineProps<{ open: boolean }>()
defineEmits<{ close: [] }>()

const query = ref('')
// "0.5.0" → "v0.5", straight from package.json so a release never leaves it stale.
const shortVersion = `v${version.split('.').slice(0, 2).join('.')}`

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  return groups
    .map((group) => ({
      ...group,
      pages: pages.filter(
        (page) =>
          page.group === group.id &&
          (!q || page.title.toLowerCase().includes(q) || page.zh.includes(q) || page.id.includes(q)),
      ),
    }))
    .filter((group) => group.pages.length)
})

const componentCount = pages.filter((page) => page.group !== 'start').length
</script>

<template>
  <aside :class="['sidebar', { 'sidebar--open': open }]" aria-label="文件選單">
    <div class="sidebar__head">
      <a :href="href('home')" class="sidebar__brand">
        <MlMascot :size="38" frame="ring" title="" />
        <span class="sidebar__name">MALILION<b>UI</b></span>
        <MlBadge tone="steel">{{ shortVersion }}</MlBadge>
      </a>
      <button type="button" class="sidebar__close" aria-label="關閉選單" @click="$emit('close')">
        <MlIcon name="close" />
      </button>
    </div>

    <div class="sidebar__search">
      <MlInput v-model="query" size="sm" placeholder="搜尋元件…" aria-label="搜尋元件" type="search">
        <template #prefix>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="6.5" />
            <path d="M16 16l5 5" />
          </svg>
        </template>
      </MlInput>
    </div>

    <nav class="sidebar__nav">
      <section v-for="group in filtered" :key="group.id" class="sidebar__group">
        <p class="sidebar__group-label">
          {{ group.label }}<span>{{ group.en }}</span>
        </p>
        <ul>
          <li v-for="page in group.pages" :key="page.id">
            <a
              :href="href(page.id)"
              :class="['sidebar__link', { 'sidebar__link--active': route === page.id }]"
              :aria-current="route === page.id ? 'page' : undefined"
            >
              <MlPaw tone="current" class="sidebar__paw" />
              <span class="sidebar__title">{{ page.title }}</span>
              <span class="sidebar__zh">{{ page.zh }}</span>
              <MlBadge v-if="page.isNew" tone="bean" class="sidebar__new">New</MlBadge>
            </a>
          </li>
        </ul>
      </section>
      <p v-if="!filtered.length" class="sidebar__empty">
        <MlPaw tone="current" /> 找不到「{{ query }}」
      </p>
    </nav>

    <footer class="sidebar__foot">
      <MlDivider paw />
      <p>{{ componentCount }} 個頁面 · 碼力獅出品</p>
    </footer>
  </aside>
</template>

<style scoped>
.sidebar {
  position: fixed;
  inset: 0 auto 0 0;
  z-index: 60;
  display: flex;
  flex-direction: column;
  width: 272px;
  background:
    radial-gradient(120% 40% at 0% 0%, rgb(240 173 47 / 0.08), transparent 60%),
    var(--ml-brushed),
    var(--ml-bg-elevated);
  box-shadow: inset -1px 0 0 var(--ml-line);
}

.sidebar__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 18px 14px;
}

.sidebar__brand {
  display: flex;
  align-items: center;
  gap: 10px;
  color: inherit;
  text-decoration: none;
}

.sidebar__name {
  font-family: var(--ml-font-display);
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: 0.14em;
}

.sidebar__name b {
  margin-left: 4px;
  color: var(--ml-accent-text);
}

.sidebar__close {
  display: none;
  width: 32px;
  height: 32px;
  padding: 0;
  border: 0;
  background: none;
  color: var(--ml-text-muted);
  cursor: pointer;
}

.sidebar__close svg {
  width: 18px;
  height: 18px;
}

.sidebar__search {
  padding: 0 18px 10px;
}

.sidebar__nav {
  flex: 1;
  overflow-y: auto;
  padding: 4px 10px 16px;
  scrollbar-width: thin;
  scrollbar-color: var(--ml-line-strong) transparent;
}

.sidebar__group {
  margin-top: 14px;
}

.sidebar__group-label {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin: 0 0 6px;
  padding: 0 10px;
  color: var(--ml-accent-text);
  font-family: var(--ml-font-mono);
  font-size: var(--ml-text-xs);
  letter-spacing: var(--ml-tracking-hud);
}

.sidebar__group-label span {
  color: var(--ml-text-dim);
  font-size: 0.625rem;
  text-transform: uppercase;
}

.sidebar ul {
  margin: 0;
  padding: 0;
  list-style: none;
}

.sidebar__link {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px 7px 12px;
  color: var(--ml-text-muted);
  font-size: var(--ml-text-sm);
  text-decoration: none;
  clip-path: polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px);
  transition: background var(--ml-dur-fast) var(--ml-ease), color var(--ml-dur-fast) var(--ml-ease);
}

.sidebar__link:hover {
  background: var(--ml-accent-soft);
  color: var(--ml-text);
}

.sidebar__link:focus-visible {
  outline: 2px solid var(--ml-focus);
  outline-offset: -2px;
}

.sidebar__paw {
  width: 13px;
  height: 13px;
  flex: none;
  color: var(--ml-accent);
  opacity: 0;
  scale: 0.4;
  rotate: 90deg;
  transition: opacity var(--ml-dur) var(--ml-ease), scale var(--ml-dur-slow) var(--ml-ease-spring);
}

.sidebar__link:hover .sidebar__paw {
  opacity: 0.45;
  scale: 0.8;
}

.sidebar__link--active {
  background: linear-gradient(90deg, rgb(240 173 47 / 0.18), transparent 90%);
  box-shadow: inset 2px 0 0 var(--ml-accent);
  color: var(--ml-accent-text);
}

.sidebar__link--active .sidebar__paw,
.sidebar__link--active:hover .sidebar__paw {
  opacity: 1;
  scale: 1;
  filter: drop-shadow(0 0 4px rgb(240 173 47 / 0.6));
}

.sidebar__title {
  font-weight: 500;
}

.sidebar__zh {
  color: var(--ml-text-dim);
  font-size: var(--ml-text-xs);
}

.sidebar__link--active .sidebar__zh {
  color: inherit;
  opacity: 0.75;
}

.sidebar__new {
  margin-left: auto;
  height: 18px;
  padding: 0 6px;
  font-size: 0.5625rem;
}

.sidebar__empty {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  color: var(--ml-text-dim);
  font-size: var(--ml-text-sm);
}

.sidebar__foot {
  padding: 0 18px 16px;
  color: var(--ml-text-dim);
  font-family: var(--ml-font-mono);
  font-size: 0.6875rem;
  text-align: center;
}

.sidebar__foot .ml-divider {
  margin: 8px 0;
}

.sidebar__foot p {
  margin: 0;
}

@media (max-width: 1023px) {
  /* Off-canvas drawer. Hidden (not just moved) when closed, so its shadow
     doesn't bleed in and its links drop out of the tab order. */
  .sidebar {
    width: min(300px, 86vw);
    translate: -100% 0;
    visibility: hidden;
    transition:
      translate var(--ml-dur-slow) var(--ml-ease-spring),
      visibility 0s linear var(--ml-dur-slow);
    box-shadow: inset -1px 0 0 var(--ml-line), 20px 0 60px rgb(0 0 0 / 0.5);
  }

  .sidebar--open {
    translate: 0 0;
    visibility: visible;
    transition: translate var(--ml-dur-slow) var(--ml-ease-spring), visibility 0s;
  }

  .sidebar__close {
    display: grid;
    place-items: center;
  }
}
</style>
