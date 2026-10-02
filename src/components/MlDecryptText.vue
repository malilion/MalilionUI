<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { observeInView, prefersReducedMotion } from '../composables'

const props = withDefaults(
  defineProps<{
    text: string
    /** ms for the whole string to lock in. */
    duration?: number
    /** Characters cycled through while scrambling. */
    charset?: string
    /** When to play: on mount, when scrolled into view, or on hover / focus. */
    trigger?: 'mount' | 'view' | 'hover'
    tag?: string
  }>(),
  {
    duration: 900,
    charset: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%&*+<>/\\=?',
    trigger: 'view',
    tag: 'span',
  },
)

const emit = defineEmits<{ done: [] }>()

interface Cell {
  char: string
  locked: boolean
}

const root = ref<HTMLElement>()
const cells = ref<Cell[]>([...props.text].map((char) => ({ char, locked: true })))
const running = ref(false)
let frame = 0
let stopObserving: (() => void) | undefined

const random = () => props.charset[Math.floor(Math.random() * props.charset.length)] ?? ''

function play() {
  cancelAnimationFrame(frame)
  const chars = [...props.text]
  if (prefersReducedMotion() || props.duration <= 0) {
    cells.value = chars.map((char) => ({ char, locked: true }))
    emit('done')
    return
  }
  running.value = true
  const start = performance.now()
  let last = 0
  const tick = (now: number) => {
    const t = Math.min(1, (now - start) / props.duration)
    // Re-roll the scramble ~30 times a second, not every frame, so it reads as glyphs.
    if (now - last > 33 || t === 1) {
      last = now
      const lockedCount = Math.floor(t * chars.length)
      cells.value = chars.map((char, i) => {
        if (i < lockedCount || /\s/.test(char)) return { char, locked: true }
        return { char: random(), locked: false }
      })
    }
    if (t < 1) frame = requestAnimationFrame(tick)
    else {
      cells.value = chars.map((char) => ({ char, locked: true }))
      running.value = false
      emit('done')
    }
  }
  frame = requestAnimationFrame(tick)
}

onMounted(() => {
  if (props.trigger === 'mount') play()
  else if (props.trigger === 'view' && root.value) stopObserving = observeInView(root.value, play)
})

watch(() => props.text, play)

onBeforeUnmount(() => {
  cancelAnimationFrame(frame)
  stopObserving?.()
})

function onHover() {
  if (props.trigger === 'hover' && !running.value) play()
}

defineExpose({ play })
</script>

<template>
  <component
    :is="tag"
    ref="root"
    :class="['ml-decrypt', { 'ml-decrypt--running': running }]"
    :aria-label="text"
    @mouseenter="onHover"
    @focusin="onHover"
  >
    <span
      v-for="(cell, i) in cells"
      :key="i"
      :class="['ml-decrypt__char', { 'ml-decrypt__char--scrambled': !cell.locked }]"
      aria-hidden="true"
    >{{ cell.char }}</span>
  </component>
</template>
