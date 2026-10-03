<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'

const props = withDefaults(
  defineProps<{
    /** horizontal: panes side by side. vertical: stacked. */
    direction?: 'horizontal' | 'vertical'
    /** Smallest size of the first pane, in %. */
    min?: number
    /** Largest size of the first pane, in %. */
    max?: number
    /** Arrow-key step, in %. */
    step?: number
    /** Size restored by double-clicking the handle. */
    defaultSize?: number
    disabled?: boolean
    /** Accessible name for the handle. */
    label?: string
  }>(),
  { direction: 'horizontal', min: 10, max: 90, step: 2, defaultSize: 50, label: '調整面板大小' },
)

/** Size of the first pane, in % of the splitter. */
const size = defineModel<number>({ default: 50 })
const root = ref<HTMLElement>()
const dragging = ref(false)
const horizontal = computed(() => props.direction === 'horizontal')
const clamp = (v: number) => Math.min(props.max, Math.max(props.min, v))

function setFromPointer(event: PointerEvent) {
  const rect = root.value?.getBoundingClientRect()
  if (!rect) return
  const ratio = horizontal.value
    ? (event.clientX - rect.left) / (rect.width || 1)
    : (event.clientY - rect.top) / (rect.height || 1)
  size.value = +clamp(ratio * 100).toFixed(2)
}

function onPointerDown(event: PointerEvent) {
  if (props.disabled || event.button !== 0) return
  event.preventDefault()
  dragging.value = true
  ;(event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId)
  document.documentElement.style.cursor = horizontal.value ? 'col-resize' : 'row-resize'
}

function onPointerMove(event: PointerEvent) {
  if (dragging.value) setFromPointer(event)
}

function stop() {
  if (!dragging.value) return
  dragging.value = false
  document.documentElement.style.cursor = ''
}

function onKeydown(event: KeyboardEvent) {
  if (props.disabled) return
  const back = horizontal.value ? 'ArrowLeft' : 'ArrowUp'
  const fwd = horizontal.value ? 'ArrowRight' : 'ArrowDown'
  let next: number | null = null
  if (event.key === back) next = size.value - props.step
  else if (event.key === fwd) next = size.value + props.step
  else if (event.key === 'Home') next = props.min
  else if (event.key === 'End') next = props.max
  else if (event.key === 'Enter') next = props.defaultSize
  if (next === null) return
  event.preventDefault()
  size.value = clamp(next)
}

onBeforeUnmount(stop)
</script>

<template>
  <div
    ref="root"
    :class="['ml-splitter', `ml-splitter--${direction}`, { 'ml-splitter--dragging': dragging, 'ml-splitter--disabled': disabled }]"
    :style="{ '--_size': `${size}%` }"
  >
    <div class="ml-splitter__pane ml-splitter__pane--start"><slot name="start" /></div>
    <div
      class="ml-splitter__handle"
      role="separator"
      :tabindex="disabled ? -1 : 0"
      :aria-orientation="horizontal ? 'vertical' : 'horizontal'"
      :aria-valuenow="Math.round(size)"
      :aria-valuemin="min"
      :aria-valuemax="max"
      :aria-label="label"
      :aria-disabled="disabled || undefined"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="stop"
      @pointercancel="stop"
      @lostpointercapture="stop"
      @dblclick="!disabled && (size = clamp(defaultSize))"
      @keydown="onKeydown"
    >
      <span class="ml-splitter__grip" aria-hidden="true"><i /><i /><i /></span>
    </div>
    <div class="ml-splitter__pane ml-splitter__pane--end"><slot name="end" /></div>
  </div>
</template>
