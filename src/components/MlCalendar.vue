<script setup lang="ts">
import { computed, nextTick, ref, useId, watch } from 'vue'
import MlIcon from './MlIcon.vue'
import MlPaw from './MlPaw.vue'
import { addDays, addMonths, dayKey, monthGrid, sameDay, startOfDay } from './dates'
import type { MlDateRange } from '../types'

const props = withDefaults(
  defineProps<{
    /** "single" uses v-model; "range" uses v-model:range. */
    mode?: 'single' | 'range'
    min?: Date
    max?: Date
    disabledDate?: (date: Date) => boolean
    /** Days that get a little paw marker (events, deadlines…). */
    markers?: Date[]
    locale?: string
    /** 0 = Sunday, 1 = Monday. */
    weekStartsOn?: 0 | 1
  }>(),
  { mode: 'single', locale: 'zh-TW', weekStartsOn: 0 },
)

const emit = defineEmits<{ 'month-change': [year: number, month: number] }>()
const model = defineModel<Date | null>({ default: null })
const range = defineModel<MlDateRange>('range', { default: () => [null, null] })

const today = startOfDay(new Date())
const initial = (props.mode === 'range' ? range.value[0] : model.value) ?? today
const view = ref({ year: initial.getFullYear(), month: initial.getMonth() })
/** The day that owns the roving tabindex. */
const focused = ref(startOfDay(initial))
const hovered = ref<Date | null>(null)
const gridRef = ref<HTMLElement>()
const titleId = `ml-calendar-${useId()}`

const days = computed(() => monthGrid(view.value.year, view.value.month, props.weekStartsOn))
const weeks = computed(() => Array.from({ length: 6 }, (_, w) => days.value.slice(w * 7, w * 7 + 7)))

const isZh = computed(() => props.locale.toLowerCase().startsWith('zh'))
const weekdays = computed(() => {
  const fmt = new Intl.DateTimeFormat(props.locale, { weekday: isZh.value ? 'narrow' : 'short' })
  // 2023-01-01 was a Sunday.
  return Array.from({ length: 7 }, (_, i) => fmt.format(new Date(2023, 0, 1 + ((i + props.weekStartsOn) % 7))))
})
const title = computed(() =>
  new Intl.DateTimeFormat(props.locale, { year: 'numeric', month: 'long' }).format(new Date(view.value.year, view.value.month, 1)),
)
const fullDate = (d: Date) => new Intl.DateTimeFormat(props.locale, { dateStyle: 'full' }).format(d)

const markerKeys = computed(() => new Set((props.markers ?? []).map(dayKey)))

function isDisabled(d: Date) {
  if (props.min && d < startOfDay(props.min)) return true
  if (props.max && d > startOfDay(props.max)) return true
  return props.disabledDate?.(d) ?? false
}

function isSelected(d: Date) {
  if (props.mode === 'single') return sameDay(d, model.value)
  return sameDay(d, range.value[0]) || sameDay(d, range.value[1])
}

/** Between the range ends — or, while picking the end, between start and the hovered day. */
function inRange(d: Date) {
  if (props.mode !== 'range') return false
  const [start, end] = range.value
  const other = end ?? (start ? hovered.value : null)
  if (!start || !other) return false
  const [lo, hi] = start <= other ? [start, other] : [other, start]
  return d > startOfDay(lo) && d < startOfDay(hi)
}

function select(d: Date) {
  if (isDisabled(d)) return
  focused.value = d
  if (d.getMonth() !== view.value.month) setView(d)
  if (props.mode === 'single') {
    model.value = d
    return
  }
  const [start, end] = range.value
  if (!start || end) range.value = [d, null]
  else range.value = d < start ? [d, start] : [start, d]
}

function setView(d: Date) {
  view.value = { year: d.getFullYear(), month: d.getMonth() }
  emit('month-change', view.value.year, view.value.month)
}

function shiftMonth(delta: number) {
  const next = addMonths(new Date(view.value.year, view.value.month, 1), delta)
  setView(next)
  focused.value = addMonths(focused.value, delta)
}

async function moveFocus(d: Date) {
  focused.value = d
  if (d.getMonth() !== view.value.month || d.getFullYear() !== view.value.year) setView(d)
  await nextTick()
  gridRef.value?.querySelector<HTMLElement>(`[data-day="${dayKey(d)}"]`)?.focus()
}

function onKeydown(event: KeyboardEvent) {
  const d = focused.value
  const moves: Record<string, () => Date> = {
    ArrowLeft: () => addDays(d, -1),
    ArrowRight: () => addDays(d, 1),
    ArrowUp: () => addDays(d, -7),
    ArrowDown: () => addDays(d, 7),
    PageUp: () => addMonths(d, event.shiftKey ? -12 : -1),
    PageDown: () => addMonths(d, event.shiftKey ? 12 : 1),
    Home: () => addDays(d, -((d.getDay() - props.weekStartsOn + 7) % 7)),
    End: () => addDays(d, 6 - ((d.getDay() - props.weekStartsOn + 7) % 7)),
  }
  if (moves[event.key]) {
    event.preventDefault()
    moveFocus(moves[event.key]())
  } else if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    select(d)
  }
}

// Follow v-model changes made from outside (e.g. a date typed elsewhere).
watch(
  () => (props.mode === 'range' ? range.value[0] : model.value),
  (d) => {
    if (d && !sameDay(d, focused.value)) {
      focused.value = startOfDay(d)
      if (d.getMonth() !== view.value.month || d.getFullYear() !== view.value.year) setView(d)
    }
  },
)

/** Move keyboard focus into the grid (used by MlDatePicker when it opens). */
function focus() {
  moveFocus(focused.value)
}

defineExpose({ focus })
</script>

<template>
  <div :class="['ml-calendar', `ml-calendar--${mode}`]">
    <div class="ml-calendar__head">
      <button type="button" class="ml-calendar__nav" aria-label="上個月" @click="shiftMonth(-1)">
        <MlIcon name="chevronLeft" />
      </button>
      <span :id="titleId" class="ml-calendar__title" aria-live="polite">{{ title }}</span>
      <button type="button" class="ml-calendar__nav" aria-label="下個月" @click="shiftMonth(1)">
        <MlIcon name="chevronRight" />
      </button>
    </div>
    <table ref="gridRef" class="ml-calendar__grid" role="grid" :aria-labelledby="titleId" @keydown="onKeydown">
      <thead>
        <tr>
          <th v-for="w in weekdays" :key="w" scope="col" class="ml-calendar__weekday">{{ w }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(week, w) in weeks" :key="w">
          <td
            v-for="d in week"
            :key="dayKey(d)"
            :class="{
              'ml-calendar__cell--range': inRange(d),
              'ml-calendar__cell--start': mode === 'range' && sameDay(d, range[0]) && (range[1] || hovered),
              'ml-calendar__cell--end': mode === 'range' && sameDay(d, range[1]),
            }"
            :aria-selected="isSelected(d)"
            role="gridcell"
          >
            <button
              type="button"
              :data-day="dayKey(d)"
              :tabindex="sameDay(d, focused) ? 0 : -1"
              :disabled="isDisabled(d)"
              :aria-label="fullDate(d)"
              :aria-current="sameDay(d, today) ? 'date' : undefined"
              :class="[
                'ml-calendar__day',
                {
                  'ml-calendar__day--outside': d.getMonth() !== view.month,
                  'ml-calendar__day--today': sameDay(d, today),
                  'ml-calendar__day--selected': isSelected(d),
                },
              ]"
              @click="select(d)"
              @mouseenter="hovered = d"
              @mouseleave="hovered = null"
            >
              {{ d.getDate() }}
              <MlPaw v-if="markerKeys.has(dayKey(d))" tone="current" class="ml-calendar__marker" />
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
