<script setup lang="ts">
import { provide } from 'vue'
import { buttonGroupKey } from './button-group'
import type { MlButtonVariant, MlSize } from '../types'

const props = defineProps<{
  /** Size for every button that doesn't set its own. */
  size?: MlSize
  /** Variant for every button that doesn't set its own. */
  variant?: MlButtonVariant
  /** Disable every button in the group. */
  disabled?: boolean
  /** Stack the buttons top to bottom. */
  vertical?: boolean
  /** Fill the container width, buttons sharing it equally. */
  block?: boolean
  /** Accessible name for the group. */
  label?: string
}>()

provide(buttonGroupKey, {
  size: () => props.size,
  variant: () => props.variant,
  disabled: () => props.disabled,
})
</script>

<template>
  <div
    role="group"
    :aria-label="label"
    :class="['ml-btn-group', { 'ml-btn-group--vertical': vertical, 'ml-btn-group--block': block }]"
  >
    <slot />
  </div>
</template>
