<script setup lang="ts">
import { computed, nextTick, ref, useId, watch } from 'vue'
import MlIcon from './MlIcon.vue'
import { addDays, addMonths, dayKey, sameDay, startOfDay } from './dates'
import { lunarCells, lunarDayParts, lunarYearsOf, type LunarCell, type MlLunarHolidays } from './lunar-calendar'
import { useLocale } from '../locale'

const loc = useLocale()

const props = withDefaults(
  defineProps<{
    min?: Date
    max?: Date
    disabledDate?: (date: Date) => boolean
    /** Intl locale for the month title and weekdays. Default: the active MlLocale. */
    locale?: string
    /** 0 = Sunday, 1 = Monday. */
    weekStartsOn?: 0 | 1
    /** Which day is "today" (fixed in tests and screenshots). Default: now. */
    today?: Date
    /** 農曆 day under each date (初一 shows the month). */
    showLunar?: boolean
    /** 節氣 names. */
    showSolarTerms?: boolean
    /** Holiday names and day-off colours. */
    showHolidays?: boolean
    /** The built-in statutory list (twHolidays). Turn off to rely on `holidays` alone. */
    builtinHolidays?: boolean
    /** Built-in named days that aren't days off (元宵、中元、母親節…). */
    observances?: boolean
    /** Extra / overriding days, e.g. 人事行政總處's 補假 and 調整放假: `{ '2026-02-20': '調整放假' }`. */
    holidays?: MlLunarHolidays
  }>(),
  { weekStartsOn: 0, showLunar: true, showSolarTerms: true, showHolidays: true, builtinHolidays: true, observances: true },
)

const emit = defineEmits<{
  'month-change': [year: number, month: number]
  select: [date: Date, cell: LunarCell]
}>()
const model = defineModel<Date | null>({ default: null })

const todayDay = computed(() => startOfDay(props.today ?? new Date()))
const initial = model.value ?? todayDay.value
const view = ref({ year: initial.getFullYear(), month: initial.getMonth() })
/** The day that owns the roving tabindex. */
const focused = ref(startOfDay(initial))
const slide = ref<'next' | 'prev' | null>(null)
const gridRef = ref<HTMLElement>()
const titleId = `ml-lunar-cal-${useId()}`

const cells = computed(() =>
  lunarCells(view.value.year, view.value.month, {
    weekStartsOn: props.weekStartsOn,
    showLunar: props.showLunar,
    showSolarTerms: props.showSolarTerms,
    showHolidays: props.showHolidays,
    builtinHolidays: props.builtinHolidays,
    observances: props.observances,
    holidays: props.holidays,
  }),
)
const weeks = computed(() => Array.from({ length: 6 }, (_, w) => cells.value.slice(w * 7, w * 7 + 7)))

const lang = computed(() => props.locale ?? loc.value.name)
const isZh = computed(() => lang.value.toLowerCase().startsWith('zh'))
const weekdays = computed(() => {
  const fmt = new Intl.DateTimeFormat(lang.value, { weekday: isZh.value ? 'narrow' : 'short' })
  // 2023-01-01 was a Sunday.
  return Array.from({ length: 7 }, (_, i) => {
    const day = (i + props.weekStartsOn) % 7
    return { text: fmt.format(new Date(2023, 0, 1 + day)), weekend: day === 0 || day === 6 }
  })
})
const title = computed(() =>
  new Intl.DateTimeFormat(lang.value, { year: 'numeric', month: 'long' }).format(new Date(view.value.year, view.value.month, 1)),
)
const lunarYear = computed(() =>
  lunarYearsOf(view.value.year, view.value.month)
    .map((l) => loc.value.lunar.year(l.ganZhi, l.zodiacIndex))
    .join(' / '),
)
const fullDate = (d: Date) => new Intl.DateTimeFormat(lang.value, { dateStyle: 'full' }).format(d)
function dayLabel(cell: LunarCell) {
  const { lunar, names } = lunarDayParts(cell, props.showSolarTerms)
  return lunar || names.length
    ? `${fullDate(cell.date)}, ${loc.value.lunar.day(lunar, names, props.showHolidays && cell.info.off, props.showHolidays && cell.info.workday)}`
    : fullDate(cell.date)
}

function isDisabled(d: Date) {
  if (props.min && d < startOfDay(props.min)) return true
  if (props.max && d > startOfDay(props.max)) return true
  return props.disabledDate?.(d) ?? false
}

function setView(d: Date) {
  const delta = d.getFullYear() * 12 + d.getMonth() - (view.value.year * 12 + view.value.month)
  if (delta) slide.value = delta > 0 ? 'next' : 'prev'
  view.value = { year: d.getFullYear(), month: d.getMonth() }
  emit('month-change', view.value.year, view.value.month)
}

function select(cell: LunarCell) {
  const d = cell.date
  if (isDisabled(d)) return
  focused.value = d
  if (d.getMonth() !== view.value.month) setView(d)
  model.value = d
  emit('select', d, cell)
}

function shiftMonth(delta: number) {
  setView(addMonths(new Date(view.value.year, view.value.month, 1), delta))
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
  const col = (d.getDay() - props.weekStartsOn + 7) % 7
  const moves: Record<string, () => Date> = {
    ArrowLeft: () => addDays(d, -1),
    ArrowRight: () => addDays(d, 1),
    ArrowUp: () => addDays(d, -7),
    ArrowDown: () => addDays(d, 7),
    PageUp: () => addMonths(d, event.shiftKey ? -12 : -1),
    PageDown: () => addMonths(d, event.shiftKey ? 12 : 1),
    Home: () => addDays(d, -col),
    End: () => addDays(d, 6 - col),
  }
  if (moves[event.key]) {
    event.preventDefault()
    moveFocus(moves[event.key]())
  } else if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    const cell = cells.value.find((c) => sameDay(c.date, d))
    if (cell) select(cell)
  }
}

// Follow v-model changes made from outside.
watch(model, (d) => {
  if (d && !sameDay(d, focused.value)) {
    focused.value = startOfDay(d)
    if (d.getMonth() !== view.value.month || d.getFullYear() !== view.value.year) setView(d)
  }
})

/** Move keyboard focus into the grid. */
function focus() {
  moveFocus(focused.value)
}

defineExpose({ focus })
</script>

<template>
  <div class="ml-lunar-cal">
    <div class="ml-lunar-cal__head">
      <button type="button" class="ml-lunar-cal__nav" :aria-label="loc.calendar.prevMonth" @click="shiftMonth(-1)">
        <MlIcon name="chevronLeft" />
      </button>
      <div class="ml-lunar-cal__heading">
        <span :id="titleId" class="ml-lunar-cal__title" aria-live="polite">{{ title }}</span>
        <span v-if="lunarYear" class="ml-lunar-cal__year">{{ lunarYear }}</span>
      </div>
      <button type="button" class="ml-lunar-cal__nav" :aria-label="loc.calendar.nextMonth" @click="shiftMonth(1)">
        <MlIcon name="chevronRight" />
      </button>
    </div>
    <table ref="gridRef" class="ml-lunar-cal__grid" role="grid" :aria-labelledby="titleId" @keydown="onKeydown">
      <thead>
        <tr>
          <th
            v-for="w in weekdays"
            :key="w.text"
            scope="col"
            :class="['ml-lunar-cal__weekday', { 'ml-lunar-cal__weekday--weekend': w.weekend }]"
          >
            {{ w.text }}
          </th>
        </tr>
      </thead>
      <tbody :key="`${view.year}-${view.month}`" :class="['ml-lunar-cal__body', slide && `ml-lunar-cal__body--${slide}`]">
        <tr v-for="(week, w) in weeks" :key="w">
          <td v-for="c in week" :key="c.key" role="gridcell" :aria-selected="sameDay(c.date, model)">
            <button
              type="button"
              :data-day="c.key"
              :tabindex="sameDay(c.date, focused) ? 0 : -1"
              :disabled="isDisabled(c.date)"
              :aria-label="dayLabel(c)"
              :aria-current="sameDay(c.date, todayDay) ? 'date' : undefined"
              :class="[
                'ml-lunar-cal__day',
                {
                  'ml-lunar-cal__day--outside': c.date.getMonth() !== view.month,
                  'ml-lunar-cal__day--today': sameDay(c.date, todayDay),
                  'ml-lunar-cal__day--selected': sameDay(c.date, model),
                  'ml-lunar-cal__day--weekend': c.weekend,
                  'ml-lunar-cal__day--off': showHolidays && c.info.off,
                  'ml-lunar-cal__day--workday': showHolidays && c.info.workday,
                },
              ]"
              @click="select(c)"
            >
              <span class="ml-lunar-cal__num">{{ c.date.getDate() }}</span>
              <span
                v-if="c.label"
                :class="[
                  'ml-lunar-cal__label',
                  `ml-lunar-cal__label--${c.labelKind}`,
                  { 'ml-lunar-cal__label--off': c.labelKind === 'holiday' && c.info.off },
                ]"
                aria-hidden="true"
              >
                {{ c.label }}
              </span>
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
