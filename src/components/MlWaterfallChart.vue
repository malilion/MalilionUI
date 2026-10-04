<script setup lang="ts">
import { computed, ref } from 'vue'
import { waterfallLayout, type MlWaterfallDatum, type WaterfallBar } from './charts-stat'
import { useLocale } from '../locale'

const loc = useLocale()

const props = withDefaults(
  defineProps<{
    data?: MlWaterfallDatum[]
    /** Plot height in px. */
    height?: number
    /** Which colour rises: red (Taiwan markets) or green. Falls take the other. */
    upColor?: 'red' | 'green'
    /** Change labels on the bars. */
    showValues?: boolean
    /** Number of horizontal grid lines. */
    ticks?: number
    format?: (value: number) => string
    /** Accessible summary of the chart. */
    label?: string
  }>(),
  { data: () => [], height: 220, upColor: 'red', showValues: true, ticks: 4 },
)

const fmt = (v: number) => (props.format ? props.format(v) : v.toLocaleString())
const layout = computed(() => waterfallLayout(props.data, props.ticks))
const axis = computed(() => [...layout.value.values].reverse())
const pos = (v: number) => ((v - layout.value.lo) / (layout.value.hi - layout.value.lo || 1)) * 100
const signed = (b: WaterfallBar) => (b.kind === 'total' ? fmt(b.value) : `${b.value > 0 ? '+' : b.value < 0 ? '−' : ''}${fmt(Math.abs(b.value))}`)
const kindText = (b: WaterfallBar) => (b.kind === 'total' ? loc.value.waterfall.total : b.kind === 'up' ? loc.value.waterfall.increase : loc.value.waterfall.decrease)

const hover = ref<number | null>(null)
function onKeydown(event: KeyboardEvent) {
  const n = layout.value.bars.length
  if (!n) return
  const moves: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1 }
  if (event.key === 'Home') hover.value = 0
  else if (event.key === 'End') hover.value = n - 1
  else if (event.key in moves) hover.value = Math.min(n - 1, Math.max(0, (hover.value ?? -1) + moves[event.key]))
  else if (event.key === 'Escape') hover.value = null
  else return
  event.preventDefault()
}
const tipSide = (i: number) => (i + 0.5 > layout.value.bars.length * 0.6 ? 'left' : 'right')
</script>

<template>
  <figure :class="['ml-waterfall', `ml-waterfall--up-${upColor}`, { 'ml-waterfall--values': showValues }]" :style="{ '--_h': `${height}px` }">
    <div class="ml-waterfall__body">
      <div class="ml-waterfall__axis" aria-hidden="true">
        <span v-for="t in axis" :key="t">{{ fmt(t) }}</span>
      </div>
      <div
        class="ml-waterfall__plot"
        role="img"
        tabindex="0"
        :aria-label="label ?? loc.waterfall.summary(layout.bars.length)"
        @pointerleave="hover = null"
        @keydown="onKeydown"
        @blur="hover = null"
      >
        <div class="ml-waterfall__grid">
          <i v-for="t in axis" :key="t" :class="{ 'ml-waterfall__zero': t === 0 }" />
        </div>
        <div v-for="(b, i) in layout.bars" :key="i" :class="['ml-waterfall__col', { 'ml-waterfall__col--on': i === hover }]" @pointerenter="hover = i">
          <div class="ml-waterfall__track">
            <div
              :class="['ml-waterfall__bar', `ml-waterfall__bar--${b.kind}`]"
              :style="{ bottom: `${pos(Math.min(b.from, b.to))}%`, height: `${Math.abs(pos(b.to) - pos(b.from))}%`, '--_i': i }"
            >
              <span v-if="showValues" :class="['ml-waterfall__value', { 'ml-waterfall__value--below': b.to < b.from || b.to < 0 }]">{{ signed(b) }}</span>
            </div>
            <i v-if="i < layout.bars.length - 1" class="ml-waterfall__link" :style="{ bottom: `${pos(b.running)}%` }" />
          </div>
          <span class="ml-waterfall__x">{{ b.label }}</span>
          <div v-if="i === hover" :class="['ml-waterfall__pop', `ml-waterfall__pop--${tipSide(i)}`]" aria-live="polite">
            <p class="ml-waterfall__pop-title">{{ b.label }}</p>
            <p class="ml-waterfall__pop-row">
              <i :class="`ml-waterfall__swatch--${b.kind}`" />
              <span>{{ kindText(b) }}</span>
              <b>{{ signed(b) }}</b>
            </p>
            <p v-if="b.kind !== 'total'" class="ml-waterfall__pop-row ml-waterfall__pop-row--total">
              <span>{{ loc.waterfall.running }}</span>
              <b>{{ fmt(b.running) }}</b>
            </p>
          </div>
        </div>
      </div>
    </div>
    <table class="ml-visually-hidden">
      <caption>{{ loc.waterfall.table }}</caption>
      <thead>
        <tr>
          <th scope="col">{{ loc.waterfall.category }}</th>
          <th scope="col">{{ loc.waterfall.change }}</th>
          <th scope="col">{{ loc.waterfall.running }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(b, i) in layout.bars" :key="i">
          <th scope="row">{{ b.label }}</th>
          <td>{{ b.kind === 'total' ? loc.waterfall.total : signed(b) }}</td>
          <td>{{ fmt(b.running) }}</td>
        </tr>
      </tbody>
    </table>
  </figure>
</template>
