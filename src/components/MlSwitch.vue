<script setup lang="ts">
import { computed, useId } from 'vue'
import { useSplitAttrs } from '../composables'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    label?: string
    tone?: 'gold' | 'tech'
    /** Show an ON / OFF readout next to the switch. */
    showState?: boolean
    disabled?: boolean
    id?: string
  }>(),
  { tone: 'gold' },
)

const model = defineModel<boolean>({ default: false })
const { rootAttrs, controlAttrs } = useSplitAttrs()
const autoId = useId()
const controlId = computed(() => props.id ?? `ml-switch-${autoId}`)
</script>

<template>
  <div
    v-bind="rootAttrs()"
    :class="['ml-switch', `ml-switch--${tone}`, { 'ml-switch--on': model }]"
  >
    <button
      :id="controlId"
      v-bind="controlAttrs()"
      type="button"
      role="switch"
      class="ml-switch__control"
      :aria-checked="model"
      :disabled="disabled"
      @click="model = !model"
    >
      <span class="ml-switch__track"><span class="ml-switch__thumb" /></span>
    </button>
    <span v-if="showState" class="ml-switch__state" aria-hidden="true">{{ model ? 'ON' : 'OFF' }}</span>
    <label v-if="label || $slots.default" :for="controlId" class="ml-switch__label">
      <slot>{{ label }}</slot>
    </label>
  </div>
</template>
