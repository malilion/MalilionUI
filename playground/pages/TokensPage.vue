<script setup lang="ts">
import CodeBlock from '../components/CodeBlock.vue'
import PageHeader from '../components/PageHeader.vue'

const scales = [
  { name: 'Lion Gold', prefix: 'gold', steps: [100, 200, 300, 400, 500, 600, 700, 800] },
  { name: 'Titanium', prefix: 'steel', steps: [100, 200, 300, 400, 500, 600, 700, 800, 900] },
  { name: 'Circuit Cyan', prefix: 'cyan', steps: [200, 300, 400, 500, 600, 700] },
  { name: 'Mane Bronze', prefix: 'bronze', steps: [300, 400, 500, 600] },
  { name: 'Toe Bean 肉球粉', prefix: 'bean', steps: [200, 300, 400, 500, 600] },
]
const metals = ['gold', 'steel', 'bronze', 'cyan', 'bean', 'red', 'green', 'gunmetal']

const override = `/* 覆寫語意代幣，就能換掉整套元件的顏色 */
:root {
  --ml-accent: #ffb347;        /* 主色 */
  --ml-focus: #7af6e2;         /* 焦點框 */
  --ml-cut: 12px;              /* 切角大小 */
  --ml-font-display: 'Orbitron', sans-serif;
}

/* 淺色主題下另外微調 */
[data-ml-theme='light'] {
  --ml-accent: #c27a0a;
}`
</script>

<template>
  <article>
    <PageHeader
      eyebrow="Getting started / 開始"
      title="Design tokens"
      zh="設計代幣"
      desc="色票、金屬漸層、字體與動態曲線，全部以 --ml-* CSS 變數提供。元件只讀語意代幣，所以換主題就是換一組值。"
    />

    <section class="block">
      <h2>色票</h2>
      <div class="scales">
        <div v-for="scale in scales" :key="scale.prefix">
          <p class="ml-hud-label">{{ scale.name }}</p>
          <div class="scale__row">
            <div
              v-for="step in scale.steps"
              :key="step"
              class="swatch"
              :style="{ background: `var(--ml-${scale.prefix}-${step})` }"
              :title="`--ml-${scale.prefix}-${step}`"
            >
              <span :class="['swatch__label', { 'swatch__label--light': step >= 500 }]">{{ step }}</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="block">
      <h2>金屬漸層</h2>
      <div class="metals">
        <div v-for="metal in metals" :key="metal">
          <div class="metal__plate" :style="{ background: `var(--ml-metal-${metal})` }" />
          <code class="metal__name">--ml-metal-{{ metal }}</code>
        </div>
      </div>
    </section>

    <section class="block">
      <h2>字體</h2>
      <div class="type">
        <div>
          <p class="ml-hud-label">Display · Chakra Petch</p>
          <p class="type__display">ROAR OF CODE 獅吼</p>
        </div>
        <div>
          <p class="ml-hud-label">Body · IBM Plex Sans / Noto Sans TC</p>
          <p class="type__body">每一行程式碼，都是獅群的一次狩獵。</p>
        </div>
        <div>
          <p class="ml-hud-label">Mono · JetBrains Mono</p>
          <p class="type__mono">const pride = await lion.roar()</p>
        </div>
        <div>
          <p class="ml-hud-label">Paw · Malilion Paw</p>
          <p class="type__paw ml-font-paw">Hi! I'm Malilion :) jiji… &#xE000;</p>
        </div>
      </div>
    </section>

    <section class="block">
      <h2>客製化</h2>
      <CodeBlock :code="override" filename="theme.css" lang="css" />
    </section>
  </article>
</template>

<style scoped>
.block {
  margin-top: 44px;
}

.block h2 {
  margin: 0 0 16px;
  font-family: var(--ml-font-display);
  font-size: var(--ml-text-xl);
}

.scales {
  display: grid;
  gap: 16px;
}

.scales .ml-hud-label,
.type .ml-hud-label {
  margin: 0 0 8px;
}

.scale__row {
  display: flex;
  overflow: hidden;
  clip-path: polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px);
}

.swatch {
  display: flex;
  align-items: flex-end;
  flex: 1;
  height: 54px;
  padding: 6px 8px;
}

.swatch__label {
  color: rgb(0 0 0 / 0.7);
  font-family: var(--ml-font-mono);
  font-size: 0.6875rem;
}

.swatch__label--light {
  color: rgb(255 255 255 / 0.85);
}

.metals {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 14px;
}

.metal__plate {
  height: 72px;
  clip-path: polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px);
}

.metal__name {
  display: block;
  margin-top: 8px;
  color: var(--ml-text-dim);
  font-family: var(--ml-font-mono);
  font-size: 0.6875rem;
}

.type {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 20px;
}

.type p:not(.ml-hud-label) {
  margin: 0;
}

.type__display {
  font-family: var(--ml-font-display);
  font-size: 1.6rem;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.type__paw {
  color: var(--ml-accent-text);
  font-size: 1.6rem;
}

.type__body {
  font-size: 1.05rem;
}

.type__mono {
  color: var(--ml-tech-text);
  font-family: var(--ml-font-mono);
}
</style>
