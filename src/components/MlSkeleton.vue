<script setup lang="ts">
import MlSkeletonItem from './MlSkeletonItem.vue'
import { useLocale } from '../locale'

const loc = useLocale()

withDefaults(
  defineProps<{
    /** While true the placeholder shows; set false to reveal the default slot. */
    loading?: boolean
    /** Paragraph lines in the built-in layout. */
    rows?: number
    /** Round avatar at the start of the built-in layout. */
    avatar?: boolean
    /** Heading bar above the lines. */
    title?: boolean
    /** Scanning sheen. Turned off automatically under prefers-reduced-motion. */
    animated?: boolean
    /** Read out to screen readers while loading. */
    label?: string
  }>(),
  { loading: true, rows: 3, title: true, animated: true },
)
</script>

<template>
  <div
    v-if="loading"
    :class="['ml-skeleton', { 'ml-skeleton--animated': animated, 'ml-skeleton--avatar': avatar }]"
    role="status"
    aria-busy="true"
  >
    <span class="ml-visually-hidden">{{ label ?? loc.skeleton }}</span>
    <slot name="template">
      <MlSkeletonItem v-if="avatar" variant="circle" class="ml-skeleton__avatar" />
      <div class="ml-skeleton__lines">
        <MlSkeletonItem v-if="title" variant="title" width="42%" />
        <MlSkeletonItem
          v-for="n in rows"
          :key="n"
          :width="n === rows && rows > 1 ? '64%' : undefined"
        />
      </div>
    </slot>
  </div>
  <slot v-else />
</template>
