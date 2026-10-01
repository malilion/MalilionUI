<script setup lang="ts">
import { useSplitAttrs } from '../composables'

defineOptions({ inheritAttrs: false })

defineProps<{
  label?: string
  hint?: string
  disabled?: boolean
}>()

const model = defineModel<boolean>({ default: false })
const { rootAttrs, controlAttrs } = useSplitAttrs()
</script>

<template>
  <label v-bind="rootAttrs()" :class="['ml-check', { 'ml-check--disabled': disabled }]">
    <input
      v-model="model"
      v-bind="controlAttrs()"
      type="checkbox"
      class="ml-check__input"
      :disabled="disabled"
    />
    <span class="ml-check__box" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="square">
        <path d="M5 12.5l4.5 4.5L19 7.5" />
      </svg>
    </span>
    <span v-if="label || hint || $slots.default" class="ml-check__text">
      <span><slot>{{ label }}</slot></span>
      <span v-if="hint" class="ml-check__hint">{{ hint }}</span>
    </span>
  </label>
</template>
