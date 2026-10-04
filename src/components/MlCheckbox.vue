<script setup lang="ts">
import { computed, inject, onBeforeUnmount, onMounted, ref, watchEffect } from 'vue'
import MlPaw from './MlPaw.vue'
import { checkboxGroupKey } from './checkboxGroup'
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
  /** Inside <MlCheckboxGroup>: this box's value in the group's array. Also the native value attribute. */
  value?: string | number
}>()

const model = defineModel<boolean>({ default: false })
const { rootAttrs, controlAttrs } = useSplitAttrs()

// Inside a group (and given a value) the group owns the checked state.
const injected = inject(checkboxGroupKey, null)
const group = props.value !== undefined ? injected : null
const checked = computed(() => (group ? group.isChecked(props.value!) : model.value))
const isDisabled = computed(() => props.disabled || (group?.isLocked(props.value!) ?? false))

let unregister: (() => void) | undefined
onMounted(() => {
  if (group) unregister = group.register(props.value!, () => props.disabled)
})
onBeforeUnmount(() => unregister?.())

function onChange(event: Event) {
  const on = (event.target as HTMLInputElement).checked
  if (group) group.toggle(props.value!, on)
  else model.value = on
  // Keep the DOM in step if the owner refused the change (e.g. a controlled parent).
  ;(event.target as HTMLInputElement).checked = checked.value
}

// `indeterminate` is a DOM property with no HTML attribute, so set it by hand.
const input = ref<HTMLInputElement>()
watchEffect(() => {
  if (input.value) input.value.indeterminate = props.indeterminate
})
</script>

<template>
  <label v-bind="rootAttrs()" :class="['ml-check', { 'ml-check--disabled': isDisabled }]">
    <input
      ref="input"
      v-bind="controlAttrs()"
      type="checkbox"
      class="ml-check__input"
      :name="group?.name.value ?? (controlAttrs().name as string | undefined)"
      :value="value"
      :checked="checked"
      :disabled="isDisabled"
      @change="onChange"
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
