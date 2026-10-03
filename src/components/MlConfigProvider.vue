<script setup lang="ts">
import { computed, provide } from 'vue'
import { localeKey, useLocale, type MlLocale } from '../locale'

const props = defineProps<{
  /** UI text for everything inside; defaults to the surrounding / app-wide locale. */
  locale?: MlLocale
  /** Scope a theme to this subtree: sets data-ml-theme on a wrapper. */
  theme?: 'dark' | 'light'
  /** Wrapper element when `theme` is set. */
  tag?: string
}>()

const parent = useLocale()
provide(
  localeKey,
  computed(() => props.locale ?? parent.value),
)
</script>

<template>
  <component :is="tag ?? 'div'" v-if="theme" :data-ml-theme="theme" class="ml-config">
    <slot />
  </component>
  <slot v-else />
</template>
