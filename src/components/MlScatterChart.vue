<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useId } from 'vue'
import { bubbleRadius, chartStops, diamondPath, linearFit, nearestIndex, niceScale, seriesColors } from './charts'
import { createPawPath } from './paw'
import { useLocale } from '../locale'
import type { MlScatterSeries, MlScatterShape } from '../types'

const loc = useLocale()

const props = withDefaults(
  defineProps<{
    series: MlScatterSeries[]
    /** Plot height in px. */
    height?: number
    /** Point marker. */
    shape?: MlScatterShape
    /** Radius (px) of points without a `size`. */
    pointSize?: number
    /** Smallest and largest bubble radius (px) for points with a `size`. */
    sizeRange?: [number, number]
    /** Least-squares trend line for every series (a series' own `trend` wins). */
    trend?: boolean
    /** Number of horizontal / vertical grid steps (approximate; steps stay round). */
    ticks?: number
    xTicks?: number
    /** Show the series legend (on by default with more than one series). Click a key to hide that series. */
    legend?: boolean
    /** Axis titles. */
    xTitle?: string
    yTitle?: string
    /** Format y values (and x values when `xFormat` is not set). */
    format?: (value: number) => string
    xFormat?: (value: number) => string
    /** Accessible summary of the chart. */
    label?: string
  }>(),
  { height: 260, shape: 'circle', pointSize: 5, sizeRange: () => [4, 18], trend: false, ticks: 4, xTicks: 5, legend: undefined },
)

const emit = defineEmits<{ toggle: [name: string, visible: boolean] }>()

const fmtY = (v: number) => (props.format ? props.format(v) : v.toLocaleString())
const fmtX = (v: number) => (props.xFormat ? props.xFormat(v) : props.format ? props.format(v) : v.toLocaleString())
const uid = `ml-scatter-${useId()}`

// Real pixels (markers never stretch); the width follows the container. Updates
// wait for the next frame so a re-layout can't trigger "ResizeObserver loop" errors.
const plot = ref<HTMLElement>()
const width = ref(600)
let observer: ResizeObserver | undefined
let frame = 0
onMounted(() => {
  if (!plot.value) return
  width.value = plot.value.clientWidth || width.value
  if (typeof ResizeObserver === 'undefined') return
  observer = new ResizeObserver(([entry]) => {
    const next = Math.max(80, Math.round(entry.contentRect.width))
    cancelAnimationFrame(frame)
    frame = requestAnimationFrame(() => (width.value = next))
  })
  observer.observe(plot.value)
})
onBeforeUnmount(() => {
  observer?.disconnect()
  cancelAnimationFrame(frame)
})

const PAD_Y = 8
const hidden = ref<number[]>([])
const pawPath = createPawPath()

// Axes cover every series (hidden ones too), so toggling never rescales the plot.
const all = computed(() => props.series.flatMap((s) => s.points))
const xScale = computed(() => niceScale(Math.min(...all.value.map((p) => p.x)), Math.max(...all.value.map((p) => p.x)), props.xTicks))
const yScale = computed(() => niceScale(Math.min(...all.value.map((p) => p.y)), Math.max(...all.value.map((p) => p.y)), props.ticks))
const sizes = computed(() => all.value.filter((p) => p.size !== undefined).map((p) => p.size as number))
const hasSize = computed(() => sizes.value.length > 0)
const hasLabel = computed(() => all.value.some((p) => p.label !== undefined))

const x = (v: number) => ((v - xScale.value.lo) / (xScale.value.hi - xScale.value.lo || 1)) * width.value
const y = (v: number) => PAD_Y + (1 - (v - yScale.value.lo) / (yScale.value.hi - yScale.value.lo || 1)) * (props.height - PAD_Y * 2)
const radius = (size?: number) =>
  size === undefined ? props.pointSize : bubbleRadius(size, Math.min(...sizes.value), Math.max(...sizes.value), props.sizeRange)

const markerPath = (cx: number, cy: number, r: number) =>
  props.shape === 'diamond' ? diamondPath(cx, cy, r * 1.25) : ''
const pawTransform = (cx: number, cy: number, r: number) => {
  // The paw is drawn on a 24×24 grid; scale it so it reads about as big as a circle of radius r.
  const k = (r * 2.3) / 24
  return `translate(${(cx - 12 * k).toFixed(1)} ${(cy - 12 * k).toFixed(1)}) scale(${k.toFixed(3)})`
}

const drawn = computed(() =>
  props.series.map((s, i) => {
    const color = s.color ?? (s.tone ? chartStops[s.tone][0] : seriesColors[i % seriesColors.length])
    const pts = s.points.map((p) => ({ ...p, px: x(p.x), py: y(p.y), r: radius(p.size) }))
    const fit = (s.trend ?? props.trend) ? linearFit(s.points) : null
    let trend: { x1: number; y1: number; x2: number; y2: number } | null = null
    if (fit) {
      const lo = Math.min(...s.points.map((p) => p.x))
      const hi = Math.max(...s.points.map((p) => p.x))
      trend = { x1: x(lo), y1: y(fit.slope * lo + fit.intercept), x2: x(hi), y2: y(fit.slope * hi + fit.intercept) }
    }
    return { name: s.name, color, pts, trend, on: !hidden.value.includes(i), gradient: `${uid}-g${i}` }
  }),
)

const showLegend = computed(() => props.legend ?? props.series.length > 1)

function toggle(i: number) {
  const on = hidden.value.includes(i)
  hidden.value = on ? hidden.value.filter((h) => h !== i) : [...hidden.value, i]
  if (active.value?.s === i) active.value = null
  emit('toggle', props.series[i].name, on)
}

// Inspection: one point at a time. Keyboard order is left → right across every visible series.
const active = ref<{ s: number; j: number } | null>(null)
const order = computed(() =>
  drawn.value
    .flatMap((s, si) => (s.on ? s.pts.map((p, j) => ({ s: si, j, px: p.px, py: p.py })) : []))
    .sort((a, b) => a.px - b.px || a.py - b.py),
)

function onPointerMove(event: PointerEvent) {
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  const hit = nearestIndex(
    order.value.map((p) => ({ x: p.px, y: p.py })),
    event.clientX - rect.left,
    event.clientY - rect.top,
    40,
  )
  active.value = hit < 0 ? null : { s: order.value[hit].s, j: order.value[hit].j }
}

function onKeydown(event: KeyboardEvent) {
  const list = order.value
  if (!list.length) return
  const at = active.value ? list.findIndex((p) => p.s === active.value!.s && p.j === active.value!.j) : -1
  const pick = (k: number) => (active.value = { s: list[k].s, j: list[k].j })
  if (event.key === 'ArrowRight') pick(Math.min(list.length - 1, at + 1))
  else if (event.key === 'ArrowLeft') pick(at < 0 ? 0 : Math.max(0, at - 1))
  else if (event.key === 'Home') pick(0)
  else if (event.key === 'End') pick(list.length - 1)
  else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
    // Jump to the nearest-in-x point of the next / previous visible series.
    const seriesOn = [...new Set(list.map((p) => p.s))].sort((a, b) => a - b)
    const cur = at < 0 ? list[0] : list[at]
    const idx = seriesOn.indexOf(cur.s)
    const next = seriesOn[(idx + (event.key === 'ArrowDown' ? 1 : -1) + seriesOn.length) % seriesOn.length]
    const candidates = list.map((p, k) => ({ p, k })).filter(({ p }) => p.s === next)
    const best = candidates.reduce((a, b) => (Math.abs(b.p.px - cur.px) < Math.abs(a.p.px - cur.px) ? b : a))
    pick(best.k)
  } else if (event.key === 'Escape') active.value = null
  else return
  event.preventDefault()
}

const focus = computed(() => {
  if (!active.value) return null
  const s = drawn.value[active.value.s]
  const p = s?.pts[active.value.j]
  return p ? { s, p, i: active.value.s } : null
})
const tipSide = computed(() => (focus.value && focus.value.p.px > width.value * 0.6 ? 'left' : 'right'))

const pointCount = computed(() => all.value.length)
const summary = computed(() => props.label ?? loc.value.scatter.summary(props.series.length, pointCount.value))
</script>

<template>
  <figure class="ml-scatter" :style="{ '--_h': `${height}px` }">
    <div v-if="showLegend" class="ml-scatter__legend">
      <button
        v-for="(s, i) in drawn"
        :key="s.name"
        type="button"
        :class="['ml-scatter__key', { 'ml-scatter__key--off': !s.on }]"
        :aria-pressed="s.on"
        :aria-label="loc.scatter.toggle(s.name)"
        @click="toggle(i)"
      >
        <i :style="{ background: s.color, color: s.color }" />{{ s.name }}
      </button>
    </div>
    <div v-if="yTitle" class="ml-scatter__title ml-scatter__title--y" aria-hidden="true">{{ yTitle }}</div>
    <div class="ml-scatter__body">
      <div class="ml-scatter__axis" aria-hidden="true">
        <span v-for="t in [...yScale.values].reverse()" :key="t">{{ fmtY(t) }}</span>
      </div>
      <div class="ml-scatter__main">
        <div
          ref="plot"
          class="ml-scatter__plot"
          role="img"
          tabindex="0"
          :aria-label="summary"
          @pointermove="onPointerMove"
          @pointerleave="active = null"
          @keydown="onKeydown"
          @blur="active = null"
        >
          <svg :width="width" :height="height" :viewBox="`0 0 ${width} ${height}`" aria-hidden="true">
            <defs>
              <radialGradient v-for="s in drawn" :id="s.gradient" :key="s.gradient" cx="0.35" cy="0.3" r="0.75">
                <stop offset="0" stop-color="#fff" stop-opacity="0.85" />
                <stop offset="0.35" :stop-color="s.color" />
                <stop offset="1" :stop-color="s.color" stop-opacity="0.7" />
              </radialGradient>
            </defs>
            <g class="ml-scatter__grid">
              <line v-for="t in yScale.values" :key="`y${t}`" x1="0" :x2="width" :y1="y(t)" :y2="y(t)" :class="{ 'ml-scatter__zero': t === 0 }" />
              <line
                v-for="t in xScale.values"
                :key="`x${t}`"
                :x1="x(t)"
                :x2="x(t)"
                y1="0"
                :y2="height"
                :class="['ml-scatter__vline', { 'ml-scatter__zero': t === 0 }]"
              />
            </g>
            <template v-for="(s, i) in drawn" :key="s.name">
              <g v-if="s.on" class="ml-scatter__series" :style="{ '--_i': i, color: s.color }">
                <line v-if="s.trend" class="ml-scatter__trend" :x1="s.trend.x1" :y1="s.trend.y1" :x2="s.trend.x2" :y2="s.trend.y2" :stroke="s.color" />
                <template v-for="(p, j) in s.pts" :key="j">
                  <circle
                    v-if="shape === 'circle'"
                    :class="['ml-scatter__pt', { 'ml-scatter__pt--bubble': p.size !== undefined }]"
                    :cx="p.px"
                    :cy="p.py"
                    :r="p.r"
                    :fill="`url(#${s.gradient})`"
                    :style="{ '--_j': j }"
                  />
                  <path
                    v-else-if="shape === 'paw'"
                    :class="['ml-scatter__pt', { 'ml-scatter__pt--bubble': p.size !== undefined }]"
                    :d="pawPath"
                    :transform="pawTransform(p.px, p.py, p.r)"
                    :fill="s.color"
                    :style="{ '--_j': j }"
                  />
                  <path
                    v-else
                    :class="['ml-scatter__pt', { 'ml-scatter__pt--bubble': p.size !== undefined }]"
                    :d="markerPath(p.px, p.py, p.r)"
                    :fill="`url(#${s.gradient})`"
                    :style="{ '--_j': j }"
                  />
                </template>
              </g>
            </template>
            <g v-if="focus" class="ml-scatter__cursor">
              <line :x1="focus.p.px" :x2="focus.p.px" :y1="focus.p.py" :y2="height" />
              <line x1="0" :x2="focus.p.px" :y1="focus.p.py" :y2="focus.p.py" />
              <circle :cx="focus.p.px" :cy="focus.p.py" :r="focus.p.r + 4" :stroke="focus.s.color" class="ml-scatter__focus" />
            </g>
          </svg>
          <div
            v-if="focus"
            :class="['ml-scatter__tip', `ml-scatter__tip--${tipSide}`]"
            :style="{ left: `${focus.p.px}px`, top: `${focus.p.py}px` }"
            aria-live="polite"
          >
            <p class="ml-scatter__tip-title">
              <i :style="{ background: focus.s.color }" />{{ focus.p.label ?? focus.s.name }}
            </p>
            <p v-if="focus.p.label !== undefined" class="ml-scatter__tip-row">
              <span>{{ loc.scatter.series }}</span><b>{{ focus.s.name }}</b>
            </p>
            <p class="ml-scatter__tip-row">
              <span>{{ xTitle ?? loc.scatter.x }}</span><b>{{ fmtX(focus.p.x) }}</b>
            </p>
            <p class="ml-scatter__tip-row">
              <span>{{ yTitle ?? loc.scatter.y }}</span><b>{{ fmtY(focus.p.y) }}</b>
            </p>
            <p v-if="focus.p.size !== undefined" class="ml-scatter__tip-row">
              <span>{{ loc.scatter.size }}</span><b>{{ focus.p.size.toLocaleString() }}</b>
            </p>
          </div>
        </div>
        <div class="ml-scatter__x" aria-hidden="true">
          <span v-for="t in xScale.values" :key="t" :style="{ left: `${x(t)}px` }">{{ fmtX(t) }}</span>
        </div>
        <div v-if="xTitle" class="ml-scatter__title ml-scatter__title--x" aria-hidden="true">{{ xTitle }}</div>
      </div>
    </div>
    <table class="ml-visually-hidden">
      <caption>{{ loc.scatter.table }}</caption>
      <thead>
        <tr>
          <th scope="col">{{ loc.scatter.series }}</th>
          <th v-if="hasLabel" scope="col">{{ loc.scatter.point }}</th>
          <th scope="col">{{ xTitle ?? loc.scatter.x }}</th>
          <th scope="col">{{ yTitle ?? loc.scatter.y }}</th>
          <th v-if="hasSize" scope="col">{{ loc.scatter.size }}</th>
        </tr>
      </thead>
      <tbody>
        <template v-for="s in series" :key="s.name">
          <tr v-for="(p, j) in s.points" :key="j">
            <th scope="row">{{ s.name }}</th>
            <td v-if="hasLabel">{{ p.label ?? '' }}</td>
            <td>{{ fmtX(p.x) }}</td>
            <td>{{ fmtY(p.y) }}</td>
            <td v-if="hasSize">{{ p.size?.toLocaleString() ?? '' }}</td>
          </tr>
        </template>
      </tbody>
    </table>
  </figure>
</template>
