<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { observeInView, prefersReducedMotion } from '../composables'

const props = withDefaults(
  defineProps<{
    effect?: 'fade-up' | 'fade' | 'zoom' | 'slide-left' | 'slide-right' | 'blur' | 'flip'
    /** ms before it starts. */
    delay?: number
    /** ms */
    duration?: number
    /** ms between direct children — they reveal one after another. */
    stagger?: number
    /** Reveal only the first time it scrolls into view. */
    once?: boolean
    /** Share of the element that must be visible, 0–1. */
    threshold?: number
    tag?: string
  }>(),
  { effect: 'fade-up', delay: 0, duration: 700, stagger: 0, once: true, threshold: 0.15, tag: 'div' },
)

const emit = defineEmits<{ reveal: [] }>()

const root = ref<HTMLElement>()
// Starts "shown": without JS (SSR, crawlers) the content is simply visible.
const state = ref<'idle' | 'hidden' | 'shown'>('idle')
let stop: (() => void) | undefined

onMounted(() => {
  if (!root.value || prefersReducedMotion()) return
  if (props.stagger) {
    ;[...root.value.children].forEach((child, i) => (child as HTMLElement).style.setProperty('--_i', String(i)))
  }
  state.value = 'hidden'
  stop = observeInView(
    root.value,
    () => {
      state.value = 'shown'
      emit('reveal')
    },
    { once: props.once, threshold: props.threshold, onLeave: () => (state.value = 'hidden') },
  )
})

onBeforeUnmount(() => stop?.())
</script>

<template>
  <component
    :is="tag"
    ref="root"
    :class="[
      'ml-reveal',
      `ml-reveal--${effect}`,
      { 'ml-reveal--hidden': state === 'hidden', 'ml-reveal--shown': state === 'shown', 'ml-reveal--stagger': stagger > 0 },
    ]"
    :style="{ '--_delay': `${delay}ms`, '--_dur': `${duration}ms`, '--_stagger': `${stagger}ms` }"
  >
    <slot />
  </component>
</template>
