<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'
import { chartStops } from './charts'
import { icons } from './icons'
import {
  allDayBars,
  dayLabel,
  eventTimeText,
  formatClock,
  hourLabels,
  minuteOfDay,
  minutesAt,
  monthCellAt,
  monthKeyMove,
  monthKeyTarget,
  monthLayout,
  monthTitle,
  moveEvent,
  resizeEvent,
  sameDay,
  schedulerTitle,
  segmentTime,
  shiftAnchor,
  snapMinutes,
  startOfDay,
  timedSegments,
  toDate,
  viewDays,
  weekdayLabel,
  type MlSchedulerEvent,
  type MlSchedulerView,
  type MonthItem,
  type SchedulerRange,
} from './scheduler'
import { useNow } from './use-now'
import type { MlTimeInput } from './relative-time'
import { useLocale } from '../locale'
import type { MlChartTone } from '../types'

const loc = useLocale()

const props = withDefaults(
  defineProps<{
    events?: MlSchedulerEvent[]
    weekStartsOn?: 0 | 1
    /** First and last hour shown (the grid scrolls between them). */
    startHour?: number
    endHour?: number
    /** Pixels per hour. */
    hourHeight?: number
    /** Snap for dragging and keyboard moves, in minutes. */
    step?: number
    /** Height of the scrolling area (the month grid's minimum height). Numbers are pixels. */
    height?: number | string
    /** Hour scrolled to on mount. */
    scrollToHour?: number
    /** Rows of events per day in month view; the rest fold into "還有 n 項". */
    monthMaxEvents?: number
    /** Drag events to move them, their bottom edge to resize, empty slots to create. */
    editable?: boolean
    /** Prev / today / next and the month–week–day switch. */
    toolbar?: boolean
    /** Colour of events without a tone. */
    tone?: MlChartTone
    /** "Now" for the today highlight and the time line. Defaults to the clock. */
    now?: MlTimeInput
  }>(),
  { events: () => [], weekStartsOn: 0, startHour: 0, endHour: 24, hourHeight: 48, step: 15, height: 560, scrollToHour: 8, monthMaxEvents: 3, editable: false, toolbar: true, tone: 'gold' },
)
const emit = defineEmits<{
  'event-click': [event: MlSchedulerEvent]
  change: [event: MlSchedulerEvent, range: SchedulerRange]
  create: [range: SchedulerRange]
}>()
defineSlots<{ event?: (props: { event: MlSchedulerEvent; time: string }) => unknown }>()

const view = defineModel<MlSchedulerView>('view', { default: 'week' })
const date = defineModel<Date>('date')

const VIEWS = ['month', 'week', 'day'] as const
const nowInput = useNow(() => props.now)
const now = computed(() => toDate(nowInput.value) ?? new Date())
const anchor = computed(() => date.value ?? now.value)
const isMonth = computed(() => view.value === 'month')
const days = computed(() => viewDays(anchor.value, view.value, props.weekStartsOn))
const title = computed(() => (isMonth.value ? monthTitle(anchor.value, loc.value.name) : schedulerTitle(days.value, loc.value.name)))
const hours = computed(() => hourLabels(props.startHour, props.endHour))

/* Drafts: the event being dragged is drawn at its new place. */
const draft = ref<{ id: string; range: SchedulerRange } | null>(null)
const shown = computed(() =>
  draft.value ? props.events.map((e) => (e.id === draft.value!.id ? { ...e, start: draft.value!.range.start, end: draft.value!.range.end } : e)) : props.events,
)
const columns = computed(() => {
  if (isMonth.value) return []
  const lo = props.startHour * 60
  const hi = props.endHour * 60
  return timedSegments(shown.value, days.value).map((list) =>
    list
      .filter((s) => s.end > lo && s.start < hi)
      .map((s) => {
        const top = Math.max(s.start, lo)
        const bottom = Math.min(s.end, hi)
        return { ...s, top: ((top - lo) / 60) * props.hourHeight, size: ((bottom - top) / 60) * props.hourHeight, time: segmentTime(s) }
      }),
  )
})
const bars = computed(() => (isMonth.value ? [] : allDayBars(shown.value, days.value)))
const lanes = computed(() => bars.value.reduce((n, b) => Math.max(n, b.lane + 1), 0))
const nowLine = computed(() => {
  const i = days.value.findIndex((d) => sameDay(d, now.value))
  const m = minuteOfDay(now.value)
  if (isMonth.value || i < 0 || m < props.startHour * 60 || m > props.endHour * 60) return null
  return { day: i, top: ((m - props.startHour * 60) / 60) * props.hourHeight }
})

/* Month grid: six week rows, events in lanes, overflow per day. */
const month = computed(() => (isMonth.value ? monthLayout(shown.value, days.value, props.monthMaxEvents) : null))
const weeks = computed(() => (isMonth.value ? Array.from({ length: days.value.length / 7 }, (_, w) => Array.from({ length: 7 }, (_, c) => w * 7 + c)) : []))
const focusIndex = computed(() => Math.max(0, days.value.findIndex((d) => sameDay(d, anchor.value))))
const outside = (d: Date) => d.getMonth() !== anchor.value.getMonth()
function cellLabel(i: number) {
  const count = month.value?.perDay[i].length ?? 0
  return [dayLabel(days.value[i], loc.value.name), count ? loc.value.scheduler.events(count) : ''].filter(Boolean).join('，')
}
const itemTime = (p: MonthItem) => (p.event.allDay ? loc.value.scheduler.allDay : p.time || formatClock(toDate(p.event.start)!))

const canEdit = (e: MlSchedulerEvent) => props.editable && e.editable !== false
const color = (e: MlSchedulerEvent) => chartStops[e.tone ?? props.tone]
function label(e: MlSchedulerEvent, time: string) {
  return [e.title, e.allDay ? loc.value.scheduler.allDay : time, e.location].filter(Boolean).join('，')
}

function go(direction: 1 | -1) {
  date.value = shiftAnchor(anchor.value, view.value, direction)
}
function goToday() {
  date.value = startOfDay(now.value)
}
function openDay(d: Date) {
  date.value = d
  view.value = 'day'
}

/* ── Drag to move / resize ─────────────────────────────── */

const root = ref<HTMLElement>()
const grid = ref<HTMLElement>()
type Box = { left: number; top: number; width: number; height: number }
let drag: { pointer: number; event: MlSchedulerEvent; mode: 'move' | 'resize'; x: number; y: number; colWidth: number; moved: boolean; box?: Box; cell?: number } | null = null
let swallowClick = false

function onEventPointerDown(e: PointerEvent, event: MlSchedulerEvent) {
  if (!canEdit(event) || e.button !== 0) return
  const col = (e.currentTarget as HTMLElement).closest('.ml-scheduler__col, .ml-scheduler__lanes') as HTMLElement | null
  const width = col ? col.getBoundingClientRect().width / (col.classList.contains('ml-scheduler__lanes') ? days.value.length : 1) : 1
  // Month view: which cell was grabbed, so a long bar keeps its offset under the pointer.
  const box = isMonth.value ? grid.value?.getBoundingClientRect() : undefined
  drag = {
    pointer: e.pointerId,
    event,
    mode: (e.target as Element).closest('.ml-scheduler__handle') ? 'resize' : 'move',
    x: e.clientX,
    y: e.clientY,
    colWidth: width || 1,
    moved: false,
    box,
    cell: box ? monthCellAt(e.clientX, e.clientY, box) : undefined,
  }
  e.preventDefault()
  listen(true)
}

function onPointerMove(e: PointerEvent) {
  if (drag && e.pointerId === drag.pointer) {
    if (drag.box) {
      const shift = monthCellAt(e.clientX, e.clientY, drag.box) - drag.cell!
      if (!shift && !drag.moved) return
      drag.moved = true
      const range = moveEvent(drag.event, shift, 0)
      if (range) draft.value = { id: drag.event.id, range }
      return
    }
    const dayShift = view.value === 'week' ? Math.round((e.clientX - drag.x) / drag.colWidth) : 0
    const minutes = drag.event.allDay ? 0 : snapMinutes(((e.clientY - drag.y) / props.hourHeight) * 60, props.step)
    if (!dayShift && !minutes && !drag.moved) return
    drag.moved = true
    const range = drag.mode === 'move' ? moveEvent(drag.event, dayShift, minutes) : resizeEvent(drag.event, drag.event.allDay ? dayShift * 1440 : minutes, props.step)
    if (range) draft.value = { id: drag.event.id, range }
  } else if (create && e.pointerId === create.pointer) {
    if (create.box) {
      const i = monthCellAt(e.clientX, e.clientY, create.box)
      span.value = { from: Math.min(i, create.anchor), to: Math.max(i, create.anchor) }
      return
    }
    const m = minutesAt(e.clientY - create.top, props.hourHeight, props.step, props.startHour)
    ghost.value = m > create.anchor ? { day: create.day, start: create.anchor, end: m } : { day: create.day, start: m, end: create.anchor + props.step }
  }
}

function onPointerUp(e: PointerEvent) {
  const cancelled = e.type === 'pointercancel'
  if (drag && e.pointerId === drag.pointer) {
    const { event, moved } = drag
    const range = draft.value?.range
    drag = null
    draft.value = null
    swallowClick = moved
    if (moved && range && !cancelled) emit('change', event, range)
  } else if (create && e.pointerId === create.pointer) {
    const g = ghost.value
    const s = span.value
    const day = days.value[create.day]
    create = null
    ghost.value = null
    span.value = null
    if (s && !cancelled) emit('create', { start: days.value[s.from], end: days.value[s.to], allDay: true })
    else if (g && day && !cancelled) emit('create', { start: new Date(day.getTime() + g.start * 60_000), end: new Date(day.getTime() + g.end * 60_000) })
  }
  if (!drag && !create) listen(false)
}

function listen(on: boolean) {
  if (typeof window === 'undefined') return
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
  window.removeEventListener('pointercancel', onPointerUp)
  if (on) {
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerUp)
  }
}

function onEventClick(event: MlSchedulerEvent) {
  if (swallowClick) {
    swallowClick = false
    return
  }
  emit('event-click', event)
}

/* ── Drag on an empty slot (or across empty days) to create ── */

let create: { pointer: number; day: number; top: number; anchor: number; box?: Box } | null = null
const ghost = ref<{ day: number; start: number; end: number } | null>(null)
const span = ref<{ from: number; to: number } | null>(null)

function onColumnPointerDown(e: PointerEvent, day: number) {
  if (!props.editable || e.button !== 0 || e.target !== e.currentTarget) return
  const top = (e.currentTarget as HTMLElement).getBoundingClientRect().top
  const start = Math.floor((((e.clientY - top) / props.hourHeight) * 60 + props.startHour * 60) / props.step) * props.step
  create = { pointer: e.pointerId, day, top, anchor: start }
  ghost.value = { day, start, end: start + props.step }
  e.preventDefault()
  listen(true)
}

function onDayPointerDown(e: PointerEvent, day: number) {
  if (!props.editable || e.button !== 0 || e.target !== e.currentTarget || !grid.value) return
  create = { pointer: e.pointerId, day, top: 0, anchor: day, box: grid.value.getBoundingClientRect() }
  span.value = { from: day, to: day }
  e.preventDefault()
  listen(true)
}

/* ── Keyboard ──────────────────────────────────────────── */

const live = ref('')
const body = ref<HTMLElement>()

function describe(range: SchedulerRange, allDay?: boolean) {
  const day = new Intl.DateTimeFormat(loc.value.name, { month: 'short', day: 'numeric', weekday: 'short' })
  return allDay ? day.formatRange(range.start, range.end) : `${day.format(range.start)} ${formatClock(range.start)}–${formatClock(range.end)}`
}

function onEventKeydown(e: KeyboardEvent, event: MlSchedulerEvent) {
  if (!canEdit(event)) return
  let range: SchedulerRange | null = null
  const vertical = e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0
  const horizontal = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0
  if (isMonth.value) range = monthKeyMove(event, e.key, e.shiftKey)
  else if (vertical && !event.allDay) range = e.shiftKey ? resizeEvent(event, vertical * props.step, props.step) : moveEvent(event, 0, vertical * props.step)
  else if (horizontal) range = e.shiftKey && event.allDay ? resizeEvent(event, horizontal * 1440, props.step) : moveEvent(event, horizontal, 0)
  if (!range) return
  e.preventDefault()
  // A moved event leaves the day it was listed under.
  pop.value = null
  emit('change', event, range)
  live.value = loc.value.scheduler.moved(event.title, describe(range, event.allDay))
  // The event may now live in another column: keep the keyboard on it.
  nextTick(() => root.value?.querySelectorAll<HTMLElement>('.ml-scheduler__event').forEach((el) => el.dataset.id === event.id && el.focus()))
}

/* Month grid: roving focus over days; the focused day is the date model. */
function onDayKeydown(e: KeyboardEvent, i: number) {
  if (e.target !== e.currentTarget) return
  const d = days.value[i]
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    openDay(d)
    return
  }
  const next = monthKeyTarget(d, e.key, props.weekStartsOn, e.shiftKey)
  if (!next) return
  e.preventDefault()
  date.value = next
  nextTick(() => grid.value?.querySelector<HTMLElement>('.ml-scheduler__mday[tabindex="0"]')?.focus())
}

/* "還有 n 項": a popover listing the whole day. */
const pop = ref<number | null>(null)
function morePopover(i: number) {
  pop.value = pop.value === i ? null : i
  if (pop.value !== null) nextTick(() => root.value?.querySelector<HTMLElement>('.ml-scheduler__pop .ml-scheduler__event')?.focus())
}
function closePopover(returnFocus: boolean) {
  const trigger = root.value?.querySelector<HTMLElement>('.ml-scheduler__more[aria-expanded="true"]')
  pop.value = null
  if (returnFocus) trigger?.focus()
}
function onPopKeydown(e: KeyboardEvent) {
  if (e.key !== 'Escape') return
  e.preventDefault()
  e.stopPropagation()
  closePopover(true)
}
function onOutside(e: Event) {
  const target = e.target as Node
  const popEl = root.value?.querySelector('.ml-scheduler__pop')
  const trigger = root.value?.querySelector('.ml-scheduler__more[aria-expanded="true"]')
  if (popEl?.contains(target) || trigger?.contains(target)) return
  closePopover(!!popEl?.contains(document.activeElement))
}
watch(pop, (open) => {
  if (typeof document === 'undefined') return
  document.removeEventListener('pointerdown', onOutside)
  if (open !== null) document.addEventListener('pointerdown', onOutside)
})
watch([view, () => days.value[0]?.getTime()], () => (pop.value = null))

function scrollToStart() {
  if (body.value) body.value.scrollTop = Math.max(0, (props.scrollToHour - props.startHour) * props.hourHeight - 12)
}
onMounted(scrollToStart)
// Coming back from the month grid mounts the hour grid afresh.
watch(isMonth, (m) => !m && nextTick(scrollToStart))
onBeforeUnmount(() => {
  listen(false)
  if (typeof document !== 'undefined') document.removeEventListener('pointerdown', onOutside)
})

const isToday = (d: Date) => sameDay(d, now.value)
const weekend = (d: Date) => d.getDay() === 0 || d.getDay() === 6
const chevron = { left: icons.chevronLeft, right: icons.chevronRight }
const size = (v: number | string) => (typeof v === 'number' ? `${v}px` : v)
defineExpose({ go, goToday })
// For the visually hidden hint under editable schedulers.
const hintId = `ml-scheduler-hint-${useId()}`
</script>

<template>
  <div
    ref="root"
    :class="['ml-scheduler', `ml-scheduler--${view}`, { 'ml-scheduler--editable': editable, 'ml-scheduler--dragging': !!draft || !!ghost || !!span }]"
    role="region"
    :aria-label="loc.scheduler.label"
    :style="{ '--_sc-hour': `${hourHeight}px`, '--_sc-days': isMonth ? 7 : days.length }"
  >
    <div v-if="toolbar" class="ml-scheduler__toolbar">
      <div class="ml-scheduler__nav">
        <button type="button" class="ml-scheduler__btn" :aria-label="loc.scheduler.prev" @click="go(-1)">
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square"><path :d="chevron.left" /></svg>
        </button>
        <button type="button" class="ml-scheduler__btn ml-scheduler__today" @click="goToday">{{ loc.scheduler.today }}</button>
        <button type="button" class="ml-scheduler__btn" :aria-label="loc.scheduler.next" @click="go(1)">
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square"><path :d="chevron.right" /></svg>
        </button>
      </div>
      <h3 class="ml-scheduler__title" aria-live="polite">{{ title }}</h3>
      <div class="ml-scheduler__views" role="group">
        <button
          v-for="v in VIEWS"
          :key="v"
          type="button"
          :class="['ml-scheduler__view', { 'ml-scheduler__view--active': view === v }]"
          :aria-pressed="view === v"
          @click="view = v"
        >
          {{ loc.scheduler[v] }}
        </button>
      </div>
    </div>
    <div v-if="month" class="ml-scheduler__month" role="grid" :aria-label="title" :style="{ minHeight: size(height), '--_sc-max': monthMaxEvents }">
      <div class="ml-scheduler__mhead" role="row">
        <div v-for="i in 7" :key="i" :class="['ml-scheduler__mweekday', { 'ml-scheduler__mweekday--weekend': weekend(days[i - 1]) }]" role="columnheader">
          {{ weekdayLabel(days[i - 1], loc.name) }}
        </div>
      </div>
      <div ref="grid" class="ml-scheduler__mweeks">
        <div v-for="(week, w) in weeks" :key="w" class="ml-scheduler__mweek" role="row">
          <div
            v-for="i in week"
            :key="i"
            :class="[
              'ml-scheduler__mday',
              {
                'ml-scheduler__mday--outside': outside(days[i]),
                'ml-scheduler__mday--today': isToday(days[i]),
                'ml-scheduler__mday--weekend': weekend(days[i]),
                'ml-scheduler__mday--ghost': span && i >= span.from && i <= span.to,
              },
            ]"
            role="gridcell"
            :tabindex="i === focusIndex ? 0 : -1"
            :aria-label="cellLabel(i)"
            :aria-current="isToday(days[i]) ? 'date' : undefined"
            @keydown="onDayKeydown($event, i)"
            @pointerdown="onDayPointerDown($event, i)"
          >
            <button type="button" tabindex="-1" class="ml-scheduler__mdate" :aria-label="loc.scheduler.openDay(dayLabel(days[i], loc.name))" @click="openDay(days[i])">
              {{ days[i].getDate() }}
            </button>
            <button
              v-for="p in month.starts[i]"
              :key="p.event.id"
              type="button"
              :data-id="p.event.id"
              :class="[
                'ml-scheduler__event',
                'ml-scheduler__event--month',
                p.bar ? 'ml-scheduler__event--bar' : 'ml-scheduler__event--chip',
                { 'ml-scheduler__event--before': p.before, 'ml-scheduler__event--after': p.after, 'ml-scheduler__event--draft': draft?.id === p.event.id },
              ]"
              :style="{ '--_sc-lane': p.lane, '--_sc-span': p.to - p.from + 1, '--_sc-c0': color(p.event)[0], '--_sc-c1': color(p.event)[1] }"
              :aria-label="label(p.event, eventTimeText(p.event))"
              :aria-describedby="canEdit(p.event) ? hintId : undefined"
              @pointerdown="onEventPointerDown($event, p.event)"
              @click="onEventClick(p.event)"
              @keydown="onEventKeydown($event, p.event)"
            >
              <slot name="event" :event="p.event" :time="itemTime(p)">
                <template v-if="!p.bar">
                  <span class="ml-scheduler__dot" aria-hidden="true" />
                  <span class="ml-scheduler__time">{{ p.time }}</span>
                </template>
                <span class="ml-scheduler__name">{{ p.event.title }}</span>
              </slot>
            </button>
            <button
              v-if="month.more[i]"
              type="button"
              class="ml-scheduler__more"
              aria-haspopup="dialog"
              :aria-expanded="pop === i"
              @click="morePopover(i)"
            >
              {{ loc.scheduler.more(month.more[i]) }}
            </button>
            <div
              v-if="pop === i"
              :class="['ml-scheduler__pop', { 'ml-scheduler__pop--up': w >= 3, 'ml-scheduler__pop--end': i % 7 >= 4 }]"
              role="dialog"
              :aria-label="dayLabel(days[i], loc.name)"
              @keydown="onPopKeydown"
            >
              <p class="ml-scheduler__pop-title">{{ dayLabel(days[i], loc.name) }}</p>
              <button
                v-for="p in month.perDay[i]"
                :key="p.event.id"
                type="button"
                :data-id="p.event.id"
                class="ml-scheduler__event ml-scheduler__event--month ml-scheduler__event--chip"
                :style="{ '--_sc-c0': color(p.event)[0], '--_sc-c1': color(p.event)[1] }"
                :aria-label="label(p.event, eventTimeText(p.event))"
                :aria-describedby="canEdit(p.event) ? hintId : undefined"
                @click="onEventClick(p.event)"
                @keydown="onEventKeydown($event, p.event)"
              >
                <slot name="event" :event="p.event" :time="itemTime(p)">
                  <span class="ml-scheduler__dot" aria-hidden="true" />
                  <span class="ml-scheduler__time">{{ itemTime(p) }}</span>
                  <span class="ml-scheduler__name">{{ p.event.title }}</span>
                </slot>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div v-else ref="body" class="ml-scheduler__body" :style="{ height: size(height) }">
      <div class="ml-scheduler__sticky">
        <div class="ml-scheduler__head">
          <span class="ml-scheduler__corner" />
          <div
            v-for="(d, i) in days"
            :key="i"
            :class="['ml-scheduler__day', { 'ml-scheduler__day--today': isToday(d), 'ml-scheduler__day--weekend': weekend(d) }]"
          >
            <span class="ml-scheduler__weekday">{{ weekdayLabel(d, loc.name) }}</span>
            <span class="ml-scheduler__date">{{ d.getDate() }}</span>
          </div>
        </div>
        <div v-if="bars.length" class="ml-scheduler__allday">
          <span class="ml-scheduler__allday-label">{{ loc.scheduler.allDay }}</span>
          <div class="ml-scheduler__lanes" :style="{ gridTemplateRows: `repeat(${lanes}, 24px)` }">
            <button
              v-for="b in bars"
              :key="b.event.id"
              type="button"
              :data-id="b.event.id"
              :class="['ml-scheduler__event', 'ml-scheduler__event--allday', { 'ml-scheduler__event--before': b.before, 'ml-scheduler__event--after': b.after, 'ml-scheduler__event--draft': draft?.id === b.event.id }]"
              :style="{ gridColumn: `${b.from + 1} / ${b.to + 2}`, gridRow: b.lane + 1, '--_sc-c0': color(b.event)[0], '--_sc-c1': color(b.event)[1] }"
              :aria-label="label(b.event, '')"
              :aria-describedby="canEdit(b.event) ? hintId : undefined"
              @pointerdown="onEventPointerDown($event, b.event)"
              @click="onEventClick(b.event)"
              @keydown="onEventKeydown($event, b.event)"
            >
              <slot name="event" :event="b.event" :time="loc.scheduler.allDay">
                <span class="ml-scheduler__name">{{ b.event.title }}</span>
              </slot>
            </button>
          </div>
        </div>
      </div>
      <div class="ml-scheduler__grid" :style="{ height: `${(endHour - startHour) * hourHeight}px` }">
        <div class="ml-scheduler__gutter" aria-hidden="true">
          <span v-for="(h, i) in hours" :key="h" class="ml-scheduler__hour" :style="{ top: `${i * hourHeight}px` }">{{ h }}</span>
        </div>
        <div
          v-for="(col, d) in columns"
          :key="d"
          :class="['ml-scheduler__col', { 'ml-scheduler__col--today': isToday(days[d]), 'ml-scheduler__col--weekend': weekend(days[d]) }]"
          @pointerdown="onColumnPointerDown($event, d)"
        >
          <button
            v-for="seg in col"
            :key="seg.event.id"
            type="button"
            :data-id="seg.event.id"
            :class="[
              'ml-scheduler__event',
              { 'ml-scheduler__event--short': seg.size < 36, 'ml-scheduler__event--before': seg.before, 'ml-scheduler__event--after': seg.after, 'ml-scheduler__event--draft': draft?.id === seg.event.id },
            ]"
            :style="{
              top: `${seg.top}px`,
              height: `${seg.size}px`,
              left: `${(seg.col / seg.cols) * 100}%`,
              width: `${100 / seg.cols}%`,
              '--_sc-c0': color(seg.event)[0],
              '--_sc-c1': color(seg.event)[1],
            }"
            :aria-label="label(seg.event, seg.time)"
            :aria-describedby="canEdit(seg.event) ? hintId : undefined"
            @pointerdown="onEventPointerDown($event, seg.event)"
            @click="onEventClick(seg.event)"
            @keydown="onEventKeydown($event, seg.event)"
          >
            <slot name="event" :event="seg.event" :time="seg.time">
              <span class="ml-scheduler__time">{{ seg.time }}</span>
              <span class="ml-scheduler__name">{{ seg.event.title }}</span>
              <span v-if="seg.event.location" class="ml-scheduler__place">{{ seg.event.location }}</span>
            </slot>
            <span v-if="canEdit(seg.event) && !seg.after" class="ml-scheduler__handle" aria-hidden="true" />
          </button>
          <div
            v-if="ghost && ghost.day === d"
            class="ml-scheduler__ghost"
            :style="{ top: `${((ghost.start - startHour * 60) / 60) * hourHeight}px`, height: `${((ghost.end - ghost.start) / 60) * hourHeight}px` }"
          >
            {{ segmentTime(ghost) }}
          </div>
          <div v-if="nowLine && nowLine.day === d" class="ml-scheduler__now" :style="{ top: `${nowLine.top}px` }" />
        </div>
      </div>
    </div>
    <p v-if="editable" :id="hintId" class="ml-visually-hidden">{{ isMonth ? loc.scheduler.monthHint : loc.scheduler.hint }}</p>
    <p class="ml-visually-hidden" aria-live="polite">{{ live }}</p>
  </div>
</template>
