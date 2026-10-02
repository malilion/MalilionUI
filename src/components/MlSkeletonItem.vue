<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    variant?: 'text' | 'title' | 'circle' | 'rect' | 'button' | 'image'
    /** Number → px, or any CSS length. */
    width?: number | string
    height?: number | string
  }>(),
  { variant: 'text' },
)

const len = (v: number | string | undefined) => (typeof v === 'number' ? `${v}px` : v)
const style = computed(() => ({ width: len(props.width), height: len(props.height) }))
</script>

<template>
  <span :class="['ml-skeleton__item', `ml-skeleton__item--${variant}`]" :style="style" aria-hidden="true" />
</template>
