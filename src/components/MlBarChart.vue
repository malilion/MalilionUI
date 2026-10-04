<script setup lang="ts">
import { computed, ref } from 'vue'
import { barLayout, chartStops, niceStep, percentText, seriesColors } from './charts'
import { useLocale } from '../locale'
import type { MlBarMode, MlBarSeries, MlChartDatum, MlChartTone } from '../types'

const loc = useLocale()

const props = withDefaults(
  defineProps<{
    /** Single-series bars. */
    data?: MlChartDatum[]
    /** Several series, one value per label — switches to the multi-series chart. */
    series?: MlBarSeries[]
    /** Category (x-axis) labels for `series`. */
    labels?: string[]
    /** How several series are drawn. */
    mode?: MlBarMode
    /** Total above each stacked bar (stacked / percent modes). */
    showTotal?: boolean
    /** Show the series legend (on by default with more than one series). Click a key to hide that series. */
    legend?: boolean
    /** Plot height in px. */
    height?: number
    tone?: MlChartTone
    /** Which bar to light up and label: the largest, an index, or none. */
    highlight?: 'max' | number | null
    /** Number of horizontal grid lines. */
    ticks?: number
    format?: (value: number) => string
    /** Accessible summary of the chart. */
    label?: string
  }>(),
  { data: () => [], mode: 'grouped', showTotal: false, legend: undefined, height: 200, tone: 'gold', highlight: 'max', ticks: 4 },
)

const emit = defineEmits<{ toggle: [name: string, visible: boolean] }>()

const fmt = (v: number) => (props.format ? props.format(v) : v.toLocaleString())

// Round gridline steps so every tick is a readable number.
const top = computed(() => {
  const max = Math.max(0, ...props.data.map((d) => d.value))
  if (max === 0) return props.ticks
  return niceStep(max, props.ticks) * props.ticks
})

const tickValues = computed(() =>
  Array.from({ length: props.ticks + 1 }, (_, i) => (top.value / props.ticks) * (props.ticks - i)),
)

const highlighted = computed(() => {
  if (props.highlight === null) return -1
  if (typeof props.highlight === 'number') return props.highlight
  let best = -1
  props.data.forEach((d, i) => {
    if (best === -1 || d.value > props.data[best].value) best = i
  })
  return best
})

/* ── Multi-series ── */
const hidden = ref<number[]>([])
const hover = ref<number | null>(null)

const count = computed(() => Math.max(props.labels?.length ?? 0, ...(props.series ?? []).map((s) => s.data.length)))
const layout = computed(() =>
  barLayout(
    (props.series ?? []).map((s) => s.data),
    count.value,
    props.mode,
    (props.series ?? []).map((_, i) => !hidden.value.includes(i)),
    props.ticks,
  ),
)
const pos = (v: number) => ((v - layout.value.lo) / (layout.value.hi - layout.value.lo || 1)) * 100
const colors = computed(() =>
  (props.series ?? []).map((s, i) => s.color ?? (s.tone ? chartStops[s.tone][0] : seriesColors[i % seriesColors.length])),
)
const axis = computed(() => [...layout.value.values].reverse())
const tickText = (t: number) => (props.mode === 'percent' ? percentText(t) : fmt(t))
const totals = computed(() => props.showTotal && props.mode !== 'grouped')
const showLegend = computed(() => props.legend ?? (props.series?.length ?? 0) > 1)
const catLabel = (i: number) => props.labels?.[i] ?? `#${i + 1}`

// Grouped bars get one slot per visible series; stacked ones share a single slot.
const cats = computed(() =>
  layout.value.categories.map((c) => ({
    ...c,
    slots:
      props.mode === 'grouped'
        ? c.segments.map((s) => ({ key: `s${s.series}`, segments: [s] }))
        : [{ key: 'stack', segments: c.segments.filter((s) => s.to !== s.from) }],
  })),
)
const segStyle = (s: { from: number; to: number; series: number }, i: number) => ({
  bottom: `${pos(Math.min(s.from, s.to))}%`,
  height: `${Math.abs(pos(s.to) - pos(s.from))}%`,
  '--_c': colors.value[s.series],
  '--_i': i,
})
const valueText = (s: { value: number; share: number }) =>
  props.mode === 'percent' ? `${fmt(s.value)} · ${percentText(s.share)}` : fmt(s.value)

function toggle(i: number) {
  const on = hidden.value.includes(i)
  hidden.value = on ? hidden.value.filter((h) => h !== i) : [...hidden.value, i]
  emit('toggle', props.series![i].name, on)
}

function onKeydown(event: KeyboardEvent) {
  const n = count.value
  if (!n) return
  const moves: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1 }
  if (event.key === 'Home') hover.value = 0
  else if (event.key === 'End') hover.value = n - 1
  else if (event.key in moves) hover.value = Math.min(n - 1, Math.max(0, (hover.value ?? -1) + moves[event.key]))
  else if (event.key === 'Escape') hover.value = null
  else return
  event.preventDefault()
}

const tipSide = (i: number) => (i + 0.5 > count.value * 0.6 ? 'left' : 'right')
const summary = computed(() => props.label ?? loc.value.bars.summary(props.mode, props.series?.length ?? 0, count.value))
</script>

<template>
  <figure
    v-if="!series"
    :class="['ml-bars', `ml-bars--${tone}`]"
    :style="{ '--_h': `${height}px` }"
    role="img"
    :aria-label="label ?? data.map((d) => `${d.label} ${fmt(d.value)}`).join('，')"
  >
    <div class="ml-bars__axis" aria-hidden="true">
      <span v-for="t in tickValues" :key="t">{{ fmt(t) }}</span>
    </div>
    <div class="ml-bars__plot" aria-hidden="true">
      <div class="ml-bars__grid">
        <i v-for="t in tickValues" :key="t" />
      </div>
      <div v-for="(d, i) in data" :key="`${i}-${d.label}`" class="ml-bars__col">
        <div class="ml-bars__track">
          <div
            :class="['ml-bars__bar', { 'ml-bars__bar--hi': i === highlighted }]"
            :style="{ height: `${(d.value / top) * 100}%`, '--_i': i }"
          >
            <span v-if="i === highlighted" class="ml-bars__tip">{{ fmt(d.value) }}</span>
          </div>
        </div>
        <span class="ml-bars__x">{{ d.label }}</span>
      </div>
    </div>
  </figure>
  <figure
    v-else
    :class="['ml-bars', 'ml-bars--multi', `ml-bars--${mode}`, { 'ml-bars--totals': totals }]"
    :style="{ '--_h': `${height}px` }"
  >
    <div v-if="showLegend" class="ml-bars__legend">
      <button
        v-for="(s, i) in series"
        :key="s.name"
        type="button"
        :class="['ml-bars__key', { 'ml-bars__key--off': hidden.includes(i) }]"
        :aria-pressed="!hidden.includes(i)"
        :aria-label="loc.bars.toggle(s.name)"
        @click="toggle(i)"
      >
        <i :style="{ background: colors[i], color: colors[i] }" />{{ s.name }}
      </button>
    </div>
    <div class="ml-bars__body">
      <div class="ml-bars__axis" aria-hidden="true">
        <span v-for="t in axis" :key="t">{{ tickText(t) }}</span>
      </div>
      <div
        class="ml-bars__plot"
        role="img"
        tabindex="0"
        :aria-label="summary"
        @pointerleave="hover = null"
        @keydown="onKeydown"
        @blur="hover = null"
      >
        <div class="ml-bars__grid">
          <i v-for="t in axis" :key="t" :class="{ 'ml-bars__zero': t === 0 }" />
        </div>
        <div
          v-for="(c, i) in cats"
          :key="i"
          :class="['ml-bars__col', { 'ml-bars__col--on': i === hover }]"
          @pointerenter="hover = i"
        >
          <div class="ml-bars__track">
            <div v-for="slot in c.slots" :key="slot.key" class="ml-bars__slot">
              <div
                v-for="s in slot.segments"
                :key="s.series"
                :class="['ml-bars__seg', { 'ml-bars__seg--neg': s.to < s.from }]"
                :style="segStyle(s, i)"
              />
            </div>
            <span v-if="totals && c.segments.length" class="ml-bars__total" :style="{ bottom: `${pos(c.top)}%` }">{{ fmt(c.total) }}</span>
          </div>
          <span class="ml-bars__x">{{ catLabel(i) }}</span>
          <div v-if="i === hover" :class="['ml-bars__pop', `ml-bars__pop--${tipSide(i)}`]" aria-live="polite">
            <p class="ml-bars__pop-title">{{ catLabel(i) }}</p>
            <p v-for="s in c.segments" :key="s.series" class="ml-bars__pop-row">
              <i :style="{ background: colors[s.series] }" />
              <span>{{ series[s.series].name }}</span>
              <b>{{ valueText(s) }}</b>
            </p>
            <p v-if="mode !== 'grouped' && c.segments.length" class="ml-bars__pop-row ml-bars__pop-row--total">
              <span>{{ loc.bars.total }}</span>
              <b>{{ fmt(c.total) }}</b>
            </p>
          </div>
        </div>
      </div>
    </div>
    <table class="ml-visually-hidden">
      <caption>{{ loc.bars.table }}</caption>
      <thead>
        <tr>
          <th scope="col">{{ loc.bars.category }}</th>
          <th v-for="s in series" :key="s.name" scope="col">{{ s.name }}</th>
          <th v-if="mode !== 'grouped'" scope="col">{{ loc.bars.total }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(_, i) in count" :key="i">
          <th scope="row">{{ catLabel(i) }}</th>
          <td v-for="s in series" :key="s.name">{{ s.data[i] !== undefined ? fmt(s.data[i]) : '—' }}</td>
          <td v-if="mode !== 'grouped'">{{ fmt(series.reduce((sum, s) => sum + (s.data[i] ?? 0), 0)) }}</td>
        </tr>
      </tbody>
    </table>
  </figure>
</template>
