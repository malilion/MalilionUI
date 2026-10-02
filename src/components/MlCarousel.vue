<script setup lang="ts" generic="T">
import { computed, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'
import MlIcon from './MlIcon.vue'

const props = withDefaults(
  defineProps<{
    items: T[]
    /** ms between slides; 0 turns autoplay off. */
    autoplay?: number
    /** Wrap around at either end. */
    loop?: boolean
    arrows?: boolean
    indicators?: boolean
    /** Number → px, or any CSS length. */
    height?: number | string
    /** Accessible name for the carousel. */
    label?: string
  }>(),
  { autoplay: 0, loop: true, arrows: true, indicators: true, height: 280, label: '輪播' },
)

const index = defineModel<number>('index', { default: 0 })

const id = `ml-carousel-${useId()}`
const root = ref<HTMLElement>()
const total = computed(() => props.items.length)
/** Paused by the user (button), or temporarily by hover / focus. */
const userPaused = ref(false)
const hovering = ref(false)
const focused = ref(false)
const playing = computed(() => props.autoplay > 0 && !userPaused.value && !hovering.value && !focused.value && total.value > 1)

const canPrev = computed(() => props.loop || index.value > 0)
const canNext = computed(() => props.loop || index.value < total.value - 1)

function go(to: number) {
  if (!total.value) return
  index.value = props.loop ? (to + total.value) % total.value : Math.min(total.value - 1, Math.max(0, to))
}

const prev = () => canPrev.value && go(index.value - 1)
const next = () => canNext.value && go(index.value + 1)

let timer: ReturnType<typeof setInterval> | undefined
function restart() {
  clearInterval(timer)
  if (!playing.value) return
  timer = setInterval(() => {
    if (!props.loop && index.value >= total.value - 1) go(0)
    else next()
  }, props.autoplay)
}
watch([playing, index, () => props.autoplay], restart)
onMounted(restart)
onBeforeUnmount(() => clearInterval(timer))

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'ArrowLeft') {
    event.preventDefault()
    prev()
  } else if (event.key === 'ArrowRight') {
    event.preventDefault()
    next()
  }
}

function onFocusOut(event: FocusEvent) {
  if (!root.value?.contains(event.relatedTarget as Node | null)) focused.value = false
}

// Swipe / drag
const dragX = ref(0)
let start: { x: number; y: number; id: number } | null = null
function onPointerDown(event: PointerEvent) {
  if (event.pointerType === 'mouse' && event.button !== 0) return
  start = { x: event.clientX, y: event.clientY, id: event.pointerId }
}
function onPointerMove(event: PointerEvent) {
  if (!start || event.pointerId !== start.id) return
  const dx = event.clientX - start.x
  if (Math.abs(dx) > Math.abs(event.clientY - start.y)) dragX.value = dx
}
function onPointerUp() {
  if (!start) return
  const width = root.value?.clientWidth ?? 1
  if (dragX.value < -width * 0.18) next()
  else if (dragX.value > width * 0.18) prev()
  dragX.value = 0
  start = null
}

const trackStyle = computed(() => ({
  transform: `translateX(calc(${-index.value * 100}% + ${dragX.value}px))`,
  transition: dragX.value ? 'none' : undefined,
}))
const len = (v: number | string) => (typeof v === 'number' ? `${v}px` : v)
</script>

<template>
  <section
    ref="root"
    class="ml-carousel"
    aria-roledescription="carousel"
    :aria-label="label"
    :style="{ '--_h': len(height) }"
    @mouseenter="hovering = true"
    @mouseleave="hovering = false"
    @focusin="focused = true"
    @focusout="onFocusOut"
    @keydown="onKeydown"
  >
    <div
      class="ml-carousel__viewport"
      :aria-live="playing ? 'off' : 'polite'"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
      @pointerleave="onPointerUp"
    >
      <div class="ml-carousel__track" :style="trackStyle">
        <div
          v-for="(item, i) in items"
          :id="`${id}-slide-${i}`"
          :key="i"
          class="ml-carousel__slide"
          role="group"
          aria-roledescription="slide"
          :aria-label="`${i + 1} / ${total}`"
          :inert="i !== index || undefined"
          :aria-hidden="i !== index || undefined"
        >
          <slot :item="item" :index="i" :active="i === index" />
        </div>
      </div>
    </div>

    <template v-if="arrows && total > 1">
      <button type="button" class="ml-carousel__arrow ml-carousel__arrow--prev" aria-label="上一張" :aria-controls="`${id}-slide-${index}`" :disabled="!canPrev" @click="prev">
        <MlIcon name="chevronLeft" />
      </button>
      <button type="button" class="ml-carousel__arrow ml-carousel__arrow--next" aria-label="下一張" :aria-controls="`${id}-slide-${index}`" :disabled="!canNext" @click="next">
        <MlIcon name="chevronRight" />
      </button>
    </template>

    <div v-if="(indicators || autoplay) && total > 1" class="ml-carousel__bar">
      <button
        v-if="autoplay"
        type="button"
        class="ml-carousel__play"
        :aria-label="userPaused ? '開始自動播放' : '暫停自動播放'"
        @click="userPaused = !userPaused"
      >
        <MlIcon :name="userPaused ? 'play' : 'pause'" />
      </button>
      <div v-if="indicators" class="ml-carousel__dots">
        <button
          v-for="(_, i) in items"
          :key="i"
          type="button"
          :class="['ml-carousel__dot', { 'ml-carousel__dot--active': i === index }]"
          :aria-label="`第 ${i + 1} 張`"
          :aria-current="i === index || undefined"
          :style="i === index && playing ? { '--_dur': `${autoplay}ms` } : undefined"
          @click="go(i)"
        >
          <span class="ml-carousel__dot-fill" />
        </button>
      </div>
    </div>
  </section>
</template>
