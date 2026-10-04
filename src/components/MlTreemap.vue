<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { useChartWidth } from './chart-width'
import { chartStops, percentText } from './charts'
import { treemapLayout, treemapNeighbour, type MlTreemapDatum, type TreemapDirection, type TreemapRect, type TreemapTile } from './treemap'
import { useLocale } from '../locale'
import type { MlChartTone } from '../types'

const loc = useLocale()

const props = withDefaults(
  defineProps<{
    data: MlTreemapDatum[]
    /** Height in px; the width follows the container. */
    height?: number
    /** Tone for every item without its own, or a palette handed out in order. */
    tone?: MlChartTone | MlChartTone[]
    format?: (value: number) => string
    /** Names (and values when there is room) on the tiles. */
    labels?: boolean
    tooltip?: boolean
    /** Click / Enter selects a tile (v-model:selected holds its `id ?? label`). */
    selectable?: boolean
    /** Accessible summary of the chart. */
    label?: string
  }>(),
  { height: 320, tone: undefined, labels: true, tooltip: true, selectable: false },
)

const selected = defineModel<string | null>('selected', { default: null })
const emit = defineEmits<{ select: [item: MlTreemapDatum, selected: boolean] }>()

const fmt = (v: number) => (props.format ? props.format(v) : v.toLocaleString())

// Real pixels so the squares stay square; tiles are placed in % so a resize never shows a gap.
const plot = ref<HTMLElement>()
const width = useChartWidth(plot)

const palette = computed(() => (props.tone === undefined ? undefined : Array.isArray(props.tone) ? props.tone : [props.tone]))
const layout = computed(() => treemapLayout(props.data, width.value, props.height, { palette: palette.value }))
const tiles = computed(() => layout.value.tiles.filter((t) => t.w > 0 && t.h > 0))
const box = (r: TreemapRect) => ({
  left: `${((r.x / width.value) * 100).toFixed(3)}%`,
  top: `${((r.y / props.height) * 100).toFixed(3)}%`,
  width: `${((r.w / width.value) * 100).toFixed(3)}%`,
  height: `${((r.h / props.height) * 100).toFixed(3)}%`,
})
const showName = (t: TreemapTile) => props.labels && t.w >= 44 && t.h >= 24
const showValue = (t: TreemapTile) => props.labels && t.w >= 44 && t.h >= 42
const tileText = (t: TreemapTile) =>
  `${t.group ? `${t.group} / ` : ''}${t.label}：${fmt(t.value)}（${percentText(t.share)}）${selected.value === t.key ? `，${loc.value.treemap.selected}` : ''}`

const hovered = ref<number | null>(null)
const focused = ref<number | null>(null)
const active = computed(() => hovered.value ?? focused.value)
/** Roving tabindex: the focused tile, else the selected one, else the first. */
const current = computed(() => {
  if (focused.value !== null && tiles.value[focused.value]) return focused.value
  const s = tiles.value.findIndex((t) => t.key === selected.value)
  return s < 0 ? 0 : s
})

const items = ref<HTMLElement[]>([])
function move(i: number) {
  if (i < 0 || !tiles.value[i]) return
  focused.value = i
  nextTick(() => items.value.find((el) => el.dataset.index === String(i))?.focus())
}

function select(i: number) {
  const t = tiles.value[i]
  if (!props.selectable || !t) return
  const on = selected.value !== t.key
  selected.value = on ? t.key : null
  emit('select', t.datum, on)
}

function clear() {
  const t = tiles.value.find((x) => x.key === selected.value)
  if (!props.selectable || !t) return
  selected.value = null
  emit('select', t.datum, false)
}

const keys: Record<string, TreemapDirection> = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' }
function onKeydown(event: KeyboardEvent) {
  const cur = current.value
  if (keys[event.key]) move(treemapNeighbour(tiles.value, cur, keys[event.key]))
  else if (event.key === 'Home') move(0)
  else if (event.key === 'End') move(tiles.value.length - 1)
  else if (event.key === 'Enter' || event.key === ' ') select(cur)
  else if (event.key === 'Escape') clear()
  else return
  event.preventDefault()
}

function onFocusOut(event: FocusEvent) {
  if (!(event.currentTarget as HTMLElement).contains(event.relatedTarget as Node | null)) focused.value = null
}

const tip = computed(() => {
  if (!props.tooltip || active.value === null) return null
  const t = tiles.value[active.value]
  if (!t) return null
  const cx = t.x + t.w / 2
  return {
    t,
    side: cx > width.value * 0.6 ? 'left' : 'right',
    left: `${((cx / width.value) * 100).toFixed(3)}%`,
    top: `${(((t.y + t.h / 2) / props.height) * 100).toFixed(3)}%`,
  }
})

const summary = computed(() => `${props.label ?? loc.value.treemap.summary(tiles.value.length, fmt(layout.value.total))}. ${loc.value.treemap.hint}`)
const hasGroups = computed(() => layout.value.groups.length > 0)
</script>

<template>
  <figure :class="['ml-treemap', { 'ml-treemap--selectable': selectable }]" :style="{ '--_tm-h': `${height}px` }">
    <div ref="plot" class="ml-treemap__plot" role="group" :aria-label="summary" @keydown="onKeydown" @focusout="onFocusOut" @pointerleave="hovered = null">
      <div
        v-for="(g, i) in layout.groups"
        :key="`g${i}`"
        :class="['ml-treemap__group', `ml-treemap__group--${g.tone}`]"
        :style="{ ...box(g), '--_tm-c0': chartStops[g.tone][0] }"
        aria-hidden="true"
      >
        <span v-if="g.header" class="ml-treemap__head"><b>{{ g.label }}</b><small>{{ fmt(g.value) }}</small></span>
      </div>
      <div
        v-for="(t, i) in tiles"
        :key="`${t.top}-${t.key}`"
        ref="items"
        :data-index="i"
        :class="[
          'ml-treemap__tile',
          `ml-treemap__tile--${t.tone}`,
          { 'ml-treemap__tile--on': active === i, 'ml-treemap__tile--selected': selected === t.key, 'ml-treemap__tile--dim': selected !== null && selected !== t.key },
        ]"
        :style="{ ...box(t), '--_tm-i': i, '--_tm-w': t.weight.toFixed(3), '--_tm-c0': chartStops[t.tone][0], '--_tm-c1': chartStops[t.tone][1] }"
        :role="selectable ? 'button' : 'img'"
        :aria-pressed="selectable ? selected === t.key : undefined"
        :aria-label="tileText(t)"
        :tabindex="current === i ? 0 : -1"
        @pointerenter="hovered = i"
        @focus="focused = i"
        @click="select(i)"
      >
        <span v-if="showName(t)" class="ml-treemap__label">{{ t.label }}</span>
        <span v-if="showValue(t)" class="ml-treemap__value">{{ fmt(t.value) }}</span>
      </div>
      <div v-if="tip" :class="['ml-treemap__tip', `ml-treemap__tip--${tip.side}`]" :style="{ left: tip.left, top: tip.top }" aria-hidden="true">
        <p class="ml-treemap__tip-title"><i :style="{ background: chartStops[tip.t.tone][0] }" />{{ tip.t.label }}</p>
        <p v-if="tip.t.group" class="ml-treemap__tip-row"><span>{{ loc.treemap.group }}</span><b>{{ tip.t.group }}</b></p>
        <p class="ml-treemap__tip-row"><span>{{ loc.treemap.value }}</span><b>{{ fmt(tip.t.value) }}</b></p>
        <p class="ml-treemap__tip-row"><span>{{ loc.treemap.share }}</span><b>{{ percentText(tip.t.share) }}</b></p>
        <p v-if="tip.t.group" class="ml-treemap__tip-row"><span>{{ loc.treemap.ofGroup }}</span><b>{{ percentText(tip.t.groupShare) }}</b></p>
      </div>
    </div>
    <div class="ml-visually-hidden">
    <table>
      <caption>{{ loc.treemap.table }}</caption>
      <thead>
        <tr>
          <th v-if="hasGroups" scope="col">{{ loc.treemap.group }}</th>
          <th scope="col">{{ loc.treemap.item }}</th>
          <th scope="col">{{ loc.treemap.value }}</th>
          <th scope="col">{{ loc.treemap.share }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="t in layout.tiles" :key="`${t.top}-${t.key}`">
          <td v-if="hasGroups">{{ t.group ?? '' }}</td>
          <th scope="row">{{ t.label }}</th>
          <td>{{ fmt(t.value) }}</td>
          <td>{{ percentText(t.share) }}</td>
        </tr>
      </tbody>
    </table>
    </div>
  </figure>
</template>
