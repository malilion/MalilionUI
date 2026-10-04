<script setup lang="ts">
// Internal: the month / quarter / year grid behind MlDatePicker / MlDateRangePicker `type`.
// Mirrors MlCalendar (roving tabindex, slide transition, range band) one level up.
import { computed, nextTick, ref, useId, watch } from 'vue'
import MlIcon from './MlIcon.vue'
import {
  addPeriods,
  comparePeriods,
  formatPeriod,
  periodColumns,
  periodDisabled,
  periodGrid,
  periodKey,
  periodPage,
  periodStart,
  quarterOf,
  samePeriod,
  type PeriodType,
} from './dates'
import type { MlDateRange } from '../types'
import { useLocale } from '../locale'

const loc = useLocale()

const props = withDefaults(
  defineProps<{
    type: PeriodType
    /** "single" uses v-model; "range" uses v-model:range. */
    mode?: 'single' | 'range'
    min?: Date
    max?: Date
    /** Called with each period's first day. */
    disabledDate?: (date: Date) => boolean
    locale?: string
  }>(),
  { mode: 'single' },
)

const model = defineModel<Date | null>({ default: null })
const range = defineModel<MlDateRange>('range', { default: () => [null, null] })

const now = new Date()
const initial = (props.mode === 'range' ? range.value[0] : model.value) ?? now
/** Year shown (month / quarter panels) or first year of the decade (year panel). */
const page = ref(periodPage(initial, props.type))
/** The period that owns the roving tabindex. */
const focused = ref(periodStart(initial, props.type))
const hovered = ref<Date | null>(null)
/** Direction of the last page change, so the new grid slides in from that side. */
const slide = ref<'next' | 'prev' | null>(null)
const gridRef = ref<HTMLElement>()
const titleId = `ml-period-${useId()}`

const cols = computed(() => periodColumns(props.type))
const rows = computed(() => {
  const cells = periodGrid(props.type, page.value)
  return Array.from({ length: cells.length / cols.value }, (_, r) => cells.slice(r * cols.value, r * cols.value + cols.value))
})
/** Periods per page: 12 months, 4 quarters, 10 years. */
const perPage = computed(() => ({ month: 12, quarter: 4, year: 10 })[props.type])

const lang = computed(() => props.locale ?? loc.value.name)
const t = computed(() => loc.value.date.period)
const title = computed(() => (props.type === 'year' ? t.value.decade(page.value, page.value + 9) : t.value.year(page.value)))
const prevLabel = computed(() => (props.type === 'year' ? loc.value.calendar.prevDecade : loc.value.calendar.prevYear))
const nextLabel = computed(() => (props.type === 'year' ? loc.value.calendar.nextDecade : loc.value.calendar.nextYear))

function cellText(d: Date) {
  if (props.type === 'month') return new Intl.DateTimeFormat(lang.value, { month: 'short' }).format(d)
  if (props.type === 'quarter') return t.value.quarterCell(quarterOf(d))
  return String(d.getFullYear())
}
function cellLabel(d: Date) {
  if (props.type === 'month') return new Intl.DateTimeFormat(lang.value, { year: 'numeric', month: 'long' }).format(d)
  return formatPeriod(d, props.type, t.value)
}

const isOutside = (d: Date) => props.type === 'year' && periodPage(d, 'year') !== page.value
const isCurrent = (d: Date) => samePeriod(d, now, props.type)
const isDisabled = (d: Date) => periodDisabled(d, props.type, props.min, props.max, props.disabledDate)

function isSelected(d: Date) {
  if (props.mode === 'single') return samePeriod(d, model.value, props.type)
  return samePeriod(d, range.value[0], props.type) || samePeriod(d, range.value[1], props.type)
}

/** Between the range ends — or, while picking the end, between start and the hovered period. */
function inRange(d: Date) {
  if (props.mode !== 'range') return false
  const [start, end] = range.value
  const other = end ?? (start ? hovered.value : null)
  if (!start || !other) return false
  const [lo, hi] = comparePeriods(start, other, props.type) <= 0 ? [start, other] : [other, start]
  return comparePeriods(d, lo, props.type) > 0 && comparePeriods(d, hi, props.type) < 0
}

function setView(d: Date) {
  const next = periodPage(d, props.type)
  if (next !== page.value) slide.value = next > page.value ? 'next' : 'prev'
  page.value = next
}

function select(d: Date) {
  if (isDisabled(d)) return
  focused.value = d
  if (isOutside(d)) setView(d)
  if (props.mode === 'single') {
    model.value = d
    return
  }
  const [start, end] = range.value
  if (!start || end) range.value = [d, null]
  else range.value = comparePeriods(d, start, props.type) < 0 ? [d, periodStart(start, props.type)] : [periodStart(start, props.type), d]
}

function shiftPage(delta: number) {
  const target = addPeriods(focused.value, props.type, delta * perPage.value)
  setView(target)
  focused.value = target
}

async function moveFocus(d: Date) {
  focused.value = d
  if (periodPage(d, props.type) !== page.value) setView(d)
  await nextTick()
  gridRef.value?.querySelector<HTMLElement>(`[data-period="${periodKey(d, props.type)}"]`)?.focus()
}

function onKeydown(event: KeyboardEvent) {
  const d = focused.value
  const at = (n: number) => addPeriods(d, props.type, n)
  // Position in the row: the year panel starts one year before its decade.
  const index = props.type === 'year' ? d.getFullYear() - page.value + 1 : comparePeriods(d, new Date(page.value, 0, 1), props.type)
  const col = index % cols.value
  const moves: Record<string, () => Date> = {
    ArrowLeft: () => at(-1),
    ArrowRight: () => at(1),
    ArrowUp: () => at(-cols.value),
    ArrowDown: () => at(cols.value),
    PageUp: () => at(-perPage.value),
    PageDown: () => at(perPage.value),
    Home: () => at(-col),
    End: () => at(cols.value - 1 - col),
  }
  if (moves[event.key]) {
    event.preventDefault()
    // Disabled cells can't take focus: skip past them, or stay put at the edge of min / max.
    let next = moves[event.key]()
    const dir = comparePeriods(next, d, props.type) < 0 ? -1 : 1
    for (let i = 0; isDisabled(next) && i < perPage.value; i++) next = addPeriods(next, props.type, dir)
    if (!isDisabled(next)) moveFocus(next)
  } else if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    select(d)
  }
}

// Follow v-model changes made from outside.
watch(
  () => (props.mode === 'range' ? range.value[0] : model.value),
  (d) => {
    if (d && !samePeriod(d, focused.value, props.type)) {
      focused.value = periodStart(d, props.type)
      setView(d)
    }
  },
)

/** Move keyboard focus into the grid (used by the pickers when they open). */
function focus() {
  moveFocus(focused.value)
}

defineExpose({ focus })
</script>

<template>
  <div :class="['ml-calendar', `ml-calendar--${mode}`, 'ml-calendar--period', `ml-calendar--${type}`]">
    <div class="ml-calendar__head">
      <button type="button" class="ml-calendar__nav" :aria-label="prevLabel" @click="shiftPage(-1)">
        <MlIcon name="chevronLeft" />
      </button>
      <span :id="titleId" class="ml-calendar__title" aria-live="polite">{{ title }}</span>
      <button type="button" class="ml-calendar__nav" :aria-label="nextLabel" @click="shiftPage(1)">
        <MlIcon name="chevronRight" />
      </button>
    </div>
    <table ref="gridRef" class="ml-calendar__grid ml-calendar__grid--period" role="grid" :aria-labelledby="titleId" @keydown="onKeydown">
      <tbody :key="`${type}-${page}`" :class="['ml-calendar__body', slide && `ml-calendar__body--${slide}`]">
        <tr v-for="(row, r) in rows" :key="r">
          <td
            v-for="d in row"
            :key="periodKey(d, type)"
            :class="{
              'ml-calendar__cell--range': inRange(d),
              'ml-calendar__cell--start': mode === 'range' && samePeriod(d, range[0], type) && (range[1] || hovered),
              'ml-calendar__cell--end': mode === 'range' && samePeriod(d, range[1], type),
            }"
            :aria-selected="isSelected(d)"
            role="gridcell"
          >
            <button
              type="button"
              :data-period="periodKey(d, type)"
              :tabindex="samePeriod(d, focused, type) ? 0 : -1"
              :disabled="isDisabled(d)"
              :aria-label="cellLabel(d)"
              :aria-current="isCurrent(d) ? 'date' : undefined"
              :class="[
                'ml-calendar__period',
                {
                  'ml-calendar__period--outside': isOutside(d),
                  'ml-calendar__period--today': isCurrent(d),
                  'ml-calendar__period--selected': isSelected(d),
                },
              ]"
              @click="select(d)"
              @mouseenter="hovered = d"
              @mouseleave="hovered = null"
            >
              {{ cellText(d) }}
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
