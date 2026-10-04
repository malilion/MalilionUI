<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useLocale } from '../locale'
import { observeInView, prefersReducedMotion } from '../composables'
import {
  GLOBE_HOME,
  GLOBE_SIZE,
  globeArcPath,
  globeDots,
  globeDragScale,
  globeEase,
  globeFormatPoint,
  globeGraticule,
  globeLerpView,
  globeNormalize,
  globeProject,
  type GlobeView,
  type MlGlobeArc,
  type MlGlobeMarker,
  type MlGlobePoint,
  type MlGlobeTone,
} from './globe'

const loc = useLocale()

const props = withDefaults(
  defineProps<{
    /** Places to pin. */
    markers?: MlGlobeMarker[]
    /** Great-circle routes, drawn as rising arcs with a travelling glint. */
    arcs?: MlGlobeArc[]
    /** The point facing you at first (and after Home). Changing it flies there. Default: Taiwan. */
    center?: MlGlobePoint
    tone?: MlGlobeTone
    /** Width in px (it never overflows its container). */
    size?: number
    /** Spin on its own (not while dragged, hovered on a marker, or with reduced motion). */
    autoRotate?: boolean
    /** Degrees per second when spinning on its own; negative turns the other way. */
    speed?: number
    /** Drag to turn it. */
    draggable?: boolean
    /** Parallels and meridians every 30°. */
    graticule?: boolean
    /** Marker names drawn next to the dots. */
    labels?: boolean
    /** Glowing halo around the globe. */
    atmosphere?: boolean
    /** Clicking a marker (or Enter) turns it to the front. */
    flyToMarker?: boolean
    label?: string
  }>(),
  {
    markers: () => [],
    arcs: () => [],
    tone: 'gold',
    size: 360,
    autoRotate: true,
    speed: 8,
    draggable: true,
    graticule: true,
    labels: false,
    atmosphere: true,
    flyToMarker: true,
  },
)

const emit = defineEmits<{ select: [marker: MlGlobeMarker, index: number] }>()

const home = () => globeNormalize(props.center ?? GLOBE_HOME)
const view = ref<GlobeView>(home())

const dots = computed(() => globeDots(view.value))
const grid = computed(() => (props.graticule ? globeGraticule(view.value) : ''))
const routes = computed(() => props.arcs.map((a) => ({ d: globeArcPath(a, view.value), tone: a.tone ?? props.tone })))
const pins = computed(() =>
  props.markers.map((m, i) => {
    const p = globeProject(m, view.value)
    return {
      m,
      i,
      ...p,
      tone: m.tone ?? props.tone,
      r: m.size ?? 3,
      text: m.label ? loc.value.globe.marker(m.label, globeFormatPoint(m)) : globeFormatPoint(m),
    }
  }),
)
const summary = computed(() => `${props.label ?? loc.value.globe.summary(props.markers.length)}. ${loc.value.globe.hint}`)

const hovered = ref<number | null>(null)
const focused = ref<number | null>(null)
const tip = computed(() => {
  const i = hovered.value ?? focused.value
  const p = i === null ? undefined : pins.value[i]
  if (!p || !p.visible || !p.m.label) return null
  return { text: p.m.label, left: (p.x / GLOBE_SIZE) * 100, top: (p.y / GLOBE_SIZE) * 100 }
})

/* ── Motion: auto-rotate, drag with inertia, fly-to ──────── */
const svg = ref<SVGSVGElement>()
const dragging = ref(false)
let frame = 0
let last = 0
let inView = true
let velocity = { lat: 0, lng: 0 }
let flight: { from: GlobeView; to: GlobeView; t0: number; ms: number } | null = null
let stopObserving: (() => void) | undefined

function tick(now: number) {
  frame = 0
  const dt = last ? Math.min(0.05, (now - last) / 1000) : 0
  last = now
  let moving = false
  if (flight) {
    const t = Math.min(1, (now - flight.t0) / flight.ms)
    view.value = globeLerpView(flight.from, flight.to, globeEase(t))
    if (t >= 1) flight = null
    moving = true
  } else if (!dragging.value) {
    if (Math.abs(velocity.lat) + Math.abs(velocity.lng) > 0.5) {
      view.value = globeNormalize({ lat: view.value.lat + velocity.lat * dt, lng: view.value.lng + velocity.lng * dt })
      const k = Math.exp(-dt * 3.5)
      velocity = { lat: velocity.lat * k, lng: velocity.lng * k }
      moving = true
    } else if (spinning()) {
      view.value = globeNormalize({ lat: view.value.lat, lng: view.value.lng + props.speed * dt })
      moving = true
    }
  }
  if (moving) schedule()
  else last = 0
}

const spinning = () => props.autoRotate && inView && hovered.value === null && focused.value === null && !prefersReducedMotion()

function schedule() {
  if (!frame && typeof requestAnimationFrame !== 'undefined') frame = requestAnimationFrame(tick)
}

function flyTo(point: MlGlobePoint, ms = 900) {
  const to = globeNormalize(point)
  velocity = { lat: 0, lng: 0 }
  if (prefersReducedMotion()) {
    view.value = to
    flight = null
    return
  }
  flight = { from: view.value, to, t0: performance.now(), ms }
  schedule()
}

watch(
  () => [props.center?.lat, props.center?.lng],
  () => flyTo(home()),
)
watch(() => [props.autoRotate, props.speed], schedule)

onMounted(() => {
  if (svg.value) {
    stopObserving = observeInView(
      svg.value,
      () => {
        inView = true
        schedule()
      },
      { once: false, threshold: 0, onLeave: () => (inView = false) },
    )
  }
  schedule()
})

let pointer: { id: number; x: number; y: number; t: number; scale: number } | null = null

function onPointerDown(event: PointerEvent) {
  if (!props.draggable || event.button !== 0 || !svg.value) return
  pointer = { id: event.pointerId, x: event.clientX, y: event.clientY, t: performance.now(), scale: globeDragScale(svg.value.getBoundingClientRect().width) }
  velocity = { lat: 0, lng: 0 }
  flight = null
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)
  window.addEventListener('pointercancel', onPointerUp)
}

function onPointerMove(event: PointerEvent) {
  if (!pointer || event.pointerId !== pointer.id) return
  const dx = event.clientX - pointer.x
  const dy = event.clientY - pointer.y
  if (!dragging.value && Math.hypot(dx, dy) < 3) return
  dragging.value = true
  event.preventDefault()
  const now = performance.now()
  const dt = Math.max(1, now - pointer.t) / 1000
  const d = { lat: dy * pointer.scale, lng: -dx * pointer.scale }
  view.value = globeNormalize({ lat: view.value.lat + d.lat, lng: view.value.lng + d.lng })
  velocity = { lat: d.lat / dt, lng: d.lng / dt }
  pointer = { ...pointer, x: event.clientX, y: event.clientY, t: now }
}

function stopListening() {
  pointer = null
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
  window.removeEventListener('pointercancel', onPointerUp)
}

function onPointerUp(event: PointerEvent) {
  if (!pointer || event.pointerId !== pointer.id) return
  if (performance.now() - pointer.t > 80) velocity = { lat: 0, lng: 0 }
  stopListening()
  // Let the click that ends a drag fall through without selecting a marker.
  setTimeout(() => (dragging.value = false))
  schedule()
}

onBeforeUnmount(() => {
  if (frame) cancelAnimationFrame(frame)
  stopObserving?.()
  stopListening()
})

function onKeydown(event: KeyboardEvent) {
  const step = event.shiftKey ? 30 : 10
  const moves: Record<string, [number, number]> = { ArrowUp: [-step, 0], ArrowDown: [step, 0], ArrowLeft: [0, step], ArrowRight: [0, -step] }
  if (moves[event.key]) {
    const [lat, lng] = moves[event.key]
    flyTo({ lat: view.value.lat + lat, lng: view.value.lng + lng }, 280)
  } else if (event.key === 'Home') flyTo(home())
  else return
  event.preventDefault()
}

function select(i: number) {
  if (dragging.value) return
  const m = props.markers[i]
  if (!m) return
  if (props.flyToMarker) flyTo(m)
  emit('select', m, i)
}

function onMarkerKey(i: number, event: KeyboardEvent) {
  if (event.key !== 'Enter' && event.key !== ' ') return
  event.preventDefault()
  event.stopPropagation()
  select(i)
}

function onMarkerLeave(i: number) {
  if (hovered.value === i) hovered.value = null
  schedule()
}
function onMarkerBlur(i: number) {
  if (focused.value === i) focused.value = null
  schedule()
}

defineExpose({ flyTo })
</script>

<template>
  <figure
    :class="['ml-globe', `ml-globe--${tone}`, { 'ml-globe--dragging': dragging, 'ml-globe--draggable': draggable, 'ml-globe--atmosphere': atmosphere }]"
    :style="{ '--_size': `${size}px` }"
  >
    <div class="ml-globe__stage">
      <div class="ml-globe__sphere" aria-hidden="true" />
      <svg
        ref="svg"
        class="ml-globe__svg"
        :viewBox="`0 0 ${GLOBE_SIZE} ${GLOBE_SIZE}`"
        role="group"
        :aria-label="summary"
        tabindex="0"
        @pointerdown="onPointerDown"
        @keydown="onKeydown"
      >
        <path v-if="graticule" class="ml-globe__grid" :d="grid" aria-hidden="true" />
        <path class="ml-globe__land ml-globe__land--rim" :d="dots[2]" aria-hidden="true" />
        <path class="ml-globe__land ml-globe__land--side" :d="dots[1]" aria-hidden="true" />
        <path class="ml-globe__land" :d="dots[0]" aria-hidden="true" />
        <g v-if="routes.length" class="ml-globe__arcs" aria-hidden="true">
          <g v-for="(r, i) in routes" :key="i" :class="['ml-globe__arc', `ml-globe__arc--${r.tone}`]">
            <path class="ml-globe__arc-track" :d="r.d" />
            <path class="ml-globe__arc-glint" :d="r.d" pathLength="1" :style="{ animationDelay: `${(i * -0.7).toFixed(1)}s` }" />
          </g>
        </g>
        <g
          v-for="p in pins"
          :key="p.i"
          :class="[
            'ml-globe__marker',
            `ml-globe__marker--${p.tone}`,
            { 'ml-globe__marker--back': !p.visible, 'ml-globe__marker--active': hovered === p.i || focused === p.i },
          ]"
          :transform="`translate(${p.x} ${p.y})`"
          role="button"
          :tabindex="p.visible ? 0 : -1"
          :aria-label="p.text"
          :aria-hidden="p.visible ? undefined : 'true'"
          @click="select(p.i)"
          @keydown="onMarkerKey(p.i, $event)"
          @pointerenter="hovered = p.i"
          @pointerleave="onMarkerLeave(p.i)"
          @focus="focused = p.i"
          @blur="onMarkerBlur(p.i)"
        >
          <circle v-if="p.m.pulse !== false" class="ml-globe__pulse" :r="p.r" />
          <circle class="ml-globe__hit" :r="Math.max(7, p.r + 4)" />
          <circle class="ml-globe__dot" :r="p.r" />
          <text v-if="labels && p.m.label" class="ml-globe__label" :x="p.r + 3" y="0">{{ p.m.label }}</text>
        </g>
      </svg>
      <div v-if="tip && !labels" class="ml-globe__tip" :style="{ left: `${tip.left.toFixed(2)}%`, top: `${tip.top.toFixed(2)}%` }" aria-hidden="true">
        {{ tip.text }}
      </div>
    </div>
  </figure>
</template>
