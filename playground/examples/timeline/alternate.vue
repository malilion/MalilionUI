<script setup lang="ts">
const items = [
  { title: 'v0.1 — 第一聲獅吼', time: '2025.01', desc: '按鈕、卡片、輸入框與暗色主題。' },
  { title: 'v0.2 — 日光模式', time: '2025.03', tone: 'tech' as const, desc: 'Daylight Titanium 淺色主題。' },
  { title: 'v0.3 — 吉祥物登場', time: '2025.06', paw: true, desc: '碼力獅本尊與到處都是的腳印。' },
  { title: 'v0.4 — 行動版', time: '2025.09', tone: 'success' as const, desc: '日曆、日期選擇與手機元件。' },
]
</script>

<template>
  <MlTimeline :items="items" mode="alternate" reverse />
</template>
