<script setup lang="ts">
import MlIcon from './MlIcon.vue'
import type { MlTone } from '../types'
import { useLocale } from '../locale'

const loc = useLocale()

withDefaults(
  defineProps<{
    tone?: MlTone
    /** "soft" tinted, "outline" rim only, "solid" metal fill. */
    variant?: 'soft' | 'outline' | 'solid'
    closable?: boolean
    /** Toggleable chip: renders a button and drives v-model:selected. */
    selectable?: boolean
  }>(),
  { tone: 'gold', variant: 'soft' },
)

const emit = defineEmits<{ close: [] }>()
const selected = defineModel<boolean>('selected', { default: false })
</script>

<template>
  <button
    v-if="selectable"
    type="button"
    :class="['ml-tag', `ml-tag--${tone}`, `ml-tag--${variant}`, 'ml-tag--selectable', { 'ml-tag--selected': selected }]"
    :aria-pressed="selected"
    @click="selected = !selected"
  >
    <slot name="icon" />
    <slot />
  </button>
  <span v-else :class="['ml-tag', `ml-tag--${tone}`, `ml-tag--${variant}`]">
    <slot name="icon" />
    <slot />
    <button v-if="closable" type="button" class="ml-tag__close" :aria-label="loc.common.remove('')" @click="emit('close')">
      <MlIcon name="close" />
    </button>
  </span>
</template>
