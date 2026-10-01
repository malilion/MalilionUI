<script setup lang="ts">
import { computed } from 'vue'
import type { MlButtonVariant, MlSize } from '../types'

const props = withDefaults(
  defineProps<{
    variant?: MlButtonVariant
    size?: MlSize
    type?: 'button' | 'submit' | 'reset'
    /** Renders an <a> instead of a <button>. */
    href?: string
    disabled?: boolean
    loading?: boolean
    block?: boolean
    /** Equal width and height, for icon-only buttons. Give it an aria-label. */
    square?: boolean
  }>(),
  { variant: 'primary', size: 'md', type: 'button' },
)

const inactive = computed(() => props.disabled || props.loading)
</script>

<template>
  <a
    v-if="href"
    :href="inactive ? undefined : href"
    :aria-disabled="inactive || undefined"
    :aria-busy="loading || undefined"
    :class="[
      'ml-btn',
      `ml-btn--${variant}`,
      `ml-btn--${size}`,
      { 'ml-btn--block': block, 'ml-btn--square': square, 'ml-btn--loading': loading },
    ]"
  >
    <span v-if="loading" class="ml-btn__spinner" aria-hidden="true" />
    <slot v-else name="prefix" />
    <span v-if="$slots.default" class="ml-btn__label"><slot /></span>
    <slot name="suffix" />
  </a>
  <button
    v-else
    :type="type"
    :disabled="inactive"
    :aria-busy="loading || undefined"
    :class="[
      'ml-btn',
      `ml-btn--${variant}`,
      `ml-btn--${size}`,
      { 'ml-btn--block': block, 'ml-btn--square': square, 'ml-btn--loading': loading },
    ]"
  >
    <span v-if="loading" class="ml-btn__spinner" aria-hidden="true" />
    <slot v-else name="prefix" />
    <span v-if="$slots.default" class="ml-btn__label"><slot /></span>
    <slot name="suffix" />
  </button>
</template>
