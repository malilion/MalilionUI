<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useLocale } from '../locale'
import { prefersReducedMotion } from '../composables'
import { pawBurst } from '../pawStamp'
import { scratchCleared, scratchPaint, scratchStroke, type MlScratchTone } from './scratch'

const loc = useLocale()

const props = withDefaults(
  defineProps<{
    /** Card size in px (it shrinks with a narrow container). */
    width?: number
    height?: number
    /** The coating's metal. */
    tone?: MlScratchTone
    /** Text printed on the coating. */
    coverText?: string
    /** Width of a scratch, px. */
    brush?: number
    /** Share scratched off (0–1) that reveals the rest. */
    threshold?: number
    /** Paw confetti on reveal. */
    confetti?: boolean
    disabled?: boolean
  }>(),
  { width: 300, height: 150, tone: 'gold', brush: 28, threshold: 0.5, confetti: true, disabled: false },
)

const revealed = defineModel<boolean>('revealed', { default: false })
const emit = defineEmits<{ reveal: []; progress: [ratio: number] }>()

const canvas = ref<HTMLCanvasElement>()
const root = ref<HTMLElement>()
const ready = ref(false)
const scratching = ref(false)
const announce = ref('')
let ctx: CanvasRenderingContext2D | null = null

function paint() {
  if (!canvas.value || revealed.value) return
  ctx = scratchPaint(canvas.value, props.width, props.height, props.tone, props.coverText ?? loc.value.scratch.cover, window.devicePixelRatio || 1)
  ready.value = !!ctx
}

onMounted(paint)
watch(() => [props.width, props.height, props.tone, props.coverText, loc.value.name], paint)
watch(revealed, (on) => {
  if (!on) {
    announce.value = ''
    requestAnimationFrame(paint)
  }
})

/** Clear the coating now. */
function reveal() {
  if (revealed.value) return
  revealed.value = true
  scratching.value = false
  announce.value = loc.value.scratch.revealed
  emit('reveal')
  if (props.confetti && root.value && !prefersReducedMotion()) {
    const r = root.value.getBoundingClientRect()
    pawBurst(r.left + r.width / 2, r.top + r.height / 2, { count: 18, spread: 360, power: Math.max(120, r.width * 0.5) })
  }
}

/** Put a fresh coating back. */
function reset() {
  revealed.value = false
}

/* ── Scratching ── */
let last: { x: number; y: number } | null = null
let moves = 0

function point(event: PointerEvent) {
  const r = canvas.value!.getBoundingClientRect()
  const k = props.width / (r.width || props.width)
  return { x: (event.clientX - r.left) * k, y: (event.clientY - r.top) * k }
}

function measure() {
  if (!ctx) return
  const ratio = scratchCleared(ctx)
  emit('progress', ratio)
  if (ratio >= props.threshold) reveal()
}

function onPointerDown(event: PointerEvent) {
  if (props.disabled || revealed.value || !ctx || event.button !== 0) return
  event.preventDefault()
  canvas.value!.setPointerCapture?.(event.pointerId)
  scratching.value = true
  last = point(event)
  scratchStroke(ctx, last, last, props.brush)
}

function onPointerMove(event: PointerEvent) {
  if (!scratching.value || !ctx || !last) return
  const p = point(event)
  scratchStroke(ctx, last, p, props.brush)
  last = p
  if (++moves % 8 === 0) measure()
}

function onPointerUp() {
  if (!scratching.value) return
  scratching.value = false
  last = null
  measure()
}

onBeforeUnmount(() => (ctx = null))

defineExpose({ reveal, reset })
</script>

<template>
  <div
    ref="root"
    :class="[
      'ml-scratch',
      `ml-scratch--${tone}`,
      { 'ml-scratch--ready': ready, 'ml-scratch--revealed': revealed, 'ml-scratch--scratching': scratching, 'ml-scratch--disabled': disabled },
    ]"
    :style="{ '--_w': `${width}px`, '--_ratio': `${width} / ${height}` }"
    role="group"
    :aria-label="loc.scratch.label"
  >
    <div class="ml-scratch__prize" :aria-hidden="revealed ? undefined : 'true'" :inert="!revealed">
      <slot />
    </div>
    <div class="ml-scratch__cover" aria-hidden="true">
      <span>{{ coverText ?? loc.scratch.cover }}</span>
    </div>
    <canvas
      ref="canvas"
      class="ml-scratch__canvas"
      aria-hidden="true"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
    />
    <button v-if="!revealed" type="button" class="ml-scratch__reveal" :disabled="disabled" :title="loc.scratch.hint" @click="reveal">
      {{ loc.scratch.revealNow }}
    </button>
    <p class="ml-visually-hidden" aria-live="polite">{{ announce }}</p>
  </div>
</template>
