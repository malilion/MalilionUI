<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, useId, watch } from 'vue'
import MlPaw from './MlPaw.vue'
import {
  cloneStrokes,
  drawSegments,
  drawStrokes,
  keepPoint,
  strokeSegments,
  strokesToSVG,
  type SignatureStroke,
} from './signature'
import { pawStamp } from '../pawStamp'
import { useLocale } from '../locale'

const loc = useLocale()

const props = withDefaults(
  defineProps<{
    /** Ink colour. Default: the theme's ink (gold on Night Pride, bronze on Daylight). */
    penColor?: string
    /** Thinnest / thickest line in CSS px; fast strokes thin out, slow ones (or pen pressure) swell. */
    minWidth?: number
    maxWidth?: number
    /** Paper colour, also baked into exports. Default transparent (the pad shows the theme surface). */
    background?: string
    /** Pad height: px number or any CSS length. */
    height?: number | string
    disabled?: boolean
    /** Accessible name of the pad. */
    label?: string
    /** Text shown on the empty pad. */
    placeholder?: string
    /** Pop a paw print where the first stroke ends. */
    paw?: boolean
  }>(),
  { minWidth: 0.75, maxWidth: 3, height: 200 },
)

const emit = defineEmits<{
  /** After every finished stroke, undo or clear: the PNG data URL, or null when empty. */
  change: [value: string | null]
  begin: []
  end: []
}>()

/** PNG data URL of the signature; null when empty. Setting it shows that image under new strokes. */
const model = defineModel<string | null>({ default: null })

const hintId = `ml-signature-${useId()}-hint`
const root = ref<HTMLElement>()
const pad = ref<HTMLElement>()
const canvas = ref<HTMLCanvasElement>()
const strokes = shallowRef<SignatureStroke[]>([])
/** A signature loaded through v-model (not drawn here): painted under the strokes. */
const base = ref<string | null>(null)
const drawing = ref(false)
const announce = ref('')
let baseImg: HTMLImageElement | null = null
let lastEmitted: string | null = null

const empty = computed(() => !strokes.value.length && !base.value)
const status = computed(() => (empty.value ? loc.value.signature.empty : loc.value.signature.signed(strokes.value.length || 1)))
const cssHeight = computed(() => (typeof props.height === 'number' ? `${props.height}px` : props.height))
const paper = computed(() => (props.background && props.background !== 'transparent' ? props.background : undefined))

/* ── Canvas plumbing ─────────────────────────────────────── */
let cssW = 0
let cssH = 0
let dpr = 1
/** Pad width the stroke coordinates were recorded at; a resize scales them. */
let baseWidth: number | null = null

function context(): CanvasRenderingContext2D | null {
  try {
    return canvas.value?.getContext('2d') ?? null
  } catch {
    return null // jsdom without the canvas package
  }
}

const scaleK = () => (baseWidth && cssW ? cssW / baseWidth : 1)
const ink = () => props.penColor || (canvas.value && getComputedStyle(canvas.value).color) || '#f9c757'

function measure() {
  const el = pad.value
  const c = canvas.value
  if (!el || !c) return
  cssW = el.clientWidth
  cssH = el.clientHeight
  dpr = window.devicePixelRatio || 1
  c.width = Math.max(1, Math.round(cssW * dpr))
  c.height = Math.max(1, Math.round(cssH * dpr))
  if (baseWidth == null && cssW && strokes.value.length) baseWidth = cssW
}

function redraw() {
  const ctx = context()
  const c = canvas.value
  if (!ctx || !c) return
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.clearRect(0, 0, c.width, c.height)
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  if (baseImg?.naturalWidth) ctx.drawImage(baseImg, 0, 0, cssW, (baseImg.naturalHeight * cssW) / baseImg.naturalWidth)
  const k = scaleK()
  ctx.setTransform(dpr * k, 0, 0, dpr * k, 0, 0)
  drawStrokes(ctx, strokes.value, ink())
}

function loadBase() {
  baseImg = null
  if (!base.value || typeof window === 'undefined') {
    redraw()
    return
  }
  const want = base.value
  const img = new Image()
  img.onload = () => {
    if (base.value !== want) return
    baseImg = img
    redraw()
  }
  img.src = want
}

// An outside value (initial or reset) replaces the drawing; our own echoes are ignored.
watch(
  model,
  (value) => {
    if (value === lastEmitted) return
    lastEmitted = value
    strokes.value = []
    baseWidth = null
    base.value = value || null
    loadBase()
  },
  { immediate: true },
)
watch(() => [props.penColor, props.background], redraw)

/* ── Output ──────────────────────────────────────────────── */
/** Image of the pad at device resolution. JPEG without a background gets white paper. */
function toDataURL(type = 'image/png', quality?: number): string {
  const c = canvas.value
  if (!c || !context()) return ''
  try {
    // The paper is CSS on screen (so the signing line shows); bake it in here. JPEG has no alpha: white.
    const fill = paper.value ?? (type === 'image/jpeg' ? '#fff' : undefined)
    if (!fill) return c.toDataURL(type, quality)
    const out = document.createElement('canvas')
    out.width = c.width
    out.height = c.height
    const ctx = out.getContext('2d')
    if (!ctx) return ''
    ctx.fillStyle = fill
    ctx.fillRect(0, 0, out.width, out.height)
    ctx.drawImage(c, 0, 0)
    return out.toDataURL(type, quality)
  } catch {
    return '' // tainted or unsupported
  }
}

/** Resolution-independent SVG markup of the strokes (and any loaded image). */
function toSVG(): string {
  return strokesToSVG(strokes.value, {
    width: cssW || pad.value?.clientWidth || 0,
    height: cssH || pad.value?.clientHeight || 0,
    ink: ink(),
    background: paper.value,
    scale: scaleK(),
    image: base.value,
    imageSize: baseImg?.naturalWidth ? { width: baseImg.naturalWidth, height: baseImg.naturalHeight } : undefined,
  })
}

const isEmpty = () => empty.value
/** The raw strokes (CSS px at the width they were drawn), e.g. to store and replay with fromData(). */
const toData = () => cloneStrokes(strokes.value)

function commit(message?: string) {
  const value = empty.value ? null : toDataURL() || null
  lastEmitted = value
  model.value = value
  emit('change', value)
  announce.value = message ?? status.value
}

function clear() {
  strokes.value = []
  base.value = null
  baseImg = null
  baseWidth = null
  redraw()
  commit(loc.value.signature.cleared)
}

function undo() {
  if (!strokes.value.length) return
  strokes.value = strokes.value.slice(0, -1)
  redraw()
  commit()
}

/** Replace the drawing with saved strokes (from toData()). */
function fromData(data: SignatureStroke[]) {
  strokes.value = cloneStrokes(data)
  baseWidth = cssW || null
  redraw()
  commit()
}

defineExpose({ toDataURL, toSVG, isEmpty, clear, undo, fromData, toData })

/* ── Drawing ─────────────────────────────────────────────── */
let active: { stroke: SignatureStroke; drawn: number; id: number } | null = null

function addPoint(event: PointerEvent) {
  if (!active || !pad.value) return
  const rect = pad.value.getBoundingClientRect()
  const k = scaleK()
  const point = {
    x: (event.clientX - rect.left) / k,
    y: (event.clientY - rect.top) / k,
    time: event.timeStamp,
    ...(event.pointerType === 'pen' && event.pressure > 0 ? { pressure: event.pressure } : {}),
  }
  const pts = active.stroke.points
  if (keepPoint(pts[pts.length - 1], point)) pts.push(point)
}

/** Paint the segments that can no longer change; `all` adds the tail. */
function paint(all: boolean) {
  const ctx = context()
  if (!active || !ctx) return
  const segs = strokeSegments(active.stroke)
  const until = all ? segs.length : Math.max(0, segs.length - 1)
  if (until <= active.drawn) return
  const k = scaleK()
  ctx.setTransform(dpr * k, 0, 0, dpr * k, 0, 0)
  drawSegments(ctx, segs.slice(active.drawn, until), active.stroke.color || ink())
  active.drawn = until
}

function onDown(event: PointerEvent) {
  if (props.disabled || active || (event.pointerType === 'mouse' && event.button !== 0)) return
  event.preventDefault()
  pad.value?.setPointerCapture?.(event.pointerId)
  if (!cssW) measure()
  if (baseWidth == null) baseWidth = cssW || null
  const stroke: SignatureStroke = {
    points: [],
    minWidth: props.minWidth,
    maxWidth: props.maxWidth,
    ...(props.penColor ? { color: props.penColor } : {}),
  }
  strokes.value = [...strokes.value, stroke]
  active = { stroke, drawn: 0, id: event.pointerId }
  drawing.value = true
  addPoint(event)
  emit('begin')
}

function onMove(event: PointerEvent) {
  if (!active || event.pointerId !== active.id) return
  const samples = event.getCoalescedEvents?.() ?? []
  for (const e of samples.length ? samples : [event]) addPoint(e)
  paint(false)
}

function onUp(event: PointerEvent) {
  if (!active || event.pointerId !== active.id) return
  paint(true)
  const first = strokes.value.length === 1 && !base.value
  active = null
  drawing.value = false
  emit('end')
  commit()
  if (props.paw && first) pawStamp(event.clientX, event.clientY)
}

function onKeydown(event: KeyboardEvent) {
  if (props.disabled) return
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
    event.preventDefault()
    undo()
  } else if ((event.key === 'Delete' || event.key === 'Backspace') && event.target === root.value && !empty.value) {
    event.preventDefault()
    clear()
  }
}

/* ── Lifecycle ───────────────────────────────────────────── */
let resizeObserver: ResizeObserver | undefined
let themeObserver: MutationObserver | undefined

onMounted(() => {
  measure()
  redraw()
  if (typeof ResizeObserver !== 'undefined' && pad.value) {
    resizeObserver = new ResizeObserver(() => requestAnimationFrame(() => {
      if (!pad.value || (pad.value.clientWidth === cssW && pad.value.clientHeight === cssH)) return
      measure()
      redraw()
    }))
    resizeObserver.observe(pad.value)
  }
  // The themed ink lives in CSS: repaint when a theme switches.
  if (typeof MutationObserver !== 'undefined') {
    themeObserver = new MutationObserver(() => props.penColor || redraw())
    themeObserver.observe(document.documentElement, { attributes: true, subtree: true, attributeFilter: ['data-ml-theme'] })
  }
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  themeObserver?.disconnect()
})
</script>

<template>
  <div
    ref="root"
    :class="['ml-signature', { 'ml-signature--empty': empty, 'ml-signature--drawing': drawing, 'ml-signature--disabled': disabled }]"
    role="group"
    :aria-label="label ?? loc.signature.label"
    :aria-describedby="hintId"
    :aria-disabled="disabled ? 'true' : undefined"
    :tabindex="disabled ? -1 : 0"
    :style="{ '--_h': cssHeight, '--_paper': paper }"
    @keydown="onKeydown"
  >
    <div
      ref="pad"
      class="ml-signature__pad"
      @pointerdown="onDown"
      @pointermove="onMove"
      @pointerup="onUp"
      @pointercancel="onUp"
    >
      <span class="ml-signature__line" aria-hidden="true">
        <MlPaw class="ml-signature__mark" tone="current" :shine="false" />
      </span>
      <span v-if="empty" class="ml-signature__placeholder" aria-hidden="true">{{ placeholder ?? loc.signature.placeholder }}</span>
      <canvas ref="canvas" class="ml-signature__canvas" role="img" :aria-label="status" />
    </div>
    <div class="ml-signature__tools">
      <button
        type="button"
        class="ml-signature__tool"
        :aria-label="loc.signature.undo"
        :title="loc.signature.undo"
        :disabled="disabled || !strokes.length"
        @click="undo"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" stroke-linejoin="miter">
          <path d="M9 14L4 9l5-5M4 9h10.5a5.5 5.5 0 010 11H11" />
        </svg>
      </button>
      <button
        type="button"
        class="ml-signature__tool"
        :aria-label="loc.signature.clear"
        :title="loc.signature.clear"
        :disabled="disabled || empty"
        @click="clear"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" stroke-linejoin="miter">
          <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
        </svg>
      </button>
    </div>
    <p :id="hintId" class="ml-visually-hidden">{{ loc.signature.hint }}</p>
    <p class="ml-visually-hidden" aria-live="polite">{{ announce }}</p>
  </div>
</template>
