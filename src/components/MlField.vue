<script setup lang="ts">
import MlIcon from './MlIcon.vue'

defineProps<{
  /** id of the control the label points at */
  controlId?: string
  label?: string
  hint?: string
  error?: string
  /** HUD prefix shown before the label, e.g. "01" */
  index?: string
  required?: boolean
}>()
</script>

<template>
  <div class="ml-field">
    <label
      v-if="label || $slots.label"
      :id="controlId ? `${controlId}-label` : undefined"
      class="ml-field__label"
      :for="controlId"
    >
      <span v-if="index" class="ml-field__index">{{ index }}</span>
      <slot name="label">{{ label }}</slot>
      <span v-if="required" class="ml-field__required" aria-hidden="true">*</span>
    </label>
    <slot />
    <p v-if="error" :id="`${controlId}-error`" class="ml-field__error">
      <MlIcon name="warning" />{{ error }}
    </p>
    <p v-else-if="hint" :id="`${controlId}-hint`" class="ml-field__hint">{{ hint }}</p>
  </div>
</template>
