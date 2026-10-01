<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, useId } from 'vue'
import type { MlPlacement } from '../types'

const props = withDefaults(
  defineProps<{
    content?: string
    placement?: MlPlacement
    /** Hover delay in ms. Keyboard focus shows immediately. */
    delay?: number
  }>(),
  { placement: 'top', delay: 120 },
)

const bubbleId = `ml-tooltip-${useId()}`
const root = ref<HTMLElement>()
const visible = ref(false)
let timer: ReturnType<typeof setTimeout> | undefined

function show(immediate = false) {
  clearTimeout(timer)
  if (immediate || props.delay <= 0) visible.value = true
  else timer = setTimeout(() => (visible.value = true), props.delay)
}

function hide() {
  clearTimeout(timer)
  visible.value = false
}

// The trigger is slotted content we don't render ourselves, so wire up
// aria-describedby on it directly.
onMounted(() => {
  const trigger = root.value?.firstElementChild
  if (trigger && !trigger.classList.contains('ml-tooltip__bubble')) {
    trigger.setAttribute('aria-describedby', bubbleId)
  }
})

onBeforeUnmount(() => clearTimeout(timer))
</script>

<template>
  <span
    ref="root"
    class="ml-tooltip"
    @mouseenter="show()"
    @mouseleave="hide"
    @focusin="show(true)"
    @focusout="hide"
    @keydown.esc="hide"
  >
    <slot />
    <span
      :id="bubbleId"
      role="tooltip"
      :class="[
        'ml-tooltip__bubble',
        `ml-tooltip__bubble--${placement}`,
        { 'ml-tooltip__bubble--visible': visible },
      ]"
    >
      <slot name="content">{{ content }}</slot>
    </span>
  </span>
</template>
