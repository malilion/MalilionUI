<script setup lang="ts">
import CodeBlock from '../components/CodeBlock.vue'
import PageHeader from '../components/PageHeader.vue'

const steps = [
  {
    title: '安裝',
    filename: 'terminal',
    lang: 'bash',
    code: `npm i @malilion/ui`,
  },
  {
    title: '註冊元件並引入樣式',
    desc: 'app.use 會全域註冊所有元件與 v-paw-stamp。也可以只 import 需要的元件。',
    filename: 'main.ts',
    lang: 'ts',
    code: `import { createApp } from 'vue'
import MalilionUI from '@malilion/ui'
import '@malilion/ui/style.css'
import App from './App.vue'

createApp(App).use(MalilionUI).mount('#app')`,
  },
  {
    title: '載入字體（建議）',
    desc: '找不到時會退回系統字體，但 Chakra Petch 才有那股機甲味。',
    filename: 'index.html',
    lang: 'html',
    code: `<link
  href="https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@500;600;700&family=IBM+Plex+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;600&family=Noto+Sans+TC:wght@400;500;700&display=swap"
  rel="stylesheet"
/>`,
  },
  {
    title: '放好通知容器與整頁背景',
    desc: '要用 toast() 的話，在 App.vue 放一個 <MlToastHost />。body 加上 ml-app 會套用獅金光暈與網格背景（選用）。',
    filename: 'App.vue',
    lang: 'vue',
    code: `<template>
  <RouterView />
  <MlToastHost />
</template>`,
  },
  {
    title: '切換主題',
    desc: '預設是深色 Night Pride。在任何祖先元素設定 data-ml-theme 就能切換，也能只套用在局部。',
    filename: 'index.html',
    lang: 'html',
    code: `<html data-ml-theme="light">
  <body class="ml-app">…</body>
</html>`,
  },
  {
    title: '在 React / 原生網頁使用',
    desc: '所有外觀都在 .ml-* class 與 --ml-* 變數裡，只引入 CSS 也能用。',
    filename: 'DeployButton.tsx',
    lang: 'tsx',
    code: `import '@malilion/ui/style.css'

export function DeployButton() {
  return <button className="ml-btn ml-btn--primary ml-btn--md">部署</button>
}`,
  },
]
</script>

<template>
  <article>
    <PageHeader
      eyebrow="Getting started / 開始"
      title="Quick start"
      zh="快速開始"
      desc="五分鐘讓你的專案穿上獅子盔甲。每段程式碼右上角都可以直接複製。"
    />
    <ol class="steps">
      <li v-for="(step, i) in steps" :key="step.title" class="step">
        <div class="step__marker" aria-hidden="true">
          <MlPaw tone="current" />
          <span>{{ String(i + 1).padStart(2, '0') }}</span>
        </div>
        <div class="step__body">
          <h2 class="step__title">{{ step.title }}</h2>
          <p v-if="step.desc" class="step__desc">{{ step.desc }}</p>
          <CodeBlock :code="step.code" :filename="step.filename" :lang="step.lang" />
        </div>
      </li>
    </ol>
  </article>
</template>

<style scoped>
.steps {
  margin: 40px 0 0;
  padding: 0;
  list-style: none;
}

.step {
  position: relative;
  display: grid;
  grid-template-columns: 56px minmax(0, 1fr);
  gap: 12px;
  padding-bottom: 36px;
}

/* Dashed trail joining the steps */
.step:not(:last-child)::before {
  content: '';
  position: absolute;
  top: 48px;
  bottom: 6px;
  left: 21px;
  border-left: 2px dotted var(--ml-line-strong);
}

.step__marker {
  display: grid;
  justify-items: center;
  gap: 2px;
  width: 44px;
  color: var(--ml-accent);
  font-family: var(--ml-font-mono);
  font-size: var(--ml-text-xs);
}

.step__marker .ml-paw {
  width: 26px;
  height: 26px;
  filter: drop-shadow(0 0 6px rgb(240 173 47 / 0.45));
}

.step__title {
  margin: 2px 0 6px;
  font-family: var(--ml-font-display);
  font-size: var(--ml-text-lg);
}

.step__desc {
  margin: 0 0 12px;
  color: var(--ml-text-muted);
  font-size: var(--ml-text-sm);
}
</style>
