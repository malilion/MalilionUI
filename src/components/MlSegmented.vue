<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import MlIcon from './MlIcon.vue'
import type { MlSegmentedOption, MlSize } from '../types'

const props = withDefaults(
  defineProps<{
    options: MlSegmentedOption[]
    size?: MlSize
    /** Stretch to the container width, segments sharing it equally. */
    block?: boolean
    disabled?: boolean
    /** Accessible name for the group. */
    label?: string
  }>(),
  { size: 'md' },
)

const emit = defineEmits<{ change: [value: string | number] }>()
const model = defineModel<string | number>()

const root = ref<HTMLElement>()
const els = new Map<string | number, HTMLElement>()
const plate = reactive({ x: 0, width: 0, ready: false })

function setEl(value: string | number, el: unknown) {
  if (el instanceof HTMLElement) els.set(value, el)
  else els.delete(value)
}

function measure() {
  const el = model.value !== undefined ? els.get(model.value) : undefined
  if (!el) {
    plate.ready = false
    return
  }
  plate.x = el.offsetLeft
  plate.width = el.offsetWidth
  plate.ready = true
}

const isDisabled = (o: MlSegmentedOption) => props.disabled || !!o.disabled

function select(option: MlSegmentedOption) {
  if (isDisabled(option) || option.value === model.value) return
  model.value = option.value
  emit('change', option.value)
}

// Radio-group keyboard model: arrows move and select, wrapping around.
function onKeydown(event: KeyboardEvent) {
  const enabled = props.options.filter((o) => !isDisabled(o))
  if (!enabled.length) return
  const current = enabled.findIndex((o) => o.value === model.value)
  let next = -1
  if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (current + 1) % enabled.length
  else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (current - 1 + enabled.length) % enabled.length
  else if (event.key === 'Home') next = 0
  else if (event.key === 'End') next = enabled.length - 1
  if (next < 0) return
  event.preventDefault()
  select(enabled[next])
  els.get(enabled[next].value)?.focus()
}

/** Only the checked segment (or the first enabled one) is in the tab order. */
function tabIndex(option: MlSegmentedOption) {
  if (isDisabled(option)) return -1
  const hasChecked = props.options.some((o) => o.value === model.value && !isDisabled(o))
  if (hasChecked) return option.value === model.value ? 0 : -1
  return props.options.find((o) => !isDisabled(o)) === option ? 0 : -1
}

let observer: ResizeObserver | undefined
onMounted(() => {
  measure()
  if (typeof ResizeObserver !== 'undefined' && root.value) {
    observer = new ResizeObserver(measure)
    observer.observe(root.value)
  }
  document.fonts?.ready.then(measure)
})
onBeforeUnmount(() => observer?.disconnect())
watch(model, () => nextTick(measure))
watch(() => props.options, () => nextTick(measure), { deep: true })
</script>

<template>
  <div
    ref="root"
    role="radiogroup"
    :aria-label="label"
    :aria-disabled="disabled || undefined"
    :class="['ml-segmented', `ml-segmented--${size}`, { 'ml-segmented--block': block, 'ml-segmented--disabled': disabled }]"
    @keydown="onKeydown"
  >
    <span
      v-show="plate.ready"
      class="ml-segmented__plate"
      aria-hidden="true"
      :style="{ width: `${plate.width}px`, transform: `translateX(${plate.x}px)` }"
    />
    <button
      v-for="option in options"
      :key="option.value"
      :ref="(el) => setEl(option.value, el)"
      type="button"
      role="radio"
      :aria-checked="option.value === model"
      :aria-label="!option.label ? String(option.value) : undefined"
      :disabled="isDisabled(option)"
      :tabindex="tabIndex(option)"
      :class="['ml-segmented__item', { 'ml-segmented__item--active': option.value === model }]"
      @click="select(option)"
    >
      <slot name="option" :option="option" :active="option.value === model">
        <MlIcon v-if="option.icon" :name="option.icon" class="ml-segmented__icon" />
        <span v-if="option.label">{{ option.label }}</span>
      </slot>
    </button>
  </div>
</template>
