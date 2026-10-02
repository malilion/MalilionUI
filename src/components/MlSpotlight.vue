<script setup lang="ts">
import { ref } from 'vue'

withDefaults(
  defineProps<{
    tone?: 'gold' | 'tech' | 'bean'
    /** Radius of the light, px. */
    size?: number
    /** Reveal a HUD grid under the light. */
    grid?: boolean
    /** Light up the border nearest the pointer too. */
    border?: boolean
    tag?: string
  }>(),
  { tone: 'gold', size: 320, grid: true, border: true, tag: 'div' },
)

const root = ref<HTMLElement>()
const pos = ref({ x: -9999, y: -9999, on: false })

function onMove(event: PointerEvent) {
  const rect = root.value?.getBoundingClientRect()
  if (!rect) return
  pos.value = { x: event.clientX - rect.left, y: event.clientY - rect.top, on: true }
}

function onLeave() {
  pos.value = { ...pos.value, on: false }
}
</script>

<template>
  <component
    :is="tag"
    ref="root"
    :class="[
      'ml-spotlight',
      `ml-spotlight--${tone}`,
      { 'ml-spotlight--on': pos.on, 'ml-spotlight--grid': grid, 'ml-spotlight--border': border },
    ]"
    :style="{ '--_x': `${pos.x}px`, '--_y': `${pos.y}px`, '--_r': `${size}px` }"
    @pointermove="onMove"
    @pointerleave="onLeave"
  >
    <span class="ml-spotlight__light" aria-hidden="true" />
    <slot />
  </component>
</template>
