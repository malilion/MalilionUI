<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import MlIcon from './MlIcon.vue'
import { trapFocus, useScrollLock } from '../composables'
import { useLocale } from '../locale'

const loc = useLocale()

const props = withDefaults(
  defineProps<{
    images: string[]
    /** Alt text per image (falls back to "圖片 n / total"). */
    alts?: string[]
    /** Wrap from the last image back to the first. */
    loop?: boolean
    /** Render in place instead of teleporting to <body>. */
    inline?: boolean
  }>(),
  { alts: () => [], loop: true },
)

const emit = defineEmits<{ close: [] }>()
const open = defineModel<boolean>('open', { default: false })
const index = defineModel<number>('index', { default: 0 })

const ZOOM_MIN = 0.25
const ZOOM_MAX = 4
const scale = ref(1)
const rotate = ref(0)
const offset = ref({ x: 0, y: 0 })
const root = ref<HTMLElement>()
let returnFocusTo: HTMLElement | null = null
const scrollLock = useScrollLock()

const total = computed(() => props.images.length)
const current = computed(() => props.images[index.value] ?? '')
const alt = computed(() => props.alts[index.value] ?? loc.value.preview.image(index.value + 1, total.value))
const canPrev = computed(() => total.value > 1 && (props.loop || index.value > 0))
const canNext = computed(() => total.value > 1 && (props.loop || index.value < total.value - 1))

function reset() {
  scale.value = 1
  rotate.value = 0
  offset.value = { x: 0, y: 0 }
}

function go(delta: 1 | -1) {
  if (delta < 0 ? !canPrev.value : !canNext.value) return
  index.value = (index.value + delta + total.value) % total.value
  reset()
}

function zoom(factor: number) {
  scale.value = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, +(scale.value * factor).toFixed(3)))
  if (scale.value <= 1) offset.value = { x: 0, y: 0 }
}

function close() {
  open.value = false
  emit('close')
}

function onKeydown(event: KeyboardEvent) {
  const actions: Record<string, () => void> = {
    Escape: close,
    ArrowLeft: () => go(-1),
    ArrowRight: () => go(1),
    '+': () => zoom(1.25),
    '=': () => zoom(1.25),
    '-': () => zoom(0.8),
    '0': reset,
    r: () => (rotate.value += 90),
  }
  const action = actions[event.key]
  if (action) {
    event.preventDefault()
    event.stopPropagation()
    action()
    return
  }
  if (root.value) trapFocus(event, root.value)
}

function onWheel(event: WheelEvent) {
  event.preventDefault()
  zoom(event.deltaY < 0 ? 1.1 : 0.9)
}

// Drag to pan once zoomed in.
let drag: { x: number; y: number; ox: number; oy: number } | null = null
function onPointerDown(event: PointerEvent) {
  if (scale.value <= 1) return
  drag = { x: event.clientX, y: event.clientY, ox: offset.value.x, oy: offset.value.y }
  ;(event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId)
}
function onPointerMove(event: PointerEvent) {
  if (!drag) return
  offset.value = { x: drag.ox + event.clientX - drag.x, y: drag.oy + event.clientY - drag.y }
}
function onPointerUp() {
  drag = null
}

watch(open, async (isOpen) => {
  if (isOpen) {
    returnFocusTo = document.activeElement as HTMLElement | null
    scrollLock.lock()
    reset()
    await nextTick()
    root.value?.focus()
  } else {
    scrollLock.unlock()
    returnFocusTo?.focus?.()
    returnFocusTo = null
  }
}, { immediate: true })

onBeforeUnmount(scrollLock.unlock)
</script>

<template>
  <Teleport to="body" :disabled="inline">
    <Transition name="ml-preview">
      <div
        v-if="open"
        ref="root"
        class="ml-preview"
        role="dialog"
        aria-modal="true"
        :aria-label="loc.preview.label"
        tabindex="-1"
        @keydown="onKeydown"
      >
        <div class="ml-preview__backdrop" @click="close" />
        <div
          class="ml-preview__stage"
          @wheel="onWheel"
          @pointerdown="onPointerDown"
          @pointermove="onPointerMove"
          @pointerup="onPointerUp"
          @pointercancel="onPointerUp"
          @click.self="close"
        >
          <img
            :key="current"
            :src="current"
            :alt="alt"
            class="ml-preview__img"
            :class="{ 'ml-preview__img--grab': scale > 1 }"
            draggable="false"
            :style="{
              transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale}) rotate(${rotate}deg)`,
            }"
          />
        </div>

        <p v-if="total > 1" class="ml-preview__counter" aria-live="polite">
          {{ String(index + 1).padStart(2, '0') }} <span>/ {{ String(total).padStart(2, '0') }}</span>
        </p>

        <button type="button" class="ml-preview__btn ml-preview__close" :aria-label="loc.preview.close" @click="close">
          <MlIcon name="close" />
        </button>
        <template v-if="total > 1">
          <button type="button" class="ml-preview__btn ml-preview__nav ml-preview__nav--prev" :aria-label="loc.common.prev" :disabled="!canPrev" @click="go(-1)">
            <MlIcon name="chevronLeft" />
          </button>
          <button type="button" class="ml-preview__btn ml-preview__nav ml-preview__nav--next" :aria-label="loc.common.next" :disabled="!canNext" @click="go(1)">
            <MlIcon name="chevronRight" />
          </button>
        </template>

        <div class="ml-preview__toolbar" role="toolbar" :aria-label="loc.preview.toolbar">
          <button type="button" class="ml-preview__btn" :aria-label="loc.preview.zoomOut" :disabled="scale <= ZOOM_MIN" @click="zoom(0.8)">
            <MlIcon name="minus" />
          </button>
          <span class="ml-preview__zoom">{{ Math.round(scale * 100) }}%</span>
          <button type="button" class="ml-preview__btn" :aria-label="loc.preview.zoomIn" :disabled="scale >= ZOOM_MAX" @click="zoom(1.25)">
            <MlIcon name="plus" />
          </button>
          <button type="button" class="ml-preview__btn" :aria-label="loc.preview.rotate" @click="rotate += 90">
            <MlIcon name="rotate" />
          </button>
          <button type="button" class="ml-preview__btn" :aria-label="loc.preview.reset" @click="reset">
            <MlIcon name="expand" />
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
