<script setup lang="ts">
import { computed, inject } from 'vue'
import { buttonGroupKey } from './button-group'
import { vPawStamp } from '../pawStamp'
import { safeHref } from '../url'
import type { MlButtonVariant, MlPawTone, MlSize } from '../types'

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
    /** Leave a paw print where it's pressed. true = gold, or pick a tone. */
    stamp?: boolean | MlPawTone
  }>(),
  { type: 'button' },
)

// Inside MlButtonGroup, unset size / variant come from the group.
const group = inject(buttonGroupKey, null)
const look = computed(() => props.variant ?? group?.variant() ?? 'primary')
const scale = computed(() => props.size ?? group?.size() ?? 'md')
const inactive = computed(() => props.disabled || props.loading || !!group?.disabled())
</script>

<template>
  <a
    v-if="href"
    v-paw-stamp="stamp ?? false"
    :href="inactive ? undefined : safeHref(href)"
    :aria-disabled="inactive || undefined"
    :aria-busy="loading || undefined"
    :class="[
      'ml-btn',
      `ml-btn--${look}`,
      `ml-btn--${scale}`,
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
    v-paw-stamp="stamp ?? false"
    :type="type"
    :disabled="inactive"
    :aria-busy="loading || undefined"
    :class="[
      'ml-btn',
      `ml-btn--${look}`,
      `ml-btn--${scale}`,
      { 'ml-btn--block': block, 'ml-btn--square': square, 'ml-btn--loading': loading },
    ]"
  >
    <span v-if="loading" class="ml-btn__spinner" aria-hidden="true" />
    <slot v-else name="prefix" />
    <span v-if="$slots.default" class="ml-btn__label"><slot /></span>
    <slot name="suffix" />
  </button>
</template>
