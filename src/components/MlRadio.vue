<script setup lang="ts">
import { computed, inject } from 'vue'
import MlPaw from './MlPaw.vue'
import { radioGroupKey } from './radioGroup'

const props = defineProps<{
  value: string | number
  label?: string
  hint?: string
  disabled?: boolean
  /** Only needed when used outside <MlRadioGroup>. */
  name?: string
}>()

/** Standalone use only — inside a group, the group owns the value. */
const model = defineModel<string | number>()
const group = inject(radioGroupKey, null)

const checked = computed(() => (group ? group.model.value : model.value) === props.value)
const isDisabled = computed(() => props.disabled || group?.disabled.value || false)
const isCard = computed(() => group?.variant.value === 'card')

function onChange() {
  if (group) group.select(props.value)
  else model.value = props.value
}
</script>

<template>
  <label :class="['ml-radio', { 'ml-radio--card': isCard, 'ml-radio--disabled': isDisabled }]">
    <input
      type="radio"
      class="ml-radio__input"
      :name="group?.name ?? name"
      :value="value"
      :checked="checked"
      :disabled="isDisabled"
      @change="onChange"
    />
    <span class="ml-radio__socket" aria-hidden="true">
      <MlPaw tone="current" class="ml-radio__paw" />
    </span>
    <span v-if="label || hint || $slots.default" class="ml-radio__text">
      <span class="ml-radio__label"><slot>{{ label }}</slot></span>
      <span v-if="hint" class="ml-radio__hint">{{ hint }}</span>
    </span>
  </label>
</template>
