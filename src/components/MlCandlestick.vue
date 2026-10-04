<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import MlIcon from './MlIcon.vue'
import { useChartWidth } from './chart-width'
import { chartStops, tonePalette } from './charts'
import {
  axisWidth,
  candleChange,
  candleTime,
  candleTimeLabel,
  candleTimeText,
  clampRange,
  formatPrice,
  initialRange,
  isIntraday,
  movingAverage,
  panRange,
  priceDecimals,
  priceScale,
  stepDecimals,
  timeTicks,
  volumeScale,
  zoomRange,
  type CandleRange,
  type MlCandle,
  type MlCandleUpColor,
} from './candlestick'
import { useLocale } from '../locale'

const loc = useLocale()

const props = withDefaults(
  defineProps<{
    data: MlCandle[]
    /** Height of the price pane in px; the width follows the container. */
    height?: number
    /** Volume bars under the prices (when the data has volume). */
    volume?: boolean
    volumeHeight?: number
    /** Moving-average periods to draw, e.g. [5, 20]. */
    ma?: number[]
    /** Colour of rising candles: 'red' (Taiwan, default) or 'green' (US / Europe). */
    upColor?: MlCandleUpColor
    /** How many candles show at first (the latest ones). */
    visible?: number
    /** Price format (default: the data's own decimals). */
    format?: (value: number) => string
    volumeFormat?: (value: number) => string
    /** Time label for the axis, legend and table. */
    timeFormat?: (time: number) => string
    /** Accessible summary of the chart. */
    label?: string
  }>(),
  { height: 280, volume: true, volumeHeight: 72, ma: () => [], upColor: 'red', visible: 60 },
)

const MIN = 8
const PAD = 10
const GAP = 10
const TIME_H = 22

const plot = ref<HTMLElement>()
const width = useChartWidth(plot)
const axisW = computed(() => axisWidth(scale.value.values.map(fmtTick)))
const plotW = computed(() => Math.max(40, width.value - axisW.value))

const times = computed(() => props.data.map((c) => candleTime(c.time)))
const intraday = computed(() => isIntraday(times.value.slice(0, 50)))
const decimals = computed(() => priceDecimals(props.data))
const fmt = (v: number) => (props.format ? props.format(v) : formatPrice(v, decimals.value))
const fmtVol = (v: number) => (props.volumeFormat ? props.volumeFormat(v) : v.toLocaleString())
const timeText = (i: number) => (props.timeFormat ? props.timeFormat(times.value[i]) : candleTimeText(times.value[i], intraday.value))
const timeLabel = (i: number) => (props.timeFormat ? props.timeFormat(times.value[i]) : candleTimeLabel(times.value[i], intraday.value, times.value[i - 1]))

/* ── Visible window ── */
const range = ref<CandleRange>(initialRange(props.data.length, props.visible, MIN))
watch(
  () => props.data.length,
  (n, old) => {
    const atEnd = range.value.start + range.value.count >= (old ?? 0)
    range.value = atEnd ? initialRange(n, range.value.count || props.visible, MIN) : clampRange(range.value, n, MIN)
  },
)
watch(
  () => props.visible,
  (v) => (range.value = initialRange(props.data.length, v, MIN)),
)
const shown = computed(() => props.data.slice(range.value.start, range.value.start + range.value.count))
const step = computed(() => plotW.value / Math.max(1, range.value.count))
const bodyW = computed(() => Math.max(1, Math.min(18, step.value * 0.64)))
const xi = (i: number) => (i - range.value.start + 0.5) * step.value

const averages = computed(() => {
  const closes = props.data.map((c) => c.close)
  return props.ma.map((n, k) => ({ n, values: movingAverage(closes, n), color: chartStops[tonePalette[k % 4]][0] }))
})
const scale = computed(() =>
  priceScale(
    shown.value,
    averages.value.flatMap((a) => a.values.slice(range.value.start, range.value.start + range.value.count)),
    5,
  ),
)
const fmtTick = (v: number) => {
  return props.format ? props.format(v) : formatPrice(v, stepDecimals(scale.value.step))
}
const hasVolume = computed(() => props.volume && props.data.some((c) => c.volume !== undefined))
const vmax = computed(() => volumeScale(shown.value))
const volTop = computed(() => props.height + GAP)
const totalH = computed(() => props.height + (hasVolume.value ? GAP + props.volumeHeight : 0) + TIME_H)
const axisBottom = computed(() => totalH.value - TIME_H)
const y = (v: number) => {
  const { lo, hi } = scale.value
  return PAD + (1 - (v - lo) / (hi - lo || 1)) * (props.height - PAD * 2)
}
const vy = (v: number) => volTop.value + props.volumeHeight - (v / vmax.value) * props.volumeHeight
const priceAt = (py: number) => {
  const { lo, hi } = scale.value
  return lo + (1 - (py - PAD) / (props.height - PAD * 2)) * (hi - lo)
}

const dir = (c: MlCandle) => (c.close > c.open ? 'up' : c.close < c.open ? 'down' : 'flat')
const candles = computed(() =>
  shown.value.map((c, k) => {
    const i = range.value.start + k
    const top = y(Math.max(c.open, c.close))
    return {
      i,
      k,
      dir: dir(c),
      x: xi(i),
      high: y(c.high),
      low: y(c.low),
      top,
      h: Math.max(1, y(Math.min(c.open, c.close)) - top),
      vol: c.volume !== undefined ? vy(c.volume) : null,
    }
  }),
)
const lines = computed(() =>
  averages.value.map((a) => {
    let d = ''
    for (let i = range.value.start; i < range.value.start + range.value.count; i++) {
      const v = a.values[i]
      if (v === null) continue
      d += `${d ? 'L' : 'M'}${xi(i).toFixed(1)} ${y(v).toFixed(1)}`
    }
    return { ...a, d }
  }),
)
const ticks = computed(() => timeTicks(range.value, step.value))

/* ── Crosshair ── */
const cursor = ref<{ i: number; y: number | null } | null>(null)
const focusIndex = computed(() => cursor.value?.i ?? range.value.start + range.value.count - 1)
const legend = computed(() => {
  const i = focusIndex.value
  const c = props.data[i]
  if (!c) return null
  const ch = candleChange(props.data, i)
  return {
    c,
    time: timeText(i),
    dir: ch.change > 0 ? 'up' : ch.change < 0 ? 'down' : 'flat',
    change: `${ch.change > 0 ? '+' : ''}${fmt(ch.change)} (${ch.percent > 0 ? '+' : ''}${ch.percent.toFixed(2)}%)`,
    ma: averages.value.map((a) => ({ n: a.n, color: a.color, v: a.values[i] })),
  }
})

const dragging = ref(false)
let drag: { id: number; x: number; range: CandleRange; moved: boolean } | null = null

function localPoint(event: { clientX: number; clientY: number }) {
  const rect = plot.value?.getBoundingClientRect()
  return rect ? { x: event.clientX - rect.left, y: event.clientY - rect.top } : { x: 0, y: 0 }
}

function onPointerMove(event: PointerEvent) {
  if (drag) return
  const p = localPoint(event)
  if (p.x < 0 || p.x > plotW.value || !props.data.length) {
    cursor.value = null
    return
  }
  const i = Math.min(range.value.start + range.value.count - 1, range.value.start + Math.floor(p.x / step.value))
  cursor.value = { i, y: p.y >= 0 && p.y <= props.height ? p.y : null }
}

function onPointerDown(event: PointerEvent) {
  if (event.button !== 0 || (event.target as Element).closest('button')) return
  drag = { id: event.pointerId, x: event.clientX, range: { ...range.value }, moved: false }
  window.addEventListener('pointermove', onDragMove)
  window.addEventListener('pointerup', onDragEnd)
  window.addEventListener('pointercancel', onDragEnd)
}

function onDragMove(event: PointerEvent) {
  if (!drag || event.pointerId !== drag.id) return
  const dx = event.clientX - drag.x
  if (!drag.moved && Math.abs(dx) < 4) return
  drag.moved = true
  dragging.value = true
  cursor.value = null
  range.value = panRange(drag.range, -Math.round(dx / step.value), props.data.length, MIN)
}

function stopDrag() {
  drag = null
  if (typeof window === 'undefined') return
  window.removeEventListener('pointermove', onDragMove)
  window.removeEventListener('pointerup', onDragEnd)
  window.removeEventListener('pointercancel', onDragEnd)
}

function onDragEnd(event: PointerEvent) {
  if (!drag || event.pointerId !== drag.id) return
  stopDrag()
  dragging.value = false
}

function onWheel(event: WheelEvent) {
  const n = props.data.length
  if (!n) return
  let next: CandleRange
  if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) next = panRange(range.value, Math.round(event.deltaX / step.value) || Math.sign(event.deltaX), n, MIN)
  else {
    const anchor = Math.min(1, Math.max(0, localPoint(event).x / plotW.value))
    next = zoomRange(range.value, event.deltaY > 0 ? 1.15 : 1 / 1.15, n, anchor, MIN)
  }
  // Let the page scroll once the chart can't zoom any further.
  if (next.start === range.value.start && next.count === range.value.count) return
  event.preventDefault()
  range.value = next
}

function zoom(factor: number) {
  const anchor = cursor.value ? (cursor.value.i - range.value.start + 0.5) / range.value.count : 1
  range.value = zoomRange(range.value, factor, props.data.length, anchor, MIN)
}
function reset() {
  range.value = initialRange(props.data.length, props.visible, MIN)
}

const live = ref('')
function moveTo(i: number) {
  const n = props.data.length
  if (!n) return
  const at = Math.min(n - 1, Math.max(0, i))
  const { start, count } = range.value
  if (at < start) range.value = clampRange({ start: at, count }, n, MIN)
  else if (at >= start + count) range.value = clampRange({ start: at - count + 1, count }, n, MIN)
  cursor.value = { i: at, y: null }
  const c = props.data[at]
  const ch = candleChange(props.data, at)
  live.value = `${timeText(at)}：${loc.value.candle.open} ${fmt(c.open)}，${loc.value.candle.high} ${fmt(c.high)}，${loc.value.candle.low} ${fmt(c.low)}，${loc.value.candle.close} ${fmt(c.close)}，${loc.value.candle.change} ${ch.percent.toFixed(2)}%`
}

function onKeydown(event: KeyboardEvent) {
  const cur = cursor.value?.i
  const big = event.shiftKey ? 10 : 1
  if (event.key === 'ArrowLeft') moveTo((cur ?? focusIndex.value + 1) - big)
  else if (event.key === 'ArrowRight') moveTo(cur === undefined ? focusIndex.value : cur + big)
  else if (event.key === 'Home') moveTo(0)
  else if (event.key === 'End') moveTo(props.data.length - 1)
  else if (event.key === '+' || event.key === '=') zoom(0.75)
  else if (event.key === '-' || event.key === '_') zoom(1 / 0.75)
  else if (event.key === 'Escape') cursor.value = null
  else return
  event.preventDefault()
}

// Entrance motion only on first paint, not on every pan / zoom.
const intro = ref(true)
let introTimer: ReturnType<typeof setTimeout> | undefined
onMounted(() => (introTimer = setTimeout(() => (intro.value = false), 1400)))
onBeforeUnmount(() => {
  clearTimeout(introTimer)
  stopDrag()
})

const crossY = computed(() => {
  const c = cursor.value
  if (!c) return null
  return c.y ?? y(props.data[c.i].close)
})
const canZoomIn = computed(() => range.value.count > Math.min(MIN, props.data.length))
const canZoomOut = computed(() => range.value.count < props.data.length)
const summary = computed(() => {
  const n = props.data.length
  const base = props.label ?? loc.value.candle.summary(n)
  const span = n ? loc.value.candle.range(timeText(range.value.start), timeText(range.value.start + range.value.count - 1)) : ''
  return `${base}. ${span}. ${loc.value.candle.hint}`
})
const hasVolumeData = computed(() => props.data.some((c) => c.volume !== undefined))
const pct = (i: number) => candleChange(props.data, i).percent.toFixed(2)
</script>

<template>
  <figure
    :class="['ml-candle', `ml-candle--up-${upColor}`, { 'ml-candle--intro': intro, 'ml-candle--dragging': dragging }]"
    :style="{ '--_cd-h': `${totalH}px` }"
  >
    <div class="ml-candle__bar">
      <div v-if="legend" class="ml-candle__legend" aria-hidden="true">
        <span class="ml-candle__time">{{ legend.time }}</span>
        <span><small>{{ loc.candle.open }}</small><b>{{ fmt(legend.c.open) }}</b></span>
        <span><small>{{ loc.candle.high }}</small><b>{{ fmt(legend.c.high) }}</b></span>
        <span><small>{{ loc.candle.low }}</small><b>{{ fmt(legend.c.low) }}</b></span>
        <span><small>{{ loc.candle.close }}</small><b>{{ fmt(legend.c.close) }}</b></span>
        <span :class="`ml-candle__change ml-candle__change--${legend.dir}`">{{ legend.change }}</span>
        <span v-if="legend.c.volume !== undefined"><small>{{ loc.candle.volume }}</small><b>{{ fmtVol(legend.c.volume) }}</b></span>
        <span v-for="m in legend.ma" :key="m.n" class="ml-candle__ma-key"><i :style="{ background: m.color }" />{{ loc.candle.ma(m.n) }}<b>{{ m.v === null ? '—' : fmt(m.v) }}</b></span>
      </div>
      <div class="ml-candle__tools">
        <button type="button" class="ml-candle__tool" :aria-label="loc.candle.zoomIn" :disabled="!canZoomIn" @click="zoom(0.75)"><MlIcon name="plus" /></button>
        <button type="button" class="ml-candle__tool" :aria-label="loc.candle.zoomOut" :disabled="!canZoomOut" @click="zoom(1 / 0.75)"><MlIcon name="minus" /></button>
        <button type="button" class="ml-candle__tool" :aria-label="loc.candle.reset" @click="reset"><MlIcon name="rotate" /></button>
      </div>
    </div>
    <div
      ref="plot"
      class="ml-candle__plot"
      role="img"
      tabindex="0"
      :aria-label="summary"
      @pointermove="onPointerMove"
      @pointerleave="cursor = null"
      @pointerdown="onPointerDown"
      @wheel="onWheel"
      @keydown="onKeydown"
      @blur="cursor = null"
    >
      <svg :width="width" :height="totalH" :viewBox="`0 0 ${width} ${totalH}`" aria-hidden="true">
        <g class="ml-candle__grid">
          <line v-for="t in scale.values" :key="t" x1="0" :x2="plotW" :y1="y(t)" :y2="y(t)" />
          <line v-if="hasVolume" class="ml-candle__divider" x1="0" :x2="plotW" :y1="volTop - GAP / 2" :y2="volTop - GAP / 2" />
          <line class="ml-candle__divider" :x1="plotW" :x2="plotW" y1="0" :y2="axisBottom" />
        </g>
        <g class="ml-candle__axis">
          <text v-for="t in scale.values" :key="t" :x="plotW + 8" :y="y(t)">{{ fmtTick(t) }}</text>
          <text v-for="i in ticks" :key="`t${i}`" class="ml-candle__tick" :x="xi(i)" :y="axisBottom + 15">{{ timeLabel(i) }}</text>
        </g>
        <g v-if="hasVolume" class="ml-candle__volumes">
          <template v-for="c in candles" :key="c.i">
            <rect
              v-if="c.vol !== null"
              :class="['ml-candle__vol', `ml-candle__vol--${c.dir}`]"
              :x="c.x - bodyW / 2"
              :y="c.vol"
              :width="bodyW"
              :height="Math.max(0, volTop + volumeHeight - c.vol)"
              :style="{ '--_cd-k': c.k }"
            />
          </template>
        </g>
        <g class="ml-candle__candles">
          <g v-for="c in candles" :key="c.i" :class="['ml-candle__k', `ml-candle__k--${c.dir}`]" :style="{ '--_cd-k': c.k }">
            <line :x1="c.x" :x2="c.x" :y1="c.high" :y2="c.low" />
            <rect :x="c.x - bodyW / 2" :y="c.top" :width="bodyW" :height="c.h" />
          </g>
        </g>
        <path v-for="m in lines" :key="m.n" class="ml-candle__ma" :d="m.d" :stroke="m.color" />
        <g v-if="cursor && crossY !== null" class="ml-candle__cross">
          <line :x1="xi(cursor.i)" :x2="xi(cursor.i)" y1="0" :y2="axisBottom" />
          <line x1="0" :x2="plotW" :y1="crossY" :y2="crossY" />
          <rect class="ml-candle__tag" :x="plotW + 1" :y="crossY - 9" :width="axisW - 2" height="18" />
          <text class="ml-candle__tag-text" :x="plotW + 8" :y="crossY">{{ fmt(cursor.y === null ? data[cursor.i].close : priceAt(cursor.y)) }}</text>
          <rect class="ml-candle__tag" :x="Math.min(plotW - 84, Math.max(0, xi(cursor.i) - 42))" :y="axisBottom + 3" width="84" height="18" />
          <text class="ml-candle__tag-text ml-candle__tag-text--time" :x="Math.min(plotW - 42, Math.max(42, xi(cursor.i)))" :y="axisBottom + 12">{{ timeText(cursor.i) }}</text>
        </g>
      </svg>
    </div>
    <p class="ml-visually-hidden" aria-live="polite">{{ live }}</p>
    <div class="ml-visually-hidden">
    <table>
      <caption>{{ loc.candle.table }}</caption>
      <thead>
        <tr>
          <th scope="col">{{ loc.candle.time }}</th>
          <th scope="col">{{ loc.candle.open }}</th>
          <th scope="col">{{ loc.candle.high }}</th>
          <th scope="col">{{ loc.candle.low }}</th>
          <th scope="col">{{ loc.candle.close }}</th>
          <th v-if="hasVolumeData" scope="col">{{ loc.candle.volume }}</th>
          <th scope="col">{{ loc.candle.change }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(c, i) in data" :key="i">
          <th scope="row">{{ timeText(i) }}</th>
          <td>{{ fmt(c.open) }}</td>
          <td>{{ fmt(c.high) }}</td>
          <td>{{ fmt(c.low) }}</td>
          <td>{{ fmt(c.close) }}</td>
          <td v-if="hasVolumeData">{{ c.volume === undefined ? '' : fmtVol(c.volume) }}</td>
          <td>{{ pct(i) }}%</td>
        </tr>
      </tbody>
    </table>
    </div>
  </figure>
</template>
