<script setup lang="ts">
import { icons, type IconName } from './icons'

const filled: ReadonlySet<IconName> = new Set(['up', 'down'])

defineProps<{
  name: IconName
}>()
</script>

<template>
  <svg
    viewBox="0 0 24 24"
    aria-hidden="true"
    focusable="false"
    :fill="filled.has(name) ? 'currentColor' : 'none'"
    :stroke="filled.has(name) ? 'none' : 'currentColor'"
    stroke-width="2"
    stroke-linecap="square"
    stroke-linejoin="miter"
  >
    <path :d="icons[name]" />
  </svg>
</template>
