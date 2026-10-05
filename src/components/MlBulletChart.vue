<script setup lang="ts">
import { computed } from 'vue'
import { chartStops } from './charts'
import { bulletRows, type BulletRow, type MlBulletDatum } from './charts-stat'
import { useLocale } from '../locale'
import type { MlChartTone } from '../types'

const loc = useLocale()

const props = withDefaults(
  defineProps<{
    data?: MlBulletDatum[]
    /** Colour of measures without their own tone. */
    tone?: MlChartTone
    /** Names of the bands, low to high. Default 差 / 普通 / 良好 / 優秀. */
    bandLabels?: string[]
    /** Numbers under each scale. */
    axis?: boolean
    ticks?: number
    format?: (value: number) => string
  }>(),
  { data: () => [], tone: 'gold', axis: true, ticks: 4 },
)

const fmt = (v: number) => (props.format ? props.format(v) : v.toLocaleString())
const rows = computed(() => bulletRows(props.data, props.ticks))
const bandName = (r: BulletRow) => (r.band < 0 ? null : ((props.bandLabels ?? loc.value.bullet.bands)[r.band] ?? null))
const describe = (r: BulletRow) => loc.value.bullet.describe(r.label, fmt(r.value), r.target === undefined ? null : fmt(r.target), bandName(r))
</script>

<template>
  <div class="ml-bullet" role="list">
    <div v-for="(r, i) in rows" :key="i" class="ml-bullet__row" role="listitem" :style="{ '--_c': chartStops[r.tone ?? tone][0], '--_i': i }">
      <div class="ml-bullet__head">
        <span class="ml-bullet__label">{{ r.label }}</span>
        <span v-if="r.sublabel" class="ml-bullet__sub">{{ r.sublabel }}</span>
      </div>
      <div class="ml-bullet__scale" role="img" :aria-label="describe(r)">
        <div class="ml-bullet__track">
          <i v-for="(b, k) in r.bands" :key="k" class="ml-bullet__band" :style="{ left: `${b.from}%`, width: `${b.to - b.from}%`, '--_k': k, '--_n': r.bands.length }" />
          <div class="ml-bullet__bar" :style="{ width: `${r.valuePct}%` }" />
          <i v-if="r.targetPct !== undefined" class="ml-bullet__target" :style="{ left: `${r.targetPct}%` }" />
        </div>
        <div v-if="axis" class="ml-bullet__ticks" aria-hidden="true">
          <span v-for="t in r.ticks" :key="t" :style="{ left: `${(t / r.max) * 100}%` }">{{ fmt(t) }}</span>
        </div>
      </div>
      <span class="ml-bullet__value">
        <b>{{ fmt(r.value) }}</b><small v-if="r.target !== undefined"> / {{ fmt(r.target) }}</small>
      </span>
    </div>
  </div>
</template>
