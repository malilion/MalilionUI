<script setup lang="ts">
import { ref } from 'vue'

const active = ref('')
const sections = [
  { id: 'anchor-intro', label: '簡介', text: '碼力獅是一套以獅子為魂、科技為骨、金屬為甲的元件庫。' },
  { id: 'anchor-install', label: '安裝', text: 'npm i @malilion/ui，然後 app.use(MalilionUI)。' },
  { id: 'anchor-theme', label: '主題', text: '夜間「Night Pride」與日光「Daylight Titanium」兩套主題。' },
  { id: 'anchor-theme-tokens', label: '設計代幣', text: '所有顏色、間距與動態曲線都是 --ml-* CSS 變數。', child: true },
  { id: 'anchor-theme-fonts', label: '品牌字型', text: 'Malilion Display、Sans、Mono，以及可愛的 Malilion Paw。', child: true },
  { id: 'anchor-faq', label: '常見問題', text: 'React 也能用嗎？可以，樣式是純 CSS，class 名稱照著寫就好。' },
]
const items = [
  { id: 'anchor-intro', label: '簡介' },
  { id: 'anchor-install', label: '安裝' },
  {
    id: 'anchor-theme',
    label: '主題',
    children: [
      { id: 'anchor-theme-tokens', label: '設計代幣' },
      { id: 'anchor-theme-fonts', label: '品牌字型' },
    ],
  },
  { id: 'anchor-faq', label: '常見問題' },
]
</script>

<template>
  <div class="layout">
    <div class="doc">
      <section v-for="s in sections" :id="s.id" :key="s.id" :class="{ child: s.child }">
        <h4>{{ s.label }}</h4>
        <p>{{ s.text }}</p>
      </section>
    </div>
    <MlAnchor v-model="active" :items="items" container=".doc" title="本頁目錄" :update-hash="false" class="toc" />
  </div>
</template>

<style scoped>
.layout {
  display: grid;
  grid-template-columns: 1fr 160px;
  gap: 24px;
}

.doc {
  height: 280px;
  overflow-y: auto;
  padding-right: 8px;
}

section {
  min-height: 150px;
  padding-bottom: 12px;
  border-bottom: 1px dashed var(--ml-line);
}

section.child {
  min-height: 110px;
  padding-left: 14px;
}

h4 {
  margin: 12px 0 6px;
  font-family: var(--ml-font-display);
}

p {
  margin: 0;
  color: var(--ml-text-muted);
  font-size: var(--ml-text-sm);
}

.toc {
  align-self: start;
}
</style>
