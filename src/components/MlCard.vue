<script setup lang="ts">
import type { MlCardVariant } from '../types'

withDefaults(
  defineProps<{
    variant?: MlCardVariant
    title?: string
    eyebrow?: string
    rivets?: boolean
    /** Hover lift + glow. Pair with a click handler or wrap in a link. */
    interactive?: boolean
    tag?: string
  }>(),
  { variant: 'plate', tag: 'section' },
)
</script>

<template>
  <component
    :is="tag"
    :class="[
      'ml-card',
      `ml-card--${variant}`,
      { 'ml-card--rivets': rivets, 'ml-card--interactive': interactive },
    ]"
  >
    <header v-if="title || eyebrow || $slots.header || $slots.actions" class="ml-card__header">
      <div class="ml-card__heading">
        <slot name="header">
          <p v-if="eyebrow" class="ml-card__eyebrow">{{ eyebrow }}</p>
          <h3 v-if="title" class="ml-card__title">{{ title }}</h3>
        </slot>
      </div>
      <slot name="actions" />
    </header>
    <div v-if="$slots.default" class="ml-card__body">
      <slot />
    </div>
    <footer v-if="$slots.footer" class="ml-card__footer">
      <slot name="footer" />
    </footer>
  </component>
</template>
