<script setup lang="ts">
import MlPaw from './MlPaw.vue'
import type { MlStepItem } from '../types'
import { useLocale } from '../locale'

const loc = useLocale()

withDefaults(
  defineProps<{
    items: MlStepItem[]
    /** Index of the step in progress; earlier steps count as done. */
    current?: number
    label?: string
  }>(),
  { current: 0 },
)
</script>

<template>
  <ol class="ml-steps" :aria-label="label ?? loc.nav.steps">
    <li
      v-for="(item, i) in items"
      :key="`${i}-${item.title}`"
      :class="[
        'ml-steps__item',
        i < current ? 'ml-steps__item--done' : i === current ? 'ml-steps__item--current' : 'ml-steps__item--todo',
      ]"
      :aria-current="i === current ? 'step' : undefined"
    >
      <span class="ml-steps__marker">
        <MlPaw v-if="i < current" tone="current" />
        <template v-else>{{ i + 1 }}</template>
      </span>
      <span class="ml-steps__text">
        <span class="ml-steps__title">{{ item.title }}</span>
        <span v-if="item.desc" class="ml-steps__desc">{{ item.desc }}</span>
        <span class="ml-visually-hidden">{{ i < current ? loc.nav.stepDone : i === current ? loc.nav.stepCurrent : '' }}</span>
      </span>
    </li>
  </ol>
</template>
