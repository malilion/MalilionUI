<script setup lang="ts">
import { ref } from 'vue'

const today = new Date()
const date = ref<Date | null>(today)
// Days with something on them get a little paw.
const markers = [3, 9, 18, 24].map((d) => new Date(today.getFullYear(), today.getMonth(), d))
</script>

<template>
  <MlCalendar v-model="date" :markers="markers" />
  <p class="ml-hud-label">選擇：{{ date?.toLocaleDateString('zh-TW') ?? '—' }}</p>
</template>
