<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { chartStops, funnelStages, percentText } from './charts'
import { useLocale } from '../locale'
import type { MlChartTone, MlFunnelDatum } from '../types'

const loc = useLocale()

const props = withDefaults(
  defineProps<{
    data: MlFunnelDatum[]
    /** Stages stacked top → bottom (vertical) or left → right (horizontal). */
    orientation?: 'vertical' | 'horizontal'
    /** Tapered trapezoids, or plain bars. */
    shape?: 'trapezoid' | 'rect'
    /** Tone for stages without their own. */
    tone?: MlChartTone
    /** Vertical: height of each stage (px). Horizontal: height of the shapes (px). */
    size?: number
    /** Show each stage's share of the first stage on the shape. */
    share?: boolean
    format?: (value: number) => string
    /** Accessible summary of the chart. */
    label?: string
  }>(),
  { orientation: 'vertical', shape: 'trapezoid', tone: 'gold', size: undefined, share: true },
)

const emit = defineEmits<{ select: [index: number, datum: MlFunnelDatum] }>()

const fmt = (v: number) => (props.format ? props.format(v) : v.toLocaleString())

const stages = computed(() => {
  const list = funnelStages(props.data)
  return list.map((st, i) => {
    const tone = st.tone ?? props.tone
    const a = st.width * 100
    // A trapezoid tapers into the next stage; the last one narrows a little on its own.
    const b = props.shape === 'rect' ? a : (list[i + 1]?.width ?? st.width * 0.82) * 100
    return { ...st, tone, a, b, c0: chartStops[tone][0], c1: chartStops[tone][1] }
  })
})

const overall = computed(() => {
  const list = stages.value
  return list.length ? list[list.length - 1].fromFirst : 0
})
const summary = computed(() => props.label ?? loc.value.funnel.summary(props.data.length, percentText(overall.value)))
const thickness = computed(() => props.size ?? (props.orientation === 'vertical' ? 52 : 200))

// Inspection: hover or arrow keys light a stage and show its details. Focus roves between the stages.
const active = ref<number | null>(null)
const items = ref<HTMLElement[]>([])

function move(i: number) {
  const n = props.data.length
  if (!n) return
  active.value = Math.min(n - 1, Math.max(0, i))
  nextTick(() => items.value[active.value ?? 0]?.focus())
}

function onKeydown(event: KeyboardEvent) {
  const cur = active.value ?? 0
  if (event.key === 'ArrowDown' || event.key === 'ArrowRight') move(cur + 1)
  else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') move(cur - 1)
  else if (event.key === 'Home') move(0)
  else if (event.key === 'End') move(props.data.length - 1)
  else if (event.key === 'Escape') active.value = null
  else if (event.key === 'Enter' || event.key === ' ') {
    if (active.value !== null) emit('select', active.value, props.data[active.value])
  } else return
  event.preventDefault()
}

function onFocusOut(event: FocusEvent) {
  if (!(event.currentTarget as HTMLElement).contains(event.relatedTarget as Node | null)) active.value = null
}
</script>

<template>
  <figure
    :class="['ml-funnel', `ml-funnel--${orientation}`, `ml-funnel--${shape}`]"
    :style="{ '--_size': `${thickness}px`, '--_n': data.length }"
  >
    <ol class="ml-funnel__list" :aria-label="summary" @keydown="onKeydown" @focusout="onFocusOut" @pointerleave="active = null">
      <li
        v-for="(s, i) in stages"
        :key="`${i}-${s.label}`"
        ref="items"
        :class="['ml-funnel__stage', `ml-funnel__stage--${s.tone}`, { 'ml-funnel__stage--on': active === i }]"
        :tabindex="(active ?? 0) === i ? 0 : -1"
        :style="{ '--_i': i, '--_a': s.a, '--_b': s.b, '--_c0': s.c0, '--_c1': s.c1 }"
        @pointerenter="active = i"
        @focus="active = i"
        @click="emit('select', i, data[i])"
      >
        <span class="ml-funnel__label">{{ s.label }}</span>
        <span class="ml-funnel__track" aria-hidden="true">
          <span class="ml-funnel__shape" />
          <span v-if="share" class="ml-funnel__share">{{ percentText(s.fromFirst) }}</span>
        </span>
        <span class="ml-funnel__value">{{ fmt(s.value) }}</span>
        <span class="ml-funnel__rate">
          <small>{{ i ? loc.funnel.fromPrev : loc.funnel.start }}</small>{{ percentText(s.fromPrev) }}<span class="ml-visually-hidden"> ({{ loc.funnel.fromFirst }} {{ percentText(s.fromFirst) }})</span>
        </span>
        <div v-if="active === i" class="ml-funnel__tip" aria-hidden="true">
          <p class="ml-funnel__tip-title">{{ s.label }}</p>
          <p class="ml-funnel__tip-row"><span>{{ loc.funnel.value }}</span><b>{{ fmt(s.value) }}</b></p>
          <p v-if="i" class="ml-funnel__tip-row"><span>{{ loc.funnel.fromPrev }}</span><b>{{ percentText(s.fromPrev) }}</b></p>
          <p class="ml-funnel__tip-row"><span>{{ loc.funnel.fromFirst }}</span><b>{{ percentText(s.fromFirst) }}</b></p>
          <p v-if="i" class="ml-funnel__tip-row"><span>{{ loc.funnel.drop }}</span><b>{{ fmt(s.drop) }}</b></p>
        </div>
      </li>
    </ol>
  </figure>
</template>
