<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'

const props = withDefaults(
  defineProps<{
    /** Fixed height: px number or any CSS length. */
    height?: number | string
    /** Grow with the content up to this height, then scroll. */
    maxHeight?: number | string
    /** Which way the content may scroll. */
    direction?: 'vertical' | 'horizontal' | 'both'
    /** Keep the bars visible instead of fading out when idle. */
    always?: boolean
    /** Smallest thumb length in px. */
    minThumb?: number
    /** `reach-end` fires when the end is this many px away. */
    distance?: number
    /** Accessible name; also makes the scroll area a labelled region. */
    label?: string
    /** Extra class on the content wrapper. */
    viewClass?: string
  }>(),
  { direction: 'both', always: false, minThumb: 24, distance: 20 },
)

const emit = defineEmits<{
  scroll: [pos: { scrollTop: number; scrollLeft: number }]
  'reach-end': [axis: 'y' | 'x']
}>()

const wrap = ref<HTMLElement>()
const view = ref<HTMLElement>()
const trackY = ref<HTMLElement>()
const trackX = ref<HTMLElement>()

// Thumb geometry in px; zero size = nothing to scroll on that axis.
const y = reactive({ size: 0, offset: 0 })
const x = reactive({ size: 0, offset: 0 })
const active = ref(false)
const dragging = ref<'y' | 'x' | null>(null)

const len = (v: number | string | undefined) => (typeof v === 'number' ? `${v}px` : v)
const wrapStyle = computed(() => ({ height: len(props.height), maxHeight: len(props.maxHeight) }))

const reduceMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/** Recompute thumb sizes and positions from the wrapper's scroll metrics. */
function update() {
  const el = wrap.value
  if (!el) return
  const trackLen = (t: HTMLElement | undefined, fallback: number, vertical: boolean) =>
    (vertical ? t?.clientHeight : t?.clientWidth) || fallback
  const calc = (viewLen: number, contentLen: number, pos: number, track: number) => {
    if (contentLen - viewLen < 1 || viewLen <= 0) return { size: 0, offset: 0 }
    const size = Math.min(track, Math.max(props.minThumb, (viewLen / contentLen) * track))
    const offset = (pos / (contentLen - viewLen)) * (track - size)
    return { size, offset: Math.max(0, Math.min(track - size, offset)) }
  }
  Object.assign(
    y,
    props.direction === 'horizontal'
      ? { size: 0, offset: 0 }
      : calc(el.clientHeight, el.scrollHeight, el.scrollTop, trackLen(trackY.value, el.clientHeight, true)),
  )
  Object.assign(
    x,
    props.direction === 'vertical'
      ? { size: 0, offset: 0 }
      : calc(el.clientWidth, el.scrollWidth, el.scrollLeft, trackLen(trackX.value, el.clientWidth, false)),
  )
}

let idle: ReturnType<typeof setTimeout> | undefined
let atEndY = false
let atEndX = false
function onScroll() {
  const el = wrap.value
  if (!el) return
  update()
  active.value = true
  clearTimeout(idle)
  idle = setTimeout(() => (active.value = false), 900)
  emit('scroll', { scrollTop: el.scrollTop, scrollLeft: el.scrollLeft })
  // Fire once per arrival at the end; leaving the end zone re-arms it.
  const endY = y.size > 0 && el.scrollTop + el.clientHeight >= el.scrollHeight - props.distance
  const endX = x.size > 0 && el.scrollLeft + el.clientWidth >= el.scrollWidth - props.distance
  if (endY && !atEndY) emit('reach-end', 'y')
  if (endX && !atEndX) emit('reach-end', 'x')
  atEndY = endY
  atEndX = endX
}

/* ── Dragging a thumb ─────────────────────────────────── */
let start = { pointer: 0, scroll: 0 }
function startDrag(event: PointerEvent, ax: 'y' | 'x') {
  const el = wrap.value
  if (!el || event.button !== 0) return
  event.preventDefault()
  dragging.value = ax
  start = ax === 'y' ? { pointer: event.clientY, scroll: el.scrollTop } : { pointer: event.clientX, scroll: el.scrollLeft }
  ;(event.currentTarget as Element).setPointerCapture?.(event.pointerId)
}
function onDrag(event: PointerEvent, ax: 'y' | 'x') {
  const el = wrap.value
  if (!el || dragging.value !== ax) return
  const geo = ax === 'y' ? y : x
  const track = (ax === 'y' ? trackY.value?.clientHeight : trackX.value?.clientWidth) || (ax === 'y' ? el.clientHeight : el.clientWidth)
  const room = track - geo.size
  if (room <= 0) return
  const range = ax === 'y' ? el.scrollHeight - el.clientHeight : el.scrollWidth - el.clientWidth
  const delta = ((ax === 'y' ? event.clientY : event.clientX) - start.pointer) * (range / room)
  if (ax === 'y') el.scrollTop = start.scroll + delta
  else el.scrollLeft = start.scroll + delta
  update()
}
function endDrag(event: PointerEvent) {
  if (!dragging.value) return
  dragging.value = null
  ;(event.currentTarget as Element).releasePointerCapture?.(event.pointerId)
}

/* ── Clicking the track pages toward the pointer ──────── */
function onTrack(event: PointerEvent, ax: 'y' | 'x') {
  const el = wrap.value
  const track = event.currentTarget as HTMLElement
  if (!el || event.button !== 0 || event.target !== track) return
  const rect = track.getBoundingClientRect()
  const geo = ax === 'y' ? y : x
  const at = ax === 'y' ? event.clientY - rect.top : event.clientX - rect.left
  const dir = at < geo.offset ? -1 : 1
  const behavior: ScrollBehavior = reduceMotion() ? 'auto' : 'smooth'
  const page = dir * (ax === 'y' ? el.clientHeight : el.clientWidth) * 0.9
  if (el.scrollBy) el.scrollBy(ax === 'y' ? { top: page, behavior } : { left: page, behavior })
  else if (ax === 'y') el.scrollTop += page
  else el.scrollLeft += page
}

let observer: ResizeObserver | undefined
onMounted(() => {
  update()
  if (typeof ResizeObserver !== 'undefined') {
    observer = new ResizeObserver(() => requestAnimationFrame(update))
    if (wrap.value) observer.observe(wrap.value)
    if (view.value) observer.observe(view.value)
    // Tracks resize when late-loading CSS arrives, even if the content doesn't.
    for (const t of [trackY.value, trackX.value]) if (t) observer.observe(t)
  }
})
onBeforeUnmount(() => {
  observer?.disconnect()
  clearTimeout(idle)
})

/** Scroll like Element.scrollTo; `behavior: 'smooth'` falls back to instant under reduced motion. */
function scrollTo(options: ScrollToOptions): void
function scrollTo(left: number, top: number): void
function scrollTo(a: ScrollToOptions | number, b?: number) {
  const el = wrap.value
  if (!el) return
  const opts: ScrollToOptions = typeof a === 'number' ? { left: a, top: b } : { ...a }
  if (opts.behavior === 'smooth' && reduceMotion()) opts.behavior = 'auto'
  if (el.scrollTo) el.scrollTo(opts)
  else {
    if (opts.top != null) el.scrollTop = opts.top
    if (opts.left != null) el.scrollLeft = opts.left
  }
  update()
}
function scrollToTop(smooth = true) {
  scrollTo({ top: 0, behavior: smooth ? 'smooth' : 'auto' })
}
function scrollToBottom(smooth = true) {
  scrollTo({ top: wrap.value?.scrollHeight ?? 0, behavior: smooth ? 'smooth' : 'auto' })
}

defineExpose({ scrollTo, scrollToTop, scrollToBottom, update, wrap })
</script>

<template>
  <div
    :class="[
      'ml-scrollbar',
      {
        'ml-scrollbar--always': always,
        'ml-scrollbar--active': active || dragging,
        'ml-scrollbar--dragging': dragging,
        'ml-scrollbar--has-y': y.size > 0,
        'ml-scrollbar--has-x': x.size > 0,
      },
    ]"
  >
    <div
      ref="wrap"
      :class="['ml-scrollbar__wrap', `ml-scrollbar__wrap--${direction}`]"
      :style="wrapStyle"
      :tabindex="y.size > 0 || x.size > 0 ? 0 : undefined"
      :role="label ? 'region' : undefined"
      :aria-label="label"
      @scroll="onScroll"
    >
      <div ref="view" :class="['ml-scrollbar__view', viewClass]">
        <slot />
      </div>
    </div>
    <!-- Decorative: the native scroll area underneath already handles keyboard, wheel, touch and screen readers -->
    <div
      v-if="direction !== 'horizontal'"
      ref="trackY"
      class="ml-scrollbar__track ml-scrollbar__track--y"
      aria-hidden="true"
      @pointerdown="onTrack($event, 'y')"
    >
      <div
        class="ml-scrollbar__thumb"
        :style="{ height: `${y.size}px`, transform: `translateY(${y.offset}px)` }"
        @pointerdown="startDrag($event, 'y')"
        @pointermove="onDrag($event, 'y')"
        @pointerup="endDrag"
        @pointercancel="endDrag"
      />
    </div>
    <div
      v-if="direction !== 'vertical'"
      ref="trackX"
      class="ml-scrollbar__track ml-scrollbar__track--x"
      aria-hidden="true"
      @pointerdown="onTrack($event, 'x')"
    >
      <div
        class="ml-scrollbar__thumb"
        :style="{ width: `${x.size}px`, transform: `translateX(${x.offset}px)` }"
        @pointerdown="startDrag($event, 'x')"
        @pointermove="onDrag($event, 'x')"
        @pointerup="endDrag"
        @pointercancel="endDrag"
      />
    </div>
  </div>
</template>
