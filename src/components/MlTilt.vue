<script setup lang="ts">
import { computed, ref } from 'vue'
import { prefersReducedMotion } from '../composables'

const props = withDefaults(
  defineProps<{
    /** Largest tilt, in degrees. */
    max?: number
    /** Scale while hovered. */
    scale?: number
    /** Specular glare that follows the pointer. */
    glare?: boolean
    /** px — smaller is more dramatic. */
    perspective?: number
    disabled?: boolean
  }>(),
  { max: 10, scale: 1.02, glare: true, perspective: 900 },
)

const root = ref<HTMLElement>()
const state = ref({ rx: 0, ry: 0, gx: 50, gy: 50, active: false })

function onMove(event: PointerEvent) {
  if (props.disabled || !root.value) return
  const rect = root.value.getBoundingClientRect()
  const px = (event.clientX - rect.left) / rect.width
  const py = (event.clientY - rect.top) / rect.height
  const still = prefersReducedMotion()
  state.value = {
    // Pointer at the right edge tips the right side away from the viewer.
    rx: still ? 0 : (0.5 - py) * 2 * props.max,
    ry: still ? 0 : (px - 0.5) * 2 * props.max,
    gx: px * 100,
    gy: py * 100,
    active: true,
  }
}

function onLeave() {
  state.value = { rx: 0, ry: 0, gx: 50, gy: 50, active: false }
}

const style = computed(() => ({
  '--_rx': `${state.value.rx.toFixed(2)}deg`,
  '--_ry': `${state.value.ry.toFixed(2)}deg`,
  '--_gx': `${state.value.gx.toFixed(1)}%`,
  '--_gy': `${state.value.gy.toFixed(1)}%`,
  '--_scale': state.value.active && !prefersReducedMotion() ? props.scale : 1,
  '--_perspective': `${props.perspective}px`,
}))
</script>

<template>
  <div
    ref="root"
    :class="['ml-tilt', { 'ml-tilt--active': state.active, 'ml-tilt--glare': glare }]"
    :style="style"
    @pointermove="onMove"
    @pointerleave="onLeave"
  >
    <div class="ml-tilt__inner">
      <slot :active="state.active" />
      <span v-if="glare" class="ml-tilt__glare" aria-hidden="true" />
    </div>
  </div>
</template>
