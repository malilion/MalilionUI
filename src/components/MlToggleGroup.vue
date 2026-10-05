<script setup lang="ts">
import { computed, ref } from 'vue'
import MlIcon from './MlIcon.vue'
import { nextToggleValue, toggleFocusTarget, toggleSelection, toggleTabStop } from './toggle-group'
import type { MlSize, MlToggleGroupOption, MlToggleGroupValue } from '../types'

const props = withDefaults(
  defineProps<{
    options: MlToggleGroupOption[]
    /** Any number pressed at once; the v-model is then an array. */
    multiple?: boolean
    /** Pressing the only pressed item releases it. false keeps at least one pressed. */
    allowEmpty?: boolean
    size?: MlSize
    /** Stack the items top to bottom. */
    vertical?: boolean
    /** Fill the container width, items sharing it equally. */
    block?: boolean
    disabled?: boolean
    /** Accessible name for the group. */
    label?: string
  }>(),
  { size: 'md', allowEmpty: true },
)

const emit = defineEmits<{ change: [value: MlToggleGroupValue] }>()
const model = defineModel<MlToggleGroupValue>()

const els = new Map<string | number, HTMLElement>()
function setEl(value: string | number, el: unknown) {
  if (el instanceof HTMLElement) els.set(value, el)
  else els.delete(value)
}

const isDisabled = (o: MlToggleGroupOption) => props.disabled || !!o.disabled
const selected = computed(() => toggleSelection(model.value))
const enabled = computed(() => props.options.filter((o) => !isDisabled(o)).map((o) => o.value))
const focused = ref<string | number>()
const tabStop = computed(() => toggleTabStop(enabled.value, selected.value, focused.value))

function press(option: MlToggleGroupOption) {
  if (isDisabled(option)) return
  const next = nextToggleValue(model.value, option.value, { multiple: props.multiple, allowEmpty: props.allowEmpty, options: props.options })
  if (next === undefined) return
  model.value = next
  emit('change', next)
}

// Arrow keys only move focus; Space / Enter press the focused item.
function onKeydown(event: KeyboardEvent) {
  const list = enabled.value
  const from = tabStop.value === undefined ? 0 : list.indexOf(tabStop.value)
  const to = toggleFocusTarget(event.key, from, list.length)
  if (to < 0) return
  event.preventDefault()
  focused.value = list[to]
  els.get(list[to])?.focus()
}
</script>

<template>
  <div
    role="group"
    :aria-label="label"
    :aria-disabled="disabled || undefined"
    :class="[
      'ml-toggle-group',
      `ml-toggle-group--${size}`,
      { 'ml-toggle-group--vertical': vertical, 'ml-toggle-group--block': block, 'ml-toggle-group--disabled': disabled },
    ]"
    @keydown="onKeydown"
  >
    <button
      v-for="option in options"
      :key="option.value"
      :ref="(el) => setEl(option.value, el)"
      type="button"
      :aria-pressed="selected.includes(option.value)"
      :aria-label="!option.label ? (option.title ?? String(option.value)) : undefined"
      :title="option.title"
      :disabled="isDisabled(option)"
      :tabindex="option.value === tabStop ? 0 : -1"
      :class="['ml-toggle-group__item', { 'ml-toggle-group__item--active': selected.includes(option.value) }]"
      @click="press(option)"
      @focus="focused = option.value"
    >
      <slot name="option" :option="option" :active="selected.includes(option.value)">
        <MlIcon v-if="option.icon" :name="option.icon" class="ml-toggle-group__icon" />
        <span v-if="option.label">{{ option.label }}</span>
      </slot>
    </button>
  </div>
</template>
