<script setup lang="ts">
import { computed, ref } from 'vue'
import { addDays, dayKey, startOfDay } from './dates'
import { createPawPath } from './paw'
import { useLocale } from '../locale'
import type { MlHeatmapDatum } from '../types'

const loc = useLocale()

const props = withDefaults(
  defineProps<{
    data: MlHeatmapDatum[]
    /** Last day shown (default: today). The grid covers `weeks` weeks ending here. */
    end?: Date
    weeks?: number
    /** Cell shape: rounded squares or little paw prints. */
    cell?: 'square' | 'paw'
    /** Counts at or above each threshold get levels 1–4. Default: quartiles of the data. */
    thresholds?: [number, number, number, number]
    /** 0 = Sunday, 1 = Monday. */
    weekStartsOn?: 0 | 1
    tone?: 'gold' | 'tech' | 'bean' | 'success'
    /** Text for a cell's tooltip / accessible name. */
    format?: (count: number, date: Date) => string
    /** Accessible summary of the whole chart. */
    label?: string
  }>(),
  { weeks: 53, cell: 'square', weekStartsOn: 0, tone: 'gold' },
)

const emit = defineEmits<{ select: [date: Date, count: number] }>()

const SIZE = 12
const GAP = 3
const STEP = SIZE + GAP
const LEFT = 28
const TOP = 18

/** "2026-10-03" is a local calendar day, not UTC midnight (which shifts a day west of Greenwich). */
function toDay(value: Date | string) {
  if (typeof value !== 'string') return startOfDay(value)
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  return startOfDay(m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(value))
}

const counts = computed(() => {
  const map = new Map<string, number>()
  for (const d of props.data) {
    const date = toDay(d.date)
    const key = dayKey(date)
    map.set(key, (map.get(key) ?? 0) + d.count)
  }
  return map
})

const lastDay = computed(() => startOfDay(props.end ?? new Date()))
/** First cell: the start of the week `weeks - 1` weeks before the last day's week. */
const firstDay = computed(() => {
  const end = lastDay.value
  const offset = (end.getDay() - props.weekStartsOn + 7) % 7
  return addDays(end, -offset - (props.weeks - 1) * 7)
})

const levels = computed<[number, number, number, number]>(() => {
  if (props.thresholds) return props.thresholds
  const values = [...counts.value.values()].filter((v) => v > 0).sort((a, b) => a - b)
  if (!values.length) return [1, 2, 3, 4]
  const q = (p: number) => values[Math.min(values.length - 1, Math.floor(p * values.length))]
  return [1, Math.max(2, q(0.25)), Math.max(3, q(0.5)), Math.max(4, q(0.75))]
})

const levelOf = (n: number) => (n <= 0 ? 0 : n >= levels.value[3] ? 4 : n >= levels.value[2] ? 3 : n >= levels.value[1] ? 2 : 1)

const cells = computed(() => {
  const out: { x: number; y: number; date: Date; count: number; level: number; key: string }[] = []
  for (let w = 0; w < props.weeks; w++) {
    for (let d = 0; d < 7; d++) {
      const date = addDays(firstDay.value, w * 7 + d)
      if (date > lastDay.value) break
      const key = dayKey(date)
      const count = counts.value.get(key) ?? 0
      out.push({ x: LEFT + w * STEP, y: TOP + d * STEP, date, count, level: levelOf(count), key })
    }
  }
  return out
})

const total = computed(() => cells.value.reduce((sum, c) => sum + c.count, 0))

const monthLabels = computed(() => {
  const fmt = new Intl.DateTimeFormat(loc.value.name, { month: 'short' })
  const out: { x: number; text: string }[] = []
  let last = -1
  for (let w = 0; w < props.weeks; w++) {
    const date = addDays(firstDay.value, w * 7)
    if (date.getMonth() !== last && date.getDate() <= 7) {
      // Skip a label that would collide with the previous one.
      if (!out.length || LEFT + w * STEP - out[out.length - 1].x > 26) out.push({ x: LEFT + w * STEP, text: fmt.format(date) })
      last = date.getMonth()
    }
  }
  return out
})

const weekdayLabels = computed(() => {
  const fmt = new Intl.DateTimeFormat(loc.value.name, { weekday: 'short' })
  // Label every other row, like GitHub (Mon / Wed / Fri).
  return [1, 3, 5].map((row) => ({
    y: TOP + row * STEP + SIZE - 2,
    text: fmt.format(new Date(2023, 0, 1 + ((row + props.weekStartsOn) % 7))),
  }))
})

const width = computed(() => LEFT + props.weeks * STEP)
const height = TOP + 7 * STEP

const dateFmt = computed(() => new Intl.DateTimeFormat(loc.value.name, { dateStyle: 'medium' }))
const describe = (c: { count: number; date: Date }) =>
  props.format ? props.format(c.count, c.date) : loc.value.heatmap.cell(c.count, dateFmt.value.format(c.date))

const pawPath = createPawPath()
const hovered = ref<string | null>(null)
</script>

<template>
  <figure :class="['ml-heatmap', `ml-heatmap--${tone}`, `ml-heatmap--${cell}`]">
    <div class="ml-heatmap__scroll">
      <svg
        :viewBox="`0 0 ${width} ${height}`"
        :width="width"
        :height="height"
        role="img"
        :aria-label="label ?? loc.heatmap.summary(total)"
      >
        <text v-for="m in monthLabels" :key="m.x" :x="m.x" y="10" class="ml-heatmap__axis">{{ m.text }}</text>
        <text v-for="d in weekdayLabels" :key="d.y" x="0" :y="d.y" class="ml-heatmap__axis">{{ d.text }}</text>
        <g v-for="(c, i) in cells" :key="c.key" :style="{ '--_i': Math.floor(i / 7) }">
          <path
            v-if="cell === 'paw'"
            :d="pawPath"
            :transform="`translate(${c.x} ${c.y}) scale(${SIZE / 24})`"
            :class="['ml-heatmap__cell', `ml-heatmap__cell--l${c.level}`, { 'ml-heatmap__cell--hover': hovered === c.key }]"
            @mouseenter="hovered = c.key"
            @mouseleave="hovered = null"
            @click="emit('select', c.date, c.count)"
          >
            <title>{{ describe(c) }}</title>
          </path>
          <rect
            v-else
            :x="c.x"
            :y="c.y"
            :width="SIZE"
            :height="SIZE"
            rx="2.5"
            :class="['ml-heatmap__cell', `ml-heatmap__cell--l${c.level}`, { 'ml-heatmap__cell--hover': hovered === c.key }]"
            @mouseenter="hovered = c.key"
            @mouseleave="hovered = null"
            @click="emit('select', c.date, c.count)"
          >
            <title>{{ describe(c) }}</title>
          </rect>
        </g>
      </svg>
    </div>
    <figcaption class="ml-heatmap__foot">
      <span class="ml-heatmap__total"><slot name="summary" :total="total">{{ loc.heatmap.summary(total) }}</slot></span>
      <span class="ml-heatmap__legend" aria-hidden="true">
        {{ loc.heatmap.less }}
        <i v-for="l in 5" :key="l" :class="['ml-heatmap__swatch', `ml-heatmap__cell--l${l - 1}`]" />
        {{ loc.heatmap.more }}
      </span>
    </figcaption>
  </figure>
</template>
