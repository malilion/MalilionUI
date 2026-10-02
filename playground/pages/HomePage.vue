<script setup lang="ts">
import { computed } from 'vue'
import CodeBlock from '../components/CodeBlock.vue'
import { href } from '../router'
import { groups, pages } from '../registry'

const catalog = computed(() =>
  groups
    .filter((group) => group.id !== 'start')
    .map((group) => ({ ...group, pages: pages.filter((page) => page.group === group.id) })),
)

const fresh = pages.filter((page) => page.isNew)
</script>

<template>
  <div class="home">
    <section class="hero">
      <div class="hero__copy">
        <p class="ml-hud-label hero__kicker">碼力獅 Design System · Vue 3</p>
        <h1 class="hero__title">
          <span class="ml-metal-text">MALILION</span>
          <span class="ml-metal-text ml-metal-text--steel">UI</span>
        </h1>
        <p class="hero__lead">
          以<strong>獅子</strong>為魂、<strong>科技</strong>為骨、<strong>金屬</strong>為甲，
          再踩上一串<strong class="bean">可愛的肉球腳印</strong>。
          切角機甲板、拋光獅金、鈦合金與電路青光——碼力獅專屬的元件庫。
        </p>
        <div class="hero__actions">
          <MlButton size="lg" :href="href('start')" stamp>快速開始</MlButton>
          <MlButton size="lg" variant="outline" :href="href('button')" stamp="bean">瀏覽元件</MlButton>
        </div>
        <CodeBlock code="npm i @malilion/ui" lang="bash" filename="terminal" class="hero__install" />
      </div>
      <div class="hero__emblem">
        <div class="hero__halo" aria-hidden="true" />
        <span class="hero__trail" aria-hidden="true">
          <MlPaw v-for="n in 5" :key="n" tone="current" />
        </span>
        <MlMascot pose="full" :size="290" glow title="碼力獅" class="hero__lion" />
      </div>
    </section>

    <div class="stats">
      <MlStat label="Components" :value="48" caption="Vue 3 · TypeScript" />
      <MlStat label="Themes" :value="2" caption="Night Pride / Daylight" />
      <MlStat label="Runtime deps" :value="0" caption="Peer：Vue 3.5+" />
      <MlStat label="Paw prints" value="∞" caption="可愛無上限" />
    </div>

    <section class="block">
      <h2 class="block__title"><MlPaw tone="bean" /> 新加入的成員</h2>
      <div class="fresh">
        <a v-for="page in fresh" :key="page.id" :href="href(page.id)" class="fresh__card">
          <MlCard variant="gold" :eyebrow="page.zh" :title="page.title" interactive tag="div">
            {{ page.desc }}
          </MlCard>
        </a>
      </div>
    </section>

    <section class="block">
      <h2 class="block__title"><MlPaw /> 所有元件</h2>
      <div class="catalog">
        <div v-for="group in catalog" :key="group.id" class="catalog__group">
          <p class="ml-hud-label">{{ group.en }} / {{ group.label }}</p>
          <ul>
            <li v-for="page in group.pages" :key="page.id">
              <a :href="href(page.id)">
                {{ page.title }} <span>{{ page.zh }}</span>
                <MlBadge v-if="page.isNew" tone="bean">New</MlBadge>
              </a>
            </li>
          </ul>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.hero {
  display: grid;
  grid-template-columns: 1.15fr 1fr;
  align-items: center;
  gap: 40px;
  padding: 24px 0 32px;
}

.hero__kicker {
  margin: 0 0 16px;
  color: var(--ml-accent-text);
}

.hero__title {
  display: flex;
  flex-wrap: wrap;
  gap: 0 18px;
  margin: 0;
  font-family: var(--ml-font-display);
  font-size: clamp(2.6rem, 5.2vw, 4.6rem);
  font-weight: 700;
  line-height: 0.95;
  letter-spacing: 0.04em;
}

.hero__lead {
  max-width: 34em;
  margin: 24px 0 30px;
  color: var(--ml-text-muted);
  font-size: var(--ml-text-lg);
  line-height: 1.85;
}

.hero__lead strong {
  color: var(--ml-accent-text);
  font-weight: 600;
}

.hero__lead strong.bean {
  color: var(--tok-keyword);
}

.hero__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
}

.hero__install {
  max-width: 420px;
  margin-top: 26px;
}

.hero__emblem {
  position: relative;
  display: grid;
  place-items: center;
  min-height: 340px;
}

.hero__lion {
  position: relative;
  z-index: 1;
  animation: hero-float 5s var(--ml-ease) infinite;
}

@keyframes hero-float {
  0%, 100% { translate: 0 0; }
  50% { translate: 0 -8px; }
}

.hero__halo {
  position: absolute;
  width: 340px;
  height: 340px;
  border-radius: 50%;
  border: 1px solid var(--ml-line);
  animation: ml-spin 30s linear infinite;
}

.hero__halo::before,
.hero__halo::after {
  content: '';
  position: absolute;
  border-radius: 50%;
  border: 2px solid transparent;
}

.hero__halo::before {
  inset: -1px;
  border-top-color: var(--ml-accent);
  border-right-color: rgb(240 173 47 / 0.25);
  filter: drop-shadow(0 0 6px rgb(240 173 47 / 0.7));
}

.hero__halo::after {
  inset: 22px;
  border-width: 1px;
  border-bottom-color: var(--ml-tech);
  border-left-color: rgb(62 238 208 / 0.25);
  animation: ml-spin 12s linear infinite reverse;
}

/* Little paw prints walking up to the lion */
.hero__trail {
  position: absolute;
  left: 0;
  bottom: 6px;
  display: flex;
  gap: 10px;
  color: var(--ml-bean-400);
  rotate: -18deg;
}

.hero__trail .ml-paw {
  width: 18px;
  height: 18px;
  rotate: 90deg;
  opacity: 0;
  animation: ml-paw-step 3s var(--ml-ease) infinite;
}

.hero__trail .ml-paw:nth-child(odd) { translate: 0 -6px; }
.hero__trail .ml-paw:nth-child(even) { translate: 0 6px; }
.hero__trail .ml-paw:nth-child(2) { animation-delay: 0.3s; }
.hero__trail .ml-paw:nth-child(3) { animation-delay: 0.6s; }
.hero__trail .ml-paw:nth-child(4) { animation-delay: 0.9s; }
.hero__trail .ml-paw:nth-child(5) { animation-delay: 1.2s; }

.stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.block {
  margin-top: 56px;
}

.block__title {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0 0 20px;
  font-family: var(--ml-font-display);
  font-size: var(--ml-text-2xl);
}

.fresh {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 20px;
}

.fresh__card {
  display: flex;
  color: inherit;
  text-decoration: none;
}

.fresh__card :deep(.ml-card) {
  flex: 1;
}

.fresh__card:focus-visible {
  outline: 2px solid var(--ml-focus);
  outline-offset: 4px;
}

.catalog {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 24px;
}

.catalog__group .ml-hud-label {
  margin: 0 0 10px;
  color: var(--ml-accent-text);
}

.catalog ul {
  display: grid;
  gap: 2px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.catalog a {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
  color: var(--ml-text);
  font-size: var(--ml-text-sm);
  text-decoration: none;
}

.catalog a span {
  color: var(--ml-text-dim);
}

.catalog a:hover {
  color: var(--ml-accent-text);
}

@media (max-width: 1100px) {
  .hero {
    grid-template-columns: 1fr;
  }

  .hero__emblem {
    order: -1;
    min-height: 260px;
  }

  .hero__emblem .ml-mascot {
    --_size: 210px !important;
  }

  .hero__halo {
    width: 250px;
    height: 250px;
  }

  .stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 520px) {
  .stats {
    grid-template-columns: 1fr;
  }
}
</style>
