<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useLocale } from '../locale'
import {
  RADAR_REST_ANGLE,
  RADAR_SIZE,
  mountRadar,
  radarBearing,
  radarGlow,
  radarPolar,
  radarPosition,
  radarRangeLabels,
  radarRings,
  radarTicks,
  type MlRadarBlip,
  type MlRadarTone,
  type RadarController,
} from './radar'

const loc = useLocale()

const props = withDefaults(
  defineProps<{
    blips?: MlRadarBlip[]
    tone?: MlRadarTone
    /** Width in px (it never overflows its container). */
    size?: number
    /** Sweep speed, degrees per second; negative turns anticlockwise. */
    speed?: number
    /** Length of the fading trail behind the beam, degrees. */
    trail?: number
    /** Number of range rings. */
    rings?: number
    /** Outer-ring range: labels the rings and reads distances in this unit. */
    range?: number
    unit?: string
    /** Explicit ring labels, inner to outer (wins over range). */
    rangeLabels?: string[]
    /** Freeze the sweep. */
    paused?: boolean
    label?: string
  }>(),
  { blips: () => [], tone: 'tech', size: 280, speed: 90, trail: 90, rings: 4, paused: false },
)

const emit = defineEmits<{ select: [blip: MlRadarBlip, index: number] }>()

const C = RADAR_SIZE / 2
const ringRadii = computed(() => radarRings(props.rings))
const ticks = radarTicks()
const ranges = computed(() =>
  radarRangeLabels(ringRadii.value.length, { labels: props.rangeLabels, range: props.range, unit: props.unit }).map((text, i) => ({
    text,
    y: C - ringRadii.value[i] + 3,
  })),
)

const items = computed(() =>
  props.blips.map((b, i) => {
    const { angle, distance } = radarPolar(b)
    const pos = radarPosition(b)
    const dist = props.range ? `${Math.round(distance * props.range * 10) / 10}${props.unit ? ` ${props.unit}` : ''}` : `${Math.round(distance * 100)}%`
    return {
      b,
      i,
      angle,
      tone: b.tone ?? props.tone,
      style: { left: `${pos.left}%`, top: `${pos.top}%`, '--_rd-glow': String(radarGlow(RADAR_REST_ANGLE, angle, props.trail, props.speed >= 0)) },
      text: loc.value.radar.blip(b.label, radarBearing(angle), dist),
    }
  }),
)
const summary = computed(() => props.label ?? loc.value.radar.summary(props.blips.length))

const active = ref<number | null>(null)
watch(
  () => props.blips.length,
  (n) => {
    if (active.value !== null && active.value >= n) active.value = null
  },
)

function select(i: number) {
  active.value = i
  const b = props.blips[i]
  if (b) emit('select', b, i)
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && active.value !== null) {
    active.value = null
    event.preventDefault()
  }
}

const scope = ref<HTMLElement>()
let ctl: RadarController | undefined
onMounted(() => {
  if (scope.value) ctl = mountRadar(scope.value, () => items.value.map((it) => it.angle), { speed: props.speed, trail: props.trail, paused: props.paused })
})
watch(
  () => [props.speed, props.trail, props.paused] as const,
  ([speed, trail, paused]) => ctl?.update({ speed, trail, paused }),
)
watch(items, () => nextTick(() => ctl?.update({})))
onBeforeUnmount(() => ctl?.destroy())
</script>

<template>
  <figure :class="['ml-radar-scope', `ml-radar-scope--${tone}`, { 'ml-radar-scope--paused': paused, 'ml-radar-scope--ccw': speed < 0 }]" :style="{ '--_rd-size': `${size}px`, '--_rd-trail': `${trail}deg` }">
    <div ref="scope" class="ml-radar-scope__screen" role="group" :aria-label="summary" @keydown="onKeydown">
      <svg class="ml-radar-scope__grid" :viewBox="`0 0 ${RADAR_SIZE} ${RADAR_SIZE}`" aria-hidden="true">
        <circle v-for="(r, i) in ringRadii" :key="i" class="ml-radar-scope__ring" :cx="C" :cy="C" :r="r" />
        <path class="ml-radar-scope__cross" :d="`M${C} ${C - 96}V${C + 96}M${C - 96} ${C}H${C + 96}`" />
        <path class="ml-radar-scope__ticks" :d="ticks" />
        <text v-for="(r, i) in ranges" :key="`r${i}`" class="ml-radar-scope__range" :x="C + 3" :y="r.y">{{ r.text }}</text>
      </svg>
      <div class="ml-radar-scope__sweep" :style="{ '--_rd-a': `${RADAR_REST_ANGLE}deg` }" aria-hidden="true" />
      <button
        v-for="it in items"
        :key="it.i"
        type="button"
        :class="['ml-radar-scope__blip', `ml-radar-scope__blip--${it.tone}`, { 'ml-radar-scope__blip--active': active === it.i }]"
        :style="it.style"
        :aria-label="it.text"
        :aria-pressed="active === it.i"
        @click="select(it.i)"
      >
        <span v-if="it.b.label" class="ml-radar-scope__tip" aria-hidden="true">{{ it.b.label }}</span>
      </button>
    </div>
  </figure>
</template>
