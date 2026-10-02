<script setup lang="ts">
import { ref } from 'vue'

const repo = ref('')
const all = [
  { value: 'malilion/ui', hint: '★ 1.2k' },
  { value: 'malilion/icons', hint: '★ 340' },
  { value: 'malilion/playground', hint: '★ 88' },
  { value: 'vuejs/core', hint: '★ 48k' },
  { value: 'vitejs/vite', hint: '★ 70k' },
  { value: 'vitest-dev/vitest', hint: '★ 14k' },
]

// Pretend this is a server round-trip.
async function search(query: string) {
  await new Promise((r) => setTimeout(r, 500))
  return all.filter((r) => r.value.includes(query.toLowerCase()))
}
</script>

<template>
  <div class="form">
    <MlAutocomplete
      v-model="repo"
      index="02"
      label="搜尋專案"
      :fetch-suggestions="search"
      :debounce="250"
      placeholder="例如 vite"
      no-match-text="找不到這個專案"
    >
      <template #prefix><MlIcon name="search" /></template>
    </MlAutocomplete>
  </div>
</template>

<style scoped>
.form {
  max-width: 420px;
}
</style>
