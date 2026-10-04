<script setup lang="ts">
import { computed, ref } from 'vue'
import { chartStops } from './charts'
import { boxLayout, type MlBoxDatum, type MlBoxStats } from './charts-stat'
import { useLocale } from '../locale'
import type { MlChartTone } from '../types'

const loc = useLocale()

const props = withDefaults(
  defineProps<{
    data?: MlBoxDatum[]
    /** Plot height in px. */
    height?: number
    /** Colour of boxes without their own tone. */
    tone?: MlChartTone
    /** Whiskers reach this many IQRs past the box; samples beyond are outliers. */
    whisker?: number
    /** Mark the mean with a diamond. */
    showMean?: boolean
    ticks?: number
    format?: (value: number) => string
    /** Accessible summary of the chart. */
    label?: string
  }>(),
  { data: () => [], height: 220, tone: 'gold', whisker: 1.5, showMean: true, ticks: 5 },
)

const fmt = (v: number) => (props.format ? props.format(v) : Number(v.toFixed(2)).toLocaleString())
const layout = computed(() => boxLayout(props.data, props.ticks, props.whisker))
const axis = computed(() => [...layout.value.values].reverse())
const pos = (v: number) => ((v - layout.value.lo) / (layout.value.hi - layout.value.lo || 1)) * 100
const color = (t?: MlChartTone) => chartStops[t ?? props.tone][0]
const rows = (s: MlBoxStats) => [
  [loc.value.boxplot.max, s.max],
  [loc.value.boxplot.q3, s.q3],
  [loc.value.boxplot.median, s.median],
  [loc.value.boxplot.q1, s.q1],
  [loc.value.boxplot.min, s.min],
  ...(s.mean !== undefined ? [[loc.value.boxplot.mean, s.mean]] : []),
] as [string, number][]

const hover = ref<number | null>(null)
function onKeydown(event: KeyboardEvent) {
  const n = layout.value.boxes.length
  if (!n) return
  const moves: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1 }
  if (event.key === 'Home') hover.value = 0
  else if (event.key === 'End') hover.value = n - 1
  else if (event.key in moves) hover.value = Math.min(n - 1, Math.max(0, (hover.value ?? -1) + moves[event.key]))
  else if (event.key === 'Escape') hover.value = null
  else return
  event.preventDefault()
}
const tipSide = (i: number) => (i + 0.5 > layout.value.boxes.length * 0.6 ? 'left' : 'right')
</script>

<template>
  <figure class="ml-boxplot" :style="{ '--_h': `${height}px` }">
    <div class="ml-boxplot__body">
      <div class="ml-boxplot__axis" aria-hidden="true">
        <span v-for="t in axis" :key="t">{{ fmt(t) }}</span>
      </div>
      <div
        class="ml-boxplot__plot"
        role="img"
        tabindex="0"
        :aria-label="label ?? loc.boxplot.summary(layout.boxes.length)"
        @pointerleave="hover = null"
        @keydown="onKeydown"
        @blur="hover = null"
      >
        <div class="ml-boxplot__grid">
          <i v-for="t in axis" :key="t" />
        </div>
        <div
          v-for="(b, i) in layout.boxes"
          :key="i"
          :class="['ml-boxplot__col', { 'ml-boxplot__col--on': i === hover }]"
          :style="{ '--_c': color(b.tone), '--_i': i }"
          @pointerenter="hover = i"
        >
          <div class="ml-boxplot__track">
            <template v-if="b.stats">
              <i class="ml-boxplot__whisker" :style="{ bottom: `${pos(b.stats.min)}%`, height: `${pos(b.stats.max) - pos(b.stats.min)}%` }" />
              <i class="ml-boxplot__cap" :style="{ bottom: `${pos(b.stats.max)}%` }" />
              <i class="ml-boxplot__cap" :style="{ bottom: `${pos(b.stats.min)}%` }" />
              <div class="ml-boxplot__box" :style="{ bottom: `${pos(b.stats.q1)}%`, height: `${pos(b.stats.q3) - pos(b.stats.q1)}%` }" />
              <i class="ml-boxplot__median" :style="{ bottom: `${pos(b.stats.median)}%` }" />
              <i v-if="showMean && b.stats.mean !== undefined" class="ml-boxplot__mean" :style="{ bottom: `${pos(b.stats.mean)}%` }" />
              <i v-for="(o, k) in b.stats.outliers ?? []" :key="k" class="ml-boxplot__outlier" :style="{ bottom: `${pos(o)}%` }" />
            </template>
          </div>
          <span class="ml-boxplot__x">{{ b.label }}</span>
          <div v-if="i === hover && b.stats" :class="['ml-boxplot__pop', `ml-boxplot__pop--${tipSide(i)}`]" aria-live="polite">
            <p class="ml-boxplot__pop-title">{{ b.label }}</p>
            <p v-for="[name, v] in rows(b.stats)" :key="name" class="ml-boxplot__pop-row">
              <span>{{ name }}</span>
              <b>{{ fmt(v) }}</b>
            </p>
            <p v-if="b.stats.outliers?.length" class="ml-boxplot__pop-row ml-boxplot__pop-row--total">
              <span>{{ loc.boxplot.outliers }}</span>
              <b>{{ b.stats.outliers.map(fmt).join(', ') }}</b>
            </p>
          </div>
        </div>
      </div>
    </div>
    <table class="ml-visually-hidden">
      <caption>{{ loc.boxplot.table }}</caption>
      <thead>
        <tr>
          <th scope="col">{{ loc.boxplot.group }}</th>
          <th scope="col">{{ loc.boxplot.min }}</th>
          <th scope="col">{{ loc.boxplot.q1 }}</th>
          <th scope="col">{{ loc.boxplot.median }}</th>
          <th scope="col">{{ loc.boxplot.q3 }}</th>
          <th scope="col">{{ loc.boxplot.max }}</th>
          <th scope="col">{{ loc.boxplot.outliers }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(b, i) in layout.boxes" :key="i">
          <th scope="row">{{ b.label }}</th>
          <template v-if="b.stats">
            <td>{{ fmt(b.stats.min) }}</td>
            <td>{{ fmt(b.stats.q1) }}</td>
            <td>{{ fmt(b.stats.median) }}</td>
            <td>{{ fmt(b.stats.q3) }}</td>
            <td>{{ fmt(b.stats.max) }}</td>
            <td>{{ b.stats.outliers?.length ? b.stats.outliers.map(fmt).join(', ') : '—' }}</td>
          </template>
          <td v-else colspan="6">—</td>
        </tr>
      </tbody>
    </table>
  </figure>
</template>
