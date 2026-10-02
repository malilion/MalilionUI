<script setup lang="ts">
import { ref } from 'vue'

const stack = ref<string[]>(['vue', 'ts'])
const options = [
  { value: 'vue', label: 'Vue' },
  { value: 'ts', label: 'TypeScript' },
  { value: 'vite', label: 'Vite' },
  { value: 'pinia', label: 'Pinia' },
  { value: 'nuxt', label: 'Nuxt' },
  { value: 'vitest', label: 'Vitest' },
  { value: 'playwright', label: 'Playwright' },
  { value: 'jquery', label: 'jQuery', disabled: true },
]
</script>

<template>
  <div class="form">
    <MlCombobox
      v-model="stack"
      index="03"
      label="技術棧"
      :options="options"
      multiple
      searchable
      clearable
      name="stack"
      placeholder="選擇或搜尋"
      hint="Backspace 會刪掉最後一個標籤；加上 name 就能隨原生表單送出。"
    />
    <p class="ml-hud-label">{{ stack.length }} selected · {{ stack.join(', ') || '—' }}</p>
  </div>
</template>

<style scoped>
.form {
  display: grid;
  gap: 12px;
  max-width: 460px;
}
</style>
