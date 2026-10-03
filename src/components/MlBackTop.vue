<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import MlIcon from './MlIcon.vue'
import { useLocale } from '../locale'

const loc = useLocale()

const props = withDefaults(
  defineProps<{
    /** Show after scrolling this many px. */
    visibilityHeight?: number
    /** Scroll container; defaults to the window. */
    target?: string | HTMLElement
    right?: number
    bottom?: number
    /** Accessible name. */
    label?: string
  }>(),
  { visibilityHeight: 400, right: 32, bottom: 32 },
)

const emit = defineEmits<{ click: [] }>()

const scrollTop = ref(0)
const scrollMax = ref(1)
let container: HTMLElement | Window | null = null
let frame = 0

const visible = computed(() => scrollTop.value >= props.visibilityHeight)
/** 0–1, drawn as a ring around the button. */
const progress = computed(() => Math.min(1, scrollTop.value / Math.max(1, scrollMax.value)))
const CIRC = 2 * Math.PI * 25

function measure() {
  frame = 0
  if (!container) return
  if (container === window) {
    const doc = document.documentElement
    scrollTop.value = window.scrollY
    scrollMax.value = doc.scrollHeight - window.innerHeight
  } else {
    const el = container as HTMLElement
    scrollTop.value = el.scrollTop
    scrollMax.value = el.scrollHeight - el.clientHeight
  }
}

function schedule() {
  if (!frame) frame = requestAnimationFrame(measure)
}

function toTop() {
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  container?.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })
  emit('click')
}

onMounted(() => {
  container = !props.target
    ? window
    : typeof props.target === 'string'
      ? (document.querySelector<HTMLElement>(props.target) ?? window)
      : props.target
  container.addEventListener('scroll', schedule, { passive: true })
  window.addEventListener('resize', schedule)
  measure()
})

onBeforeUnmount(() => {
  container?.removeEventListener('scroll', schedule)
  window.removeEventListener('resize', schedule)
  cancelAnimationFrame(frame)
})
</script>

<template>
  <Transition name="ml-backtop">
    <button
      v-if="visible"
      type="button"
      class="ml-backtop"
      :aria-label="label ?? loc.nav.backTop"
      :style="{ right: `${right}px`, bottom: `${bottom}px` }"
      @click="toTop"
    >
      <slot>
        <svg class="ml-backtop__ring" viewBox="0 0 56 56" aria-hidden="true">
          <circle cx="28" cy="28" r="25" class="ml-backtop__track" />
          <circle
            cx="28"
            cy="28"
            r="25"
            class="ml-backtop__progress"
            :stroke-dasharray="CIRC"
            :stroke-dashoffset="CIRC * (1 - progress)"
          />
        </svg>
        <MlIcon name="arrowUp" class="ml-backtop__icon" />
      </slot>
    </button>
  </Transition>
</template>
