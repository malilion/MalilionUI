<script setup lang="ts">
import { computed, nextTick, ref, useId } from 'vue'
import { chartStops, percentText } from './charts'
import { sankeyLayout, sankeyNeighbour, type MlSankeyLink, type MlSankeyNode, type SankeyDirection } from './sankey'
import { useLocale } from '../locale'
import type { MlChartTone } from '../types'

const loc = useLocale()

const props = withDefaults(
  defineProps<{
    nodes: MlSankeyNode[]
    links: MlSankeyLink[]
    /** viewBox size; the diagram scales to its container's width. */
    width?: number
    height?: number
    nodeWidth?: number
    /** Vertical gap between nodes in a column. */
    nodePadding?: number
    /** Tone for every node without its own, or a palette handed out in order. */
    tone?: MlChartTone | MlChartTone[]
    format?: (value: number) => string
    /** Node names (and totals) beside the nodes. */
    labels?: boolean
    tooltip?: boolean
    /** Accessible summary of the chart. */
    label?: string
  }>(),
  { width: 640, height: 320, nodeWidth: 14, nodePadding: 14, tone: undefined, labels: true, tooltip: true },
)

const fmt = (v: number) => (props.format ? props.format(v) : v.toLocaleString())
const uid = `ml-sankey-${useId()}`

const layout = computed(() =>
  sankeyLayout(props.nodes, props.links, {
    width: props.width,
    height: props.height,
    nodeWidth: props.nodeWidth,
    nodePadding: props.nodePadding,
    palette: props.tone === undefined ? undefined : Array.isArray(props.tone) ? props.tone : [props.tone],
  }),
)
const color = (i: number) => chartStops[layout.value.nodes[i].tone][0]

type Active = { kind: 'node' | 'link'; i: number }
const hovered = ref<Active | null>(null)
const focused = ref<number | null>(null)
const active = computed<Active | null>(() => hovered.value ?? (focused.value === null ? null : { kind: 'node', i: focused.value }))

/** What stays lit while something is hovered or focused: its own flows and the nodes at their ends. */
const lit = computed(() => {
  const a = active.value
  if (!a) return null
  const links = new Set<number>()
  const nodes = new Set<number>()
  for (const l of layout.value.links) {
    if (a.kind === 'link' ? l.index === a.i : l.source === a.i || l.target === a.i) {
      links.add(l.index)
      nodes.add(l.source)
      nodes.add(l.target)
    }
  }
  if (a.kind === 'node') nodes.add(a.i)
  return { links, nodes }
})

const lastColumn = computed(() => layout.value.columns - 1)
const labelAt = (i: number) => {
  const b = layout.value.nodes[i]
  const right = b.column < lastColumn.value || layout.value.columns === 1
  return { x: right ? b.x + b.w + 6 : b.x - 6, y: b.y + b.h / 2, anchor: right ? 'start' : 'end' }
}

const current = computed(() => (focused.value !== null && layout.value.nodes[focused.value] ? focused.value : 0))
const items = ref<SVGGElement[]>([])
function move(i: number) {
  if (i < 0 || !layout.value.nodes[i]) return
  focused.value = i
  nextTick(() => items.value.find((el) => el.dataset.index === String(i))?.focus())
}

const keys: Record<string, SankeyDirection> = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' }
function onKeydown(event: KeyboardEvent) {
  if (keys[event.key]) move(sankeyNeighbour(layout.value.nodes, current.value, keys[event.key]))
  else if (event.key === 'Home') move(0)
  else if (event.key === 'End') move(layout.value.nodes.length - 1)
  else if (event.key === 'Escape') {
    hovered.value = null
    focused.value = null
  } else return
  event.preventDefault()
}

function onFocusOut(event: FocusEvent) {
  if (!(event.currentTarget as Element).contains(event.relatedTarget as Node | null)) focused.value = null
}

const nodeText = (i: number) => {
  const b = layout.value.nodes[i]
  return `${b.label}：${loc.value.sankey.incoming} ${fmt(b.in)}，${loc.value.sankey.outgoing} ${fmt(b.out)}`
}

const pct = (n: number, of: number) => `${((n / of) * 100).toFixed(3)}%`
const tip = computed(() => {
  const a = active.value
  if (!props.tooltip || !a) return null
  const L = layout.value
  if (a.kind === 'node') {
    const b = L.nodes[a.i]
    if (!b) return null
    const right = b.x + b.w / 2 < props.width * 0.6
    return {
      title: b.label,
      color: color(a.i),
      side: right ? 'right' : 'left',
      left: pct(right ? b.x + b.w : b.x, props.width),
      top: pct(b.y + b.h / 2, props.height),
      rows: [
        ...(b.in ? [[loc.value.sankey.incoming, fmt(b.in)]] : []),
        ...(b.out ? [[loc.value.sankey.outgoing, fmt(b.out)]] : []),
      ],
    }
  }
  const l = L.links.find((x) => x.index === a.i)
  if (!l) return null
  const mx = (l.x0 + l.x1) / 2
  return {
    title: loc.value.sankey.flow(L.nodes[l.source].label, L.nodes[l.target].label),
    color: color(l.source),
    side: mx > props.width * 0.6 ? 'left' : 'right',
    left: pct(mx, props.width),
    top: pct((l.y0 + l.y1) / 2, props.height),
    rows: [
      [loc.value.sankey.value, fmt(l.value)],
      [loc.value.sankey.ofSource, percentText(L.nodes[l.source].out ? l.value / L.nodes[l.source].out : 0)],
    ],
  }
})

const summary = computed(() => `${props.label ?? loc.value.sankey.summary(layout.value.nodes.length, layout.value.links.length)}. ${loc.value.sankey.hint}`)
</script>

<template>
  <figure :class="['ml-sankey', { 'ml-sankey--active': lit }]">
    <div class="ml-sankey__stage" @pointerleave="hovered = null">
      <svg class="ml-sankey__svg" :viewBox="`0 0 ${width} ${height}`" role="group" :aria-label="summary" @keydown="onKeydown" @focusout="onFocusOut">
        <defs>
          <linearGradient v-for="l in layout.links" :id="`${uid}-${l.index}`" :key="l.index" gradientUnits="userSpaceOnUse" :x1="l.x0" :x2="l.x1" y1="0" y2="0">
            <stop offset="0" :stop-color="color(l.source)" />
            <stop offset="1" :stop-color="color(l.target)" />
          </linearGradient>
        </defs>
        <g class="ml-sankey__links" aria-hidden="true">
          <path
            v-for="(l, k) in layout.links"
            :key="l.index"
            :class="['ml-sankey__link', { 'ml-sankey__link--on': lit?.links.has(l.index), 'ml-sankey__link--dim': lit && !lit.links.has(l.index) }]"
            :d="l.d"
            :fill="`url(#${uid}-${l.index})`"
            :style="{ '--_sk-i': k }"
            @pointerenter="hovered = { kind: 'link', i: l.index }"
          />
        </g>
        <g
          v-for="(b, i) in layout.nodes"
          :key="b.id + i"
          ref="items"
          :data-index="i"
          :class="[
            'ml-sankey__node',
            `ml-sankey__node--${b.tone}`,
            { 'ml-sankey__node--on': lit?.nodes.has(i), 'ml-sankey__node--dim': lit && !lit.nodes.has(i) },
          ]"
          role="img"
          :aria-label="nodeText(i)"
          :tabindex="current === i ? 0 : -1"
          :style="{ '--_sk-i': b.column, '--_sk-c0': chartStops[b.tone][0], '--_sk-c1': chartStops[b.tone][1] }"
          @pointerenter="hovered = { kind: 'node', i }"
          @focus="focused = i"
        >
          <rect class="ml-sankey__bar" :x="b.x" :y="b.y" :width="b.w" :height="b.h" />
          <text v-if="labels" class="ml-sankey__label" :x="labelAt(i).x" :y="labelAt(i).y" :text-anchor="labelAt(i).anchor">{{ b.label }}<tspan class="ml-sankey__num" dx="5">{{ fmt(b.value) }}</tspan></text>
        </g>
      </svg>
      <div v-if="tip" :class="['ml-sankey__tip', `ml-sankey__tip--${tip.side}`]" :style="{ left: tip.left, top: tip.top }" aria-hidden="true">
        <p class="ml-sankey__tip-title"><i :style="{ background: tip.color }" />{{ tip.title }}</p>
        <p v-for="r in tip.rows" :key="r[0]" class="ml-sankey__tip-row"><span>{{ r[0] }}</span><b>{{ r[1] }}</b></p>
      </div>
    </div>
    <div class="ml-visually-hidden">
    <table>
      <caption>{{ loc.sankey.table }}</caption>
      <thead>
        <tr>
          <th scope="col">{{ loc.sankey.source }}</th>
          <th scope="col">{{ loc.sankey.target }}</th>
          <th scope="col">{{ loc.sankey.value }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="l in layout.links" :key="l.index">
          <th scope="row">{{ layout.nodes[l.source].label }}</th>
          <td>{{ layout.nodes[l.target].label }}</td>
          <td>{{ fmt(l.value) }}</td>
        </tr>
      </tbody>
    </table>
    </div>
  </figure>
</template>
