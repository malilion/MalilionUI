<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { observeInView, prefersReducedMotion } from '../composables'

const props = withDefaults(
  defineProps<{
    value: number
    /** Where the first count starts. */
    from?: number
    /** ms */
    duration?: number
    decimals?: number
    /** Thousands separator; '' turns grouping off. */
    separator?: string
    prefix?: string
    suffix?: string
    /** Wait until it scrolls into view before counting. */
    startOnView?: boolean
  }>(),
  { from: 0, duration: 1600, decimals: 0, separator: ',', prefix: '', suffix: '', startOnView: true },
)

const emit = defineEmits<{ done: [] }>()

const root = ref<HTMLElement>()
const shown = ref(props.from)
const running = ref(false)
let frame = 0
let stopObserving: (() => void) | undefined

const format = (n: number) => {
  const fixed = Math.abs(n).toFixed(props.decimals)
  const [int, dec] = fixed.split('.')
  const grouped = props.separator ? int.replace(/\B(?=(\d{3})+(?!\d))/g, props.separator) : int
  return `${n < 0 ? '-' : ''}${props.prefix}${grouped}${dec ? `.${dec}` : ''}${props.suffix}`
}

const display = computed(() => format(shown.value))
const finalText = computed(() => format(props.value))

// easeOutExpo: fast start, gentle landing — the needle settles.
const ease = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t))

function run(from: number, to: number) {
  cancelAnimationFrame(frame)
  if (prefersReducedMotion() || props.duration <= 0 || from === to) {
    shown.value = to
    emit('done')
    return
  }
  running.value = true
  const start = performance.now()
  const tick = (now: number) => {
    const t = Math.min(1, (now - start) / props.duration)
    shown.value = from + (to - from) * ease(t)
    if (t < 1) frame = requestAnimationFrame(tick)
    else {
      shown.value = to
      running.value = false
      emit('done')
    }
  }
  frame = requestAnimationFrame(tick)
}

let started = false
function start() {
  if (started) return
  started = true
  run(props.from, props.value)
}

onMounted(() => {
  if (props.startOnView && root.value) stopObserving = observeInView(root.value, start)
  else start()
})

// Later changes count from wherever the number is now.
watch(() => props.value, (to) => {
  if (started) run(shown.value, to)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(frame)
  stopObserving?.()
})

defineExpose({ restart: () => run(props.from, props.value) })
</script>

<template>
  <span ref="root" :class="['ml-countup', { 'ml-countup--running': running }]">
    <span aria-hidden="true">{{ display }}</span>
    <span class="ml-visually-hidden">{{ finalText }}</span>
  </span>
</template>
