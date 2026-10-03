<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, useId, watch } from 'vue'
import MlIcon from './MlIcon.vue'
import {
  CROP_HANDLES,
  boxBounds,
  boxStyle,
  clampView,
  coverScale,
  cropData,
  drawCrop,
  fitBoxToAspect,
  fitScale,
  imageStyle,
  initialLayout,
  layoutFromData,
  moveBox,
  outputSize,
  previewStyles,
  resizeBox,
  rotateView,
  zoomView,
  type CropHandle,
  type CropView,
  type MlCropData,
  type MlCropOutput,
  type Rect,
  type Size,
} from './cropper'
import { useLocale } from '../locale'

const loc = useLocale()

const props = withDefaults(
  defineProps<{
    /** Image URL, or a File / Blob (e.g. straight from MlUpload). */
    src?: string | Blob | null
    /** Crop box width / height, e.g. 1 for avatars, 16 / 9 for covers. Omit for free. */
    aspectRatio?: number
    /** circle masks the box (and forces a 1 : 1 box) — export with { circle: true } for round PNGs. */
    shape?: 'rect' | 'circle'
    /** Smallest crop box side, in on-screen px. */
    minSize?: number
    /** Viewport height: px number or any CSS length. */
    height?: number | string
    /** Most zoom, relative to the whole image fitting the viewport. */
    maxZoom?: number
    /** Rule-of-thirds guides inside the box. */
    grid?: boolean
    /** Rotate / zoom toolbar under the viewport. */
    toolbar?: boolean
    disabled?: boolean
    /** Set to 'anonymous' for cross-origin URLs, or exporting taints the canvas. */
    crossOrigin?: '' | 'anonymous' | 'use-credentials'
    /** Alt text of the source image. */
    alt?: string
  }>(),
  { shape: 'rect', minSize: 32, height: 320, maxZoom: 4, grid: true, toolbar: true },
)

const emit = defineEmits<{
  /** Every change of the crop box, zoom, pan or rotation. */
  change: [data: MlCropData]
  /** The image loaded; its natural (EXIF-oriented) size. */
  ready: [size: Size]
  error: []
}>()

const hintId = `ml-cropper-${useId()}-hint`
const stage = ref<HTMLElement>()
const img = ref<HTMLImageElement>()
const boxEl = ref<HTMLElement>()
const url = ref<string | undefined>(typeof props.src === 'string' ? props.src || undefined : undefined)
const natural = shallowRef<Size | null>(null)
const stageSize = shallowRef<Size>({ width: 0, height: 0 })
const view = shallowRef<CropView>({ x: 0, y: 0, scale: 1, rotate: 0 })
const box = shallowRef<Rect>({ x: 0, y: 0, width: 0, height: 0 })
const ready = ref(false)
const failed = ref(false)
const announce = ref('')
let objectUrl: string | null = null
let bitmap: ImageBitmap | null = null

const aspect = computed(() => (props.shape === 'circle' ? 1 : props.aspectRatio && props.aspectRatio > 0 ? props.aspectRatio : undefined))
const cssHeight = computed(() => (typeof props.height === 'number' ? `${props.height}px` : props.height))
const fit = computed(() => (natural.value ? fitScale(stageSize.value, natural.value, view.value.rotate) : 1))
const zoom = computed(() => view.value.scale / fit.value)
const minZoom = computed(() =>
  natural.value ? Math.min(props.maxZoom, coverScale(box.value, natural.value, view.value.rotate) / fit.value) : 1,
)
const data = computed<MlCropData | null>(() =>
  ready.value && natural.value ? cropData(view.value, natural.value, box.value, fit.value) : null,
)
const active = computed(() => ready.value && !props.disabled)

/** Slot helper: styles for a live preview `size` px wide (frame + <img>). */
function styles(size: number) {
  if (!data.value || !natural.value) return { frame: { width: `${size}px`, height: `${size}px` }, image: { display: 'none' } }
  return previewStyles(data.value, natural.value, size)
}

function emitChange() {
  if (data.value) emit('change', data.value)
}

function say() {
  const d = data.value
  if (d) announce.value = loc.value.cropper.status(d.width, d.height, d.x, d.y, Math.round(zoom.value * 100))
}

/* ── Source ──────────────────────────────────────────────── */
function setSource(src: string | Blob | null | undefined) {
  if (objectUrl) URL.revokeObjectURL(objectUrl)
  objectUrl = null
  bitmap?.close?.()
  bitmap = null
  ready.value = false
  natural.value = null
  failed.value = false
  if (!src) url.value = undefined
  else if (typeof src === 'string') url.value = src
  else {
    objectUrl = URL.createObjectURL(src)
    url.value = objectUrl
    // A bitmap honours EXIF orientation for the export (the <img> does for display).
    if (typeof createImageBitmap === 'function') {
      const mine = objectUrl
      createImageBitmap(src, { imageOrientation: 'from-image' })
        .then((b) => (objectUrl === mine ? (bitmap = b) : b.close()))
        .catch(() => {})
    }
  }
}
watch(() => props.src, setSource)

function measure() {
  const el = stage.value
  if (el) stageSize.value = { width: el.clientWidth, height: el.clientHeight }
}

function layout() {
  if (!natural.value || !stageSize.value.width || !stageSize.value.height) return
  const next = initialLayout(stageSize.value, natural.value, aspect.value)
  view.value = next.view
  box.value = next.box
  ready.value = true
}

function onLoad() {
  const el = img.value
  if (!el?.naturalWidth) return
  failed.value = false
  natural.value = { width: el.naturalWidth, height: el.naturalHeight }
  measure()
  layout()
  emit('ready', natural.value)
  emitChange()
}

function onError() {
  failed.value = true
  ready.value = false
  emit('error')
}

watch(aspect, (a) => {
  if (!ready.value || !natural.value) return
  box.value = fitBoxToAspect(box.value, a, boxBounds(view.value, natural.value, stageSize.value))
  view.value = clampView(view.value, natural.value, box.value)
  emitChange()
})

/* ── Actions ─────────────────────────────────────────────── */
function zoomTo(nextZoom: number, anchor?: { x: number; y: number }) {
  if (!ready.value || !natural.value) return
  const at = anchor ?? { x: box.value.x + box.value.width / 2, y: box.value.y + box.value.height / 2 }
  view.value = zoomView(view.value, natural.value, box.value, nextZoom * fit.value, at, props.maxZoom * fit.value)
  emitChange()
}
const zoomBy = (factor: number, anchor?: { x: number; y: number }) => zoomTo(zoom.value * factor, anchor)

function rotate(delta = 90) {
  if (!ready.value || !natural.value) return
  view.value = rotateView(view.value, natural.value, box.value, delta)
  // A turn can push the image past the max zoom of the new fit; keep the box inside the image.
  box.value = moveBox(box.value, 0, 0, boxBounds(view.value, natural.value, stageSize.value))
  emitChange()
  say()
}

function reset() {
  if (!natural.value) return
  layout()
  emitChange()
  say()
}

function getData(): MlCropData | null {
  return data.value
}

function setData(next: Partial<MlCropData>) {
  if (!ready.value || !natural.value || !data.value) return
  const merged = { ...data.value, ...next }
  const l = layoutFromData(stageSize.value, natural.value, merged, props.maxZoom)
  view.value = l.view
  box.value = aspect.value ? fitBoxToAspect(l.box, aspect.value, boxBounds(l.view, natural.value, stageSize.value)) : l.box
  emitChange()
}

/** A canvas holding the crop, at the crop's pixel size unless `output` says otherwise. */
function getCanvas(output: MlCropOutput = {}): HTMLCanvasElement | null {
  const d = data.value
  const n = natural.value
  if (!d || !n || !img.value) return null
  const size = outputSize(d, output)
  const canvas = document.createElement('canvas')
  canvas.width = size.width
  canvas.height = size.height
  let ctx: CanvasRenderingContext2D | null = null
  try {
    ctx = canvas.getContext('2d')
  } catch {
    ctx = null
  }
  if (!ctx) return null
  const source = bitmap && bitmap.width === n.width && bitmap.height === n.height ? bitmap : img.value
  drawCrop(ctx, source, n, d, size, output)
  return canvas
}

function toBlob(type = 'image/png', quality?: number, output?: MlCropOutput): Promise<Blob | null> {
  const canvas = getCanvas(output)
  if (!canvas) return Promise.resolve(null)
  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob(resolve, type, quality)
    } catch (err) {
      reject(err)
    }
  })
}

function toDataURL(type = 'image/png', quality?: number, output?: MlCropOutput): string {
  return getCanvas(output)?.toDataURL(type, quality) ?? ''
}

defineExpose({ getCanvas, toBlob, toDataURL, getData, setData, reset, rotate, zoomTo })

/* ── Pointer: move / resize the box, pan the image, pinch ─── */
type Gesture =
  | { kind: 'move' | 'resize' | 'pan'; handle?: CropHandle; start: { x: number; y: number }; box: Rect; view: CropView }
  | { kind: 'pinch'; dist: number; scale: number }
const pointers = new Map<number, { x: number; y: number }>()
let gesture: Gesture | null = null

function local(event: { clientX: number; clientY: number }) {
  const rect = stage.value!.getBoundingClientRect()
  return { x: event.clientX - rect.left, y: event.clientY - rect.top }
}

function startSingle(p: { x: number; y: number }, target: Element | null) {
  const handle = target?.closest('[data-handle]')?.getAttribute('data-handle') as CropHandle | null
  const kind = handle ? 'resize' : target?.closest('.ml-cropper__box') ? 'move' : 'pan'
  gesture = { kind, handle: handle ?? undefined, start: p, box: box.value, view: view.value }
}

function onDown(event: PointerEvent) {
  if (!active.value || (event.pointerType === 'mouse' && event.button !== 0)) return
  event.preventDefault()
  boxEl.value?.focus({ preventScroll: true })
  stage.value?.setPointerCapture?.(event.pointerId)
  pointers.set(event.pointerId, local(event))
  if (pointers.size === 2) {
    const [a, b] = [...pointers.values()]
    gesture = { kind: 'pinch', dist: Math.hypot(a.x - b.x, a.y - b.y) || 1, scale: view.value.scale }
  } else if (pointers.size === 1) {
    startSingle(local(event), event.target as Element | null)
  }
}

function onMove(event: PointerEvent) {
  if (!pointers.has(event.pointerId) || !gesture || !natural.value) return
  const p = local(event)
  pointers.set(event.pointerId, p)
  const n = natural.value
  if (gesture.kind === 'pinch') {
    if (pointers.size < 2) return
    const [a, b] = [...pointers.values()]
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
    const scale = (gesture.scale * Math.hypot(a.x - b.x, a.y - b.y)) / gesture.dist
    view.value = zoomView(view.value, n, box.value, scale, mid, props.maxZoom * fit.value)
  } else {
    const dx = p.x - gesture.start.x
    const dy = p.y - gesture.start.y
    if (gesture.kind === 'move') box.value = moveBox(gesture.box, dx, dy, boxBounds(view.value, n, stageSize.value))
    else if (gesture.kind === 'resize')
      box.value = resizeBox(gesture.box, gesture.handle!, dx, dy, {
        bounds: boxBounds(view.value, n, stageSize.value),
        aspect: aspect.value,
        minSize: props.minSize,
      })
    else view.value = clampView({ ...gesture.view, x: gesture.view.x + dx, y: gesture.view.y + dy }, n, box.value)
  }
  emitChange()
}

function onUp(event: PointerEvent) {
  if (!pointers.delete(event.pointerId)) return
  if (pointers.size === 1) {
    // Lifting one finger of a pinch: carry on panning with the other.
    const [p] = [...pointers.values()]
    gesture = { kind: 'pan', start: p, box: box.value, view: view.value }
  } else if (!pointers.size) gesture = null
}

function onWheel(event: WheelEvent) {
  if (!active.value) return
  event.preventDefault()
  const delta = event.deltaY * (event.deltaMode === 1 ? 16 : 1)
  zoomBy(Math.exp(-delta * 0.0015), local(event))
}

/* ── Keyboard on the box ─────────────────────────────────── */
const ARROWS: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }

function onBoxKey(event: KeyboardEvent) {
  if (!active.value || !natural.value) return
  const arrow = ARROWS[event.key]
  if (arrow) {
    const step = event.shiftKey ? 10 : 1
    const bounds = boxBounds(view.value, natural.value, stageSize.value)
    box.value = event.altKey
      ? resizeBox(box.value, 'se', arrow[0] * step, arrow[1] * step, { bounds, aspect: aspect.value, minSize: props.minSize })
      : moveBox(box.value, arrow[0] * step, arrow[1] * step, bounds)
    emitChange()
  } else if (event.key === '+' || event.key === '=') zoomBy(1.1)
  else if (event.key === '-' || event.key === '_') zoomBy(1 / 1.1)
  else return
  event.preventDefault()
  say()
}

function onRange(event: Event) {
  zoomTo(Number((event.target as HTMLInputElement).value))
}

/* ── Lifecycle ───────────────────────────────────────────── */
let resizeObserver: ResizeObserver | undefined

onMounted(() => {
  if (props.src && typeof props.src !== 'string') setSource(props.src)
  measure()
  // The image may have loaded before hydration attached @load.
  if (img.value?.complete && img.value.naturalWidth) onLoad()
  if (typeof ResizeObserver !== 'undefined' && stage.value) {
    resizeObserver = new ResizeObserver(() => requestAnimationFrame(() => {
      const el = stage.value
      if (!el || (el.clientWidth === stageSize.value.width && el.clientHeight === stageSize.value.height)) return
      const before = data.value
      measure()
      if (!natural.value) return
      if (!ready.value || !before) return layout()
      const l = layoutFromData(stageSize.value, natural.value, before, props.maxZoom)
      view.value = l.view
      box.value = l.box
    }))
    resizeObserver.observe(stage.value)
  }
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  if (objectUrl) URL.revokeObjectURL(objectUrl)
  bitmap?.close?.()
})
</script>

<template>
  <div
    :class="['ml-cropper', `ml-cropper--${shape}`, { 'ml-cropper--ready': ready, 'ml-cropper--disabled': disabled }]"
    role="group"
    :aria-label="loc.cropper.label"
  >
    <div class="ml-cropper__main">
      <div
        ref="stage"
        class="ml-cropper__stage"
        :style="{ '--_h': cssHeight }"
        @pointerdown="onDown"
        @pointermove="onMove"
        @pointerup="onUp"
        @pointercancel="onUp"
        @wheel="onWheel"
      >
        <img
          v-if="url"
          ref="img"
          :class="['ml-cropper__img', { 'ml-cropper__img--pending': !ready }]"
          :src="url"
          :alt="alt ?? ''"
          :crossorigin="crossOrigin"
          draggable="false"
          :style="ready && natural ? imageStyle(view, natural) : undefined"
          @load="onLoad"
          @error="onError"
        />
        <div
          v-if="ready"
          ref="boxEl"
          class="ml-cropper__box"
          role="group"
          :aria-label="loc.cropper.box"
          :aria-describedby="hintId"
          :tabindex="disabled ? -1 : 0"
          :style="boxStyle(box)"
          @keydown="onBoxKey"
        >
          <span v-if="grid" class="ml-cropper__grid" aria-hidden="true" />
          <span
            v-for="h in CROP_HANDLES"
            :key="h"
            :class="['ml-cropper__handle', `ml-cropper__handle--${h}`]"
            :data-handle="h"
            aria-hidden="true"
          />
        </div>
        <p v-if="!url || failed" class="ml-cropper__empty">
          <MlIcon name="file" />
          <span>{{ failed ? loc.cropper.error : loc.cropper.empty }}</span>
        </p>
      </div>

      <div v-if="toolbar" class="ml-cropper__toolbar" role="toolbar" :aria-label="loc.cropper.toolbar">
        <button type="button" class="ml-cropper__btn ml-cropper__btn--flip" :aria-label="loc.cropper.rotateLeft" :title="loc.cropper.rotateLeft" :disabled="!active" @click="rotate(-90)">
          <MlIcon name="rotate" />
        </button>
        <button type="button" class="ml-cropper__btn" :aria-label="loc.cropper.zoomOut" :title="loc.cropper.zoomOut" :disabled="!active || zoom <= minZoom + 0.001" @click="zoomBy(1 / 1.2)">
          <MlIcon name="minus" />
        </button>
        <input
          type="range"
          class="ml-cropper__zoom"
          :aria-label="loc.cropper.zoom"
          :aria-valuetext="`${Math.round(zoom * 100)}%`"
          :min="minZoom.toFixed(2)"
          :max="maxZoom"
          step="0.01"
          :value="zoom.toFixed(2)"
          :disabled="!active"
          @input="onRange"
        />
        <button type="button" class="ml-cropper__btn" :aria-label="loc.cropper.zoomIn" :title="loc.cropper.zoomIn" :disabled="!active || zoom >= maxZoom - 0.001" @click="zoomBy(1.2)">
          <MlIcon name="plus" />
        </button>
        <button type="button" class="ml-cropper__btn" :aria-label="loc.cropper.rotateRight" :title="loc.cropper.rotateRight" :disabled="!active" @click="rotate(90)">
          <MlIcon name="rotate" />
        </button>
        <button type="button" class="ml-cropper__btn" :aria-label="loc.cropper.reset" :title="loc.cropper.reset" :disabled="!active" @click="reset">
          <MlIcon name="expand" />
        </button>
        <span class="ml-cropper__readout" aria-hidden="true">{{ data ? `${data.width} × ${data.height}` : '—' }}</span>
      </div>
    </div>

    <div v-if="$slots.preview" class="ml-cropper__aside">
      <slot name="preview" :data="data" :src="url" :styles="styles" />
    </div>

    <p :id="hintId" class="ml-visually-hidden">{{ loc.cropper.hint }}</p>
    <p class="ml-visually-hidden" aria-live="polite">{{ announce }}</p>
  </div>
</template>
