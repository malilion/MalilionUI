<script setup lang="ts">
import { ref } from 'vue'

const lang = ref('zh-Hant')
const languages = [
  { value: 'zh-Hant', label: '繁體中文' },
  { value: 'en', label: 'English' },
  { value: 'ja', label: '日本語' },
  { value: 'lion', label: '獅語（Roar）' },
]
</script>

<template>
  <MlDropdown v-model="lang" :items="languages" selectable label="語言" />
  <span class="ml-hud-label">lang = {{ lang }}</span>
</template>
