<script setup lang="ts">
import { computed } from 'vue'
import type { MlTitleLevel } from './typography'

const props = withDefaults(
  defineProps<{
    /** Heading level: sets both the tag (h1–h6) and the size. */
    level?: MlTitleLevel
    /** Render another tag at this level's size (e.g. a styled div that isn't an outline heading). */
    as?: string
    /** Gold metal gradient text. */
    metal?: boolean
    /** A short gold bar in front, HUD style. */
    accent?: boolean
    /** Keep to one line and cut with "…". */
    ellipsis?: boolean
  }>(),
  { level: 2 },
)

const tag = computed(() => props.as ?? `h${props.level}`)
</script>

<template>
  <component
    :is="tag"
    :class="[
      'ml-title',
      `ml-title--h${level}`,
      { 'ml-title--metal': metal, 'ml-title--accent': accent, 'ml-title--ellipsis': ellipsis },
    ]"
  >
    <span v-if="metal" class="ml-title__text"><slot /></span>
    <slot v-else />
  </component>
</template>
