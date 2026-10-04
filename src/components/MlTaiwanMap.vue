<script setup lang="ts">
import { computed, ref } from 'vue'
import { useLocale } from '../locale'
import {
  TAIWAN_MAP_FRAMES,
  TAIWAN_MAP_SHAPES,
  TAIWAN_MAP_SIZE,
  taiwanMapAnchor,
  taiwanMapFormat,
  taiwanMapLang,
  taiwanMapName,
  taiwanMapNeighbour,
  taiwanMapScale,
  taiwanMapSelection,
  taiwanMapShortName,
  taiwanMapValues,
  type MlTaiwanMapData,
  type MlTaiwanMapLang,
  type MlTaiwanMapScale,
  type MlTaiwanMapTone,
  type TaiwanMapDirection,
} from './taiwan-map'

const loc = useLocale()

const props = withDefaults(
  defineProps<{
    /** One value per 縣市: `{ 臺北市: 12 }` or `[{ county, value }]`. 台/臺 and English names both work. */
    data?: MlTaiwanMapData
    tone?: MlTaiwanMapTone
    /** `linear`: shade ∝ value. `quantile`: bands with about as many 縣市 each. */
    scale?: MlTaiwanMapScale
    /** Number of colour bands (linear: a gradient when unset; quantile: default 5). */
    steps?: number
    /** Fix the scale's min / max instead of using the data's. */
    domain?: [number, number]
    /** Show the colour legend (when there is data). */
    legend?: boolean
    /** Value text in the tooltip, legend and data table. */
    format?: (value: number, county?: string) => string
    /** Name of the value in the tooltip and data table (default 「數值」). */
    valueLabel?: string
    /** Click / Enter selects 縣市 (v-model:selected). */
    selectable?: boolean
    /** Select several 縣市; `selected` is then an array. */
    multiple?: boolean
    /** 縣市 drawn with an emphasised outline (not a selection). */
    highlight?: string | string[]
    /** 縣市 that can't be selected. */
    disabled?: string[]
    /** Draw short names (臺北, 竹市…) on the map. */
    labels?: boolean
    /** Tooltip on hover / focus. */
    tooltip?: boolean
    /** Map height in px; the width follows the map's aspect ratio (and never overflows). */
    height?: number
    /** Names in Chinese or English. Default: follows the locale. */
    lang?: MlTaiwanMapLang
    /** Accessible summary of the map. */
    label?: string
  }>(),
  { tone: 'gold', scale: 'linear', legend: true, selectable: true, multiple: false, labels: false, tooltip: true, height: 480 },
)

const selected = defineModel<string | string[] | null>('selected', { default: null })
const emit = defineEmits<{ select: [county: string, selected: boolean] }>()

const [W, H] = TAIWAN_MAP_SIZE
const lang = computed(() => taiwanMapLang(loc.value.name, props.lang))
const fmt = (v: number, county?: string) => (props.format ? props.format(v, county) : taiwanMapFormat(v))

const values = computed(() => taiwanMapValues(props.data))
const scaleInfo = computed(() => taiwanMapScale([...values.value.values()], { scale: props.scale, steps: props.steps, domain: props.domain }))
const selection = computed(() => taiwanMapSelection(selected.value))
const highlights = computed(() => taiwanMapSelection(props.highlight ?? null))
const disabledSet = computed(() => new Set(taiwanMapSelection(props.disabled ?? null)))

const hovered = ref<string | null>(null)
const focused = ref<string | null>(null)
const keyboard = ref(false)
const tipHidden = ref(false)

const counties = computed(() =>
  TAIWAN_MAP_SHAPES.map((s, i) => {
    const value = values.value.get(s.name)
    const name = taiwanMapName(s.name, lang.value)
    return {
      ...s,
      i,
      inset: TAIWAN_MAP_FRAMES.some((f) => f.county === s.name),
      value,
      label: name,
      short: taiwanMapShortName(s.name, lang.value),
      t: value === undefined ? undefined : scaleInfo.value.shade(value),
      text: value === undefined ? loc.value.taiwanMap.noData : fmt(value, s.name),
      selected: selection.value.includes(s.name),
      highlighted: highlights.value.includes(s.name),
      disabled: disabledSet.value.has(s.name),
    }
  }),
)
const outlined = computed(() => counties.value.filter((c) => c.selected || c.highlighted))
const hasEmpty = computed(() => counties.value.some((c) => c.value === undefined))
const showLegend = computed(() => props.legend && values.value.size > 0)
const summary = computed(
  () => props.label ?? loc.value.taiwanMap.summary(values.value.size, fmt(scaleInfo.value.min), fmt(scaleInfo.value.max)),
)

/** Roving tabindex: the focused 縣市, else the first selected one, else 臺北市. */
const rover = computed(() => focused.value ?? selection.value.find((n) => counties.value.some((c) => c.name === n)) ?? TAIWAN_MAP_SHAPES[0].name)

const tip = computed(() => {
  if (!props.tooltip || tipHidden.value) return null
  const name = hovered.value ?? focused.value
  const c = name ? counties.value.find((x) => x.name === name) : undefined
  const at = c && taiwanMapAnchor(c.name)
  if (!c || !at) return null
  return { c, left: (at[0] / W) * 100, top: (at[1] / H) * 100, side: at[0] > W * 0.6 ? 'left' : 'right' }
})
/** Labels stay about 11px on screen whatever the map's height (view-box units). */
const labelSize = computed(() => +((11 * H) / props.height).toFixed(1))
const ring = computed(() => (keyboard.value && focused.value ? counties.value.find((c) => c.name === focused.value) : undefined))

function toggle(name: string) {
  if (!props.selectable || disabledSet.value.has(name)) return
  const on = selection.value.includes(name)
  if (props.multiple) selected.value = on ? selection.value.filter((n) => n !== name) : [...selection.value, name]
  else selected.value = on ? null : name
  emit('select', name, !on)
}

const svg = ref<SVGSVGElement>()
function focusCounty(name: string | undefined) {
  if (!name) return
  const el = svg.value?.querySelector<SVGPathElement>(`[data-county="${name}"]`)
  focused.value = name
  keyboard.value = true
  tipHidden.value = false
  el?.focus()
}

const KEYS: Record<string, TaiwanMapDirection> = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' }
function onKeydown(event: KeyboardEvent) {
  const current = focused.value
  if (!current) return
  if (KEYS[event.key]) focusCounty(taiwanMapNeighbour(current, KEYS[event.key]) ?? current)
  else if (event.key === 'Home') focusCounty(TAIWAN_MAP_SHAPES[0].name)
  else if (event.key === 'End') focusCounty(TAIWAN_MAP_SHAPES[TAIWAN_MAP_SHAPES.length - 1].name)
  else if (event.key === 'Enter' || event.key === ' ') toggle(current)
  else if (event.key === 'Escape') tipHidden.value = true
  else return
  event.preventDefault()
}

function onFocus(name: string, event: FocusEvent) {
  focused.value = name
  tipHidden.value = false
  let visible = true
  try {
    visible = (event.target as Element).matches(':focus-visible')
  } catch {
    /* very old engines */
  }
  keyboard.value = visible
}
function onBlur(event: FocusEvent) {
  const next = event.relatedTarget as Node | null
  if (next && svg.value?.contains(next)) return
  focused.value = null
  keyboard.value = false
}
</script>

<template>
  <figure
    :class="['ml-twmap', `ml-twmap--${tone}`, { 'ml-twmap--selectable': selectable, 'ml-twmap--labels': labels }]"
    :style="{ '--_h': `${height}px`, '--_ratio': `${W} / ${H}` }"
  >
    <div class="ml-twmap__stage" @pointerleave="hovered = null">
      <svg
        ref="svg"
        class="ml-twmap__svg"
        :viewBox="`0 0 ${W} ${H}`"
        role="group"
        :aria-label="summary"
        @keydown="onKeydown"
      >
        <g class="ml-twmap__frames" aria-hidden="true">
          <rect v-for="f in TAIWAN_MAP_FRAMES" :key="f.county" class="ml-twmap__frame" :x="f.x" :y="f.y" :width="f.w" :height="f.h" rx="4" />
        </g>
        <path
          v-for="c in counties"
          :key="c.name"
          :data-county="c.name"
          :class="[
            'ml-twmap__county',
            {
              'ml-twmap__county--empty': c.t === undefined,
              'ml-twmap__county--selected': c.selected,
              'ml-twmap__county--highlight': c.highlighted,
              'ml-twmap__county--disabled': c.disabled,
              'ml-twmap__county--hover': hovered === c.name,
            },
          ]"
          :d="c.d"
          :style="c.t === undefined ? { '--_i': c.i } : { '--_i': c.i, '--_t': c.t.toFixed(3) }"
          :tabindex="c.name === rover ? 0 : -1"
          :role="selectable ? 'button' : 'img'"
          :aria-label="loc.taiwanMap.cell(c.label, c.text)"
          :aria-pressed="selectable ? c.selected : undefined"
          :aria-disabled="c.disabled ? true : undefined"
          @click="toggle(c.name)"
          @pointerenter="hovered = c.name"
          @focus="onFocus(c.name, $event)"
          @blur="onBlur"
        />
        <g class="ml-twmap__outlines" aria-hidden="true">
          <path
            v-for="c in outlined"
            :key="c.name"
            :class="['ml-twmap__outline', c.selected ? 'ml-twmap__outline--selected' : 'ml-twmap__outline--highlight']"
            :d="c.d"
          />
          <path v-if="ring" class="ml-twmap__ring" :d="ring.d" />
        </g>
        <g v-if="labels" class="ml-twmap__labels" aria-hidden="true" :style="{ fontSize: `${labelSize}px` }">
          <text
            v-for="c in counties"
            :key="c.name"
            :class="['ml-twmap__label', { 'ml-twmap__label--on': !c.inset && c.t !== undefined && c.t > 0.55, 'ml-twmap__label--inset': c.inset }]"
            :x="c.x"
            :y="c.y"
          >{{ c.short }}</text>
        </g>
      </svg>
      <div
        v-if="tip"
        :class="['ml-twmap__tip', `ml-twmap__tip--${tip.side}`]"
        :style="{ left: `${tip.left.toFixed(2)}%`, top: `${tip.top.toFixed(2)}%` }"
        aria-hidden="true"
      >
        <p class="ml-twmap__tip-title">{{ tip.c.label }}</p>
        <p class="ml-twmap__tip-row">
          <span>{{ valueLabel ?? loc.taiwanMap.value }}</span><b>{{ tip.c.text }}</b>
        </p>
      </div>
    </div>
    <div v-if="showLegend" class="ml-twmap__legend" aria-hidden="true">
      <template v-if="scaleInfo.buckets">
        <span v-for="b in scaleInfo.buckets" :key="b.t" class="ml-twmap__step">
          <i class="ml-twmap__swatch" :style="{ '--_t': b.t.toFixed(3) }" />{{ fmt(b.from) }} – {{ fmt(b.to) }}
        </span>
      </template>
      <span v-else class="ml-twmap__range">
        <span class="ml-twmap__min">{{ fmt(scaleInfo.min) }}</span>
        <i class="ml-twmap__ramp" />
        <span class="ml-twmap__max">{{ fmt(scaleInfo.max) }}</span>
      </span>
      <span v-if="hasEmpty" class="ml-twmap__step">
        <i class="ml-twmap__swatch ml-twmap__swatch--empty" />{{ loc.taiwanMap.noData }}
      </span>
    </div>
    <table class="ml-visually-hidden">
      <caption>{{ loc.taiwanMap.table }}</caption>
      <thead>
        <tr>
          <th scope="col">{{ loc.taiwanMap.county }}</th>
          <th scope="col">{{ valueLabel ?? loc.taiwanMap.value }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="c in counties" :key="c.name">
          <th scope="row">{{ c.label }}</th>
          <td>{{ c.text }}</td>
        </tr>
      </tbody>
    </table>
  </figure>
</template>
