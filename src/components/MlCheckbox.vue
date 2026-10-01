<script setup lang="ts">
import { ref, watchEffect } from 'vue'
import MlPaw from './MlPaw.vue'
import { useSplitAttrs } from '../composables'

defineOptions({ inheritAttrs: false })

const props = defineProps<{
  label?: string
  hint?: string
  disabled?: boolean
  /** Stamp a paw print instead of a check mark. */
  paw?: boolean
  /** "Some but not all" — e.g. a select-all header. */
  indeterminate?: boolean
}>()

const model = defineModel<boolean>({ default: false })
const { rootAttrs, controlAttrs } = useSplitAttrs()

// `indeterminate` is a DOM property with no HTML attribute, so set it by hand.
const input = ref<HTMLInputElement>()
watchEffect(() => {
  if (input.value) input.value.indeterminate = props.indeterminate
})
</script>

<template>
  <label v-bind="rootAttrs()" :class="['ml-check', { 'ml-check--disabled': disabled }]">
    <input
      ref="input"
      v-model="model"
      v-bind="controlAttrs()"
      type="checkbox"
      class="ml-check__input"
      :disabled="disabled"
    />
    <span class="ml-check__box" aria-hidden="true">
      <MlPaw v-if="paw" tone="current" class="ml-check__paw" />
      <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="square">
        <path d="M5 12.5l4.5 4.5L19 7.5" />
      </svg>
      <span class="ml-check__dash" />
    </span>
    <span v-if="label || hint || $slots.default" class="ml-check__text">
      <span><slot>{{ label }}</slot></span>
      <span v-if="hint" class="ml-check__hint">{{ hint }}</span>
    </span>
  </label>
</template>
