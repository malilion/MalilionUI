<script setup lang="ts">
import type { MlTone } from '../types'

withDefaults(
  defineProps<{
    tone?: MlTone
    solid?: boolean
    size?: 'md' | 'lg'
    /** Leading status light. */
    dot?: boolean
    pulse?: boolean
  }>(),
  { tone: 'gold', size: 'md' },
)
</script>

<template>
  <span
    :class="[
      'ml-badge',
      `ml-badge--${tone}`,
      { 'ml-badge--solid': solid, 'ml-badge--lg': size === 'lg' },
    ]"
  >
    <span v-if="dot || pulse" :class="['ml-badge__dot', { 'ml-badge__dot--pulse': pulse }]" aria-hidden="true" />
    <slot />
  </span>
</template>
