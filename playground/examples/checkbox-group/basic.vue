<script setup lang="ts">
import { ref } from 'vue'

const stacks = ref<(string | number)[]>(['vue'])
const options = [
  { value: 'vue', label: 'Vue' },
  { value: 'react', label: 'React' },
  { value: 'nuxt', label: 'Nuxt' },
  { value: 'next', label: 'Next.js' },
  { value: 'svelte', label: 'Svelte', disabled: true },
]
</script>

<template>
  <MlCheckboxGroup v-model="stacks" label="技術棧" hint="可複選" :options="options" check-all />
  <p class="ml-hud-label">選擇：{{ stacks.join('、') || '—' }}</p>
</template>
