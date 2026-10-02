<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

const props = withDefaults(
  defineProps<{
    /** px per second. */
    speed?: number
    direction?: 'left' | 'right'
    pauseOnHover?: boolean
    /** Stop scrolling (e.g. behind your own pause button). */
    paused?: boolean
    /** px between repeats. */
    gap?: number
    /** Fade the content out at both edges. */
    fade?: boolean
    /** Accessible name for the region. */
    label?: string
  }>(),
  { speed: 60, direction: 'left', pauseOnHover: true, gap: 40, fade: true },
)

const group = ref<HTMLElement>()
const width = ref(0)
let observer: ResizeObserver | undefined

function measure() {
  width.value = group.value?.offsetWidth ?? 0
}

onMounted(() => {
  measure()
  if (typeof ResizeObserver !== 'undefined' && group.value) {
    observer = new ResizeObserver(measure)
    observer.observe(group.value)
  }
})
onBeforeUnmount(() => observer?.disconnect())

// One lap = one copy's width plus the gap, travelled at `speed`.
const duration = computed(() => (width.value ? (width.value + props.gap) / Math.max(1, props.speed) : 20))
</script>

<template>
  <div
    :class="[
      'ml-marquee',
      `ml-marquee--${direction}`,
      { 'ml-marquee--hover-pause': pauseOnHover, 'ml-marquee--paused': paused, 'ml-marquee--fade': fade },
    ]"
    role="region"
    :aria-label="label"
    :style="{ '--_dur': `${duration.toFixed(2)}s`, '--_gap': `${gap}px` }"
  >
    <div class="ml-marquee__track">
      <div ref="group" class="ml-marquee__group"><slot /></div>
      <!-- The copy that makes the loop seamless; hidden from assistive tech. -->
      <div class="ml-marquee__group" aria-hidden="true" inert><slot /></div>
    </div>
  </div>
</template>
