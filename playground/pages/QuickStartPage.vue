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
    title: '按需載入（建議，網站更輕）',
    desc: '搭配 unplugin-vue-components：模板裡用到哪個元件，才匯入那個元件與它需要的樣式，不必 app.use、也不必引入整份 style.css。',
    filename: 'vite.config.ts',
    lang: 'ts',
    code: `import vue from '@vitejs/plugin-vue'
import Components from 'unplugin-vue-components/vite'
import { MalilionResolver } from '@malilion/ui/resolver'

export default defineConfig({
  plugins: [vue(), Components({ resolvers: [MalilionResolver()] })],
})`,
  },
  {
    title: 'Nuxt 專案',
    desc: '加上模組就好：所有元件與 useToast / useConfirm / useActionSheet 自動匯入，指令自動註冊，預設只載入每頁用到的元件樣式。全部元件都通過伺服器端渲染與水合測試。',
    filename: 'nuxt.config.ts',
    lang: 'ts',
    code: `export default defineNuxtConfig({
  modules: ['@malilion/ui/nuxt'],
  // 選用：locale: 'en'、css: 'on-demand' | 'full' | false、prefix
  malilion: { locale: 'zhTW' },
})`,
  },
  {
    title: '手動按需引入樣式',
    desc: '不用自動匯入的話，每個元件各引入一次它的樣式入口。入口會一起帶上字體、色彩變數，以及它內部用到的子元件樣式；同一個樣式檔只會載入一次。',
    filename: 'main.ts',
    lang: 'ts',
    code: `import '@malilion/ui/on-demand/MlButton'
import '@malilion/ui/on-demand/MlCombobox'
import { MlButton, MlCombobox } from '@malilion/ui'`,
  },
  {
    title: '載入中文字體（選用）',
    desc: '碼力獅品牌字型（Malilion Display / Sans / Mono）已內建在 style.css。中文會用系統字體，想要各平台一致可再加 Noto Sans TC。',
    filename: 'index.html',
    lang: 'html',
    code: `<link
  href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700&display=swap"
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
    title: '在 React / Next.js 使用',
    desc: '@malilion/ui/react 提供全部 146 個元件的 React 版，HTML 結構與 Vue 版一致、共用同一份樣式；Next.js App Router 的 Server Component 可以直接使用。左側「React 與 Next.js」頁面有即時示範。',
    filename: 'page.tsx',
    lang: 'tsx',
    code: `import '@malilion/ui/style.css'
import { Button, Card, ToastHost, toast } from '@malilion/ui/react'

export default function Page() {
  return (
    <>
      <Card eyebrow="Pride / 01" title="獅群儀表板">
        <Button stamp onClick={() => toast('嗷嗚～')}>部署</Button>
      </Card>
      <ToastHost />
    </>
  )
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
