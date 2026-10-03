<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useId } from 'vue'
import { chartStops, niceStep, seriesColors, smoothPath } from './charts'
import type { MlLineSeries } from '../types'

const props = withDefaults(
  defineProps<{
    series: MlLineSeries[]
    /** X-axis labels, one per data point. */
    labels?: string[]
    /** Plot height in px. */
    height?: number
    /** Fill the area under each line. */
    area?: boolean
    /** Monotone curves instead of straight segments. */
    smooth?: boolean
    /** Number of horizontal grid lines. */
    ticks?: number
    /** Mark every data point with a dot. */
    dots?: boolean
    /** Show the series legend (on by default with more than one series). */
    legend?: boolean
    format?: (value: number) => string
    /** Accessible summary of the chart. */
    label?: string
  }>(),
  { height: 220, area: true, smooth: true, ticks: 4, dots: false, legend: undefined },
)

const fmt = (v: number) => (props.format ? props.format(v) : v.toLocaleString())
const uid = `ml-line-${useId()}`

// The SVG is drawn in real pixels (so strokes and dots never stretch); the
// width follows the container.
const plot = ref<HTMLElement>()
const width = ref(600)
let observer: ResizeObserver | undefined
onMounted(() => {
  if (!plot.value) return
  width.value = plot.value.clientWidth || width.value
  if (typeof ResizeObserver === 'undefined') return
  observer = new ResizeObserver(([entry]) => {
    width.value = Math.max(80, Math.round(entry.contentRect.width))
  })
  observer.observe(plot.value)
})
onBeforeUnmount(() => observer?.disconnect())

const PAD_Y = 8
const count = computed(() => Math.max(1, ...props.series.map((s) => s.data.length)))

const scale = computed(() => {
  const values = props.series.flatMap((s) => s.data)
  const max = Math.max(0, ...values)
  const min = Math.min(0, ...values)
  const step = niceStep(max - min || 1, props.ticks)
  const lo = Math.floor(min / step) * step
  const hi = Math.max(lo + step * props.ticks, Math.ceil(max / step) * step)
  return { lo, hi, step }
})

const tickValues = computed(() => {
  const { lo, hi, step } = scale.value
  const out: number[] = []
  for (let v = hi; v >= lo - step / 2; v -= step) out.push(+v.toFixed(10))
  return out
})

const x = (i: number) => (count.value > 1 ? (i / (count.value - 1)) * width.value : width.value / 2)
const y = (v: number) => {
  const { lo, hi } = scale.value
  return PAD_Y + (1 - (v - lo) / (hi - lo || 1)) * (props.height - PAD_Y * 2)
}
const baseline = computed(() => y(Math.max(scale.value.lo, 0)))

const colorOf = (s: MlLineSeries, i: number) =>
  s.color ?? (s.tone ? chartStops[s.tone][0] : seriesColors[i % seriesColors.length])

const drawn = computed(() =>
  props.series.map((s, i) => {
    const pts = s.data.map((v, j) => ({ x: x(j), y: y(v) }))
    const line = props.smooth
      ? smoothPath(pts)
      : pts.map((p, j) => `${j ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
    const fill = pts.length
      ? `${line} L${pts[pts.length - 1].x.toFixed(1)} ${baseline.value} L${pts[0].x.toFixed(1)} ${baseline.value} Z`
      : ''
    return { name: s.name, color: colorOf(s, i), pts, line, fill, gradient: `${uid}-g${i}` }
  }),
)

// Thin the x labels so they never crowd (roughly one per 64px).
const labelEvery = computed(() => Math.max(1, Math.ceil(((props.labels?.length ?? 0) * 64) / width.value)))

const showLegend = computed(() => props.legend ?? props.series.length > 1)

// Hover / keyboard inspection: one index across every series.
const hover = ref<number | null>(null)

function onPointerMove(event: PointerEvent) {
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  const ratio = (event.clientX - rect.left) / (rect.width || 1)
  hover.value = Math.min(count.value - 1, Math.max(0, Math.round(ratio * (count.value - 1))))
}

function onKeydown(event: KeyboardEvent) {
  const moves: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1 }
  if (event.key === 'Home') hover.value = 0
  else if (event.key === 'End') hover.value = count.value - 1
  else if (event.key in moves) hover.value = Math.min(count.value - 1, Math.max(0, (hover.value ?? -1) + moves[event.key]))
  else if (event.key === 'Escape') hover.value = null
  else return
  event.preventDefault()
}

const tipSide = computed(() => (hover.value !== null && x(hover.value) > width.value * 0.6 ? 'left' : 'right'))
const hoverLabel = computed(() => (hover.value === null ? '' : props.labels?.[hover.value] ?? `#${hover.value + 1}`))
const summary = computed(
  () =>
    props.label ??
    props.series.map((s) => `${s.name}：${s.data.map(fmt).join('、')}`).join('；'),
)
</script>

<template>
  <figure class="ml-line" :style="{ '--_h': `${height}px` }">
    <div v-if="showLegend" class="ml-line__legend" aria-hidden="true">
      <span v-for="s in drawn" :key="s.name" class="ml-line__key">
        <i :style="{ background: s.color, color: s.color }" />{{ s.name }}
      </span>
    </div>
    <div class="ml-line__body">
      <div class="ml-line__axis" aria-hidden="true">
        <span v-for="t in tickValues" :key="t">{{ fmt(t) }}</span>
      </div>
      <div class="ml-line__main">
        <div
          ref="plot"
          class="ml-line__plot"
          role="img"
          tabindex="0"
          :aria-label="summary"
          @pointermove="onPointerMove"
          @pointerleave="hover = null"
          @keydown="onKeydown"
          @blur="hover = null"
        >
          <svg :width="width" :height="height" :viewBox="`0 0 ${width} ${height}`" aria-hidden="true">
            <defs>
              <linearGradient v-for="s in drawn" :id="s.gradient" :key="s.gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" :stop-color="s.color" stop-opacity="0.32" />
                <stop offset="1" :stop-color="s.color" stop-opacity="0" />
              </linearGradient>
            </defs>
            <g class="ml-line__grid">
              <line
                v-for="t in tickValues"
                :key="t"
                x1="0"
                :x2="width"
                :y1="y(t)"
                :y2="y(t)"
                :class="{ 'ml-line__zero': t === 0 }"
              />
            </g>
            <g v-for="(s, i) in drawn" :key="s.name" class="ml-line__series" :style="{ '--_i': i }">
              <path v-if="area" :d="s.fill" :fill="`url(#${s.gradient})`" class="ml-line__area" />
              <path :d="s.line" pathLength="1" class="ml-line__stroke" :stroke="s.color" />
              <template v-if="dots">
                <circle v-for="(p, j) in s.pts" :key="j" :cx="p.x" :cy="p.y" r="3" class="ml-line__dot" :fill="s.color" />
              </template>
            </g>
            <g v-if="hover !== null" class="ml-line__cursor">
              <line :x1="x(hover)" :x2="x(hover)" y1="0" :y2="height" />
              <template v-for="s in drawn" :key="s.name">
                <circle
                  v-if="s.pts[hover]"
                  :cx="s.pts[hover].x"
                  :cy="s.pts[hover].y"
                  r="4.5"
                  :fill="s.color"
                  class="ml-line__focus"
                />
              </template>
            </g>
          </svg>
          <div
            v-if="hover !== null"
            :class="['ml-line__tip', `ml-line__tip--${tipSide}`]"
            :style="{ left: `${x(hover)}px` }"
            aria-live="polite"
          >
            <p class="ml-line__tip-title">{{ hoverLabel }}</p>
            <p v-for="(s, i) in series" :key="s.name" class="ml-line__tip-row">
              <i :style="{ background: drawn[i].color }" />
              <span>{{ s.name }}</span>
              <b>{{ s.data[hover] !== undefined ? fmt(s.data[hover]) : '—' }}</b>
            </p>
          </div>
        </div>
        <div v-if="labels?.length" class="ml-line__x" aria-hidden="true">
          <template v-for="(l, i) in labels" :key="i">
          <span
            v-if="i % labelEvery === 0 || i === hover"
            :class="{ 'ml-line__x--on': i === hover }"
            :style="{ left: `${x(i)}px` }"
          >{{ l }}</span>
          </template>
        </div>
      </div>
    </div>
  </figure>
</template>
