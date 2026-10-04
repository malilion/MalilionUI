<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useId } from 'vue'
import { chartStops } from './charts'
import { icons } from './icons'
import {
  allDayBars,
  formatClock,
  hourLabels,
  minuteOfDay,
  minutesAt,
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
    /** Height of the scrolling area. Numbers are pixels. */
    height?: number | string
    /** Hour scrolled to on mount. */
    scrollToHour?: number
    /** Drag events to move them, their bottom edge to resize, empty slots to create. */
    editable?: boolean
    /** Prev / today / next and the week–day switch. */
    toolbar?: boolean
    /** Colour of events without a tone. */
    tone?: MlChartTone
    /** "Now" for the today highlight and the time line. Defaults to the clock. */
    now?: MlTimeInput
  }>(),
  { events: () => [], weekStartsOn: 0, startHour: 0, endHour: 24, hourHeight: 48, step: 15, height: 560, scrollToHour: 8, editable: false, toolbar: true, tone: 'gold' },
)
const emit = defineEmits<{
  'event-click': [event: MlSchedulerEvent]
  change: [event: MlSchedulerEvent, range: SchedulerRange]
  create: [range: SchedulerRange]
}>()
defineSlots<{ event?: (props: { event: MlSchedulerEvent; time: string }) => unknown }>()

const view = defineModel<MlSchedulerView>('view', { default: 'week' })
const date = defineModel<Date>('date')

const nowInput = useNow(() => props.now)
const now = computed(() => toDate(nowInput.value) ?? new Date())
const anchor = computed(() => date.value ?? now.value)
const days = computed(() => viewDays(anchor.value, view.value, props.weekStartsOn))
const title = computed(() => schedulerTitle(days.value, loc.value.name))
const hours = computed(() => hourLabels(props.startHour, props.endHour))

/* Drafts: the event being dragged is drawn at its new place. */
const draft = ref<{ id: string; range: SchedulerRange } | null>(null)
const shown = computed(() =>
  draft.value ? props.events.map((e) => (e.id === draft.value!.id ? { ...e, start: draft.value!.range.start, end: draft.value!.range.end } : e)) : props.events,
)
const columns = computed(() => {
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
const bars = computed(() => allDayBars(shown.value, days.value))
const lanes = computed(() => bars.value.reduce((n, b) => Math.max(n, b.lane + 1), 0))
const nowLine = computed(() => {
  const i = days.value.findIndex((d) => sameDay(d, now.value))
  const m = minuteOfDay(now.value)
  if (i < 0 || m < props.startHour * 60 || m > props.endHour * 60) return null
  return { day: i, top: ((m - props.startHour * 60) / 60) * props.hourHeight }
})

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

/* ── Drag to move / resize ─────────────────────────────── */

let drag: { pointer: number; event: MlSchedulerEvent; mode: 'move' | 'resize'; x: number; y: number; colWidth: number; moved: boolean } | null = null
let swallowClick = false

function onEventPointerDown(e: PointerEvent, event: MlSchedulerEvent) {
  if (!canEdit(event) || e.button !== 0) return
  const col = (e.currentTarget as HTMLElement).closest('.ml-scheduler__col, .ml-scheduler__lanes') as HTMLElement | null
  const width = col ? col.getBoundingClientRect().width / (col.classList.contains('ml-scheduler__lanes') ? days.value.length : 1) : 1
  drag = {
    pointer: e.pointerId,
    event,
    mode: (e.target as Element).closest('.ml-scheduler__handle') ? 'resize' : 'move',
    x: e.clientX,
    y: e.clientY,
    colWidth: width || 1,
    moved: false,
  }
  e.preventDefault()
  listen(true)
}

function onPointerMove(e: PointerEvent) {
  if (drag && e.pointerId === drag.pointer) {
    const dayShift = view.value === 'week' ? Math.round((e.clientX - drag.x) / drag.colWidth) : 0
    const minutes = drag.event.allDay ? 0 : snapMinutes(((e.clientY - drag.y) / props.hourHeight) * 60, props.step)
    if (!dayShift && !minutes && !drag.moved) return
    drag.moved = true
    const range = drag.mode === 'move' ? moveEvent(drag.event, dayShift, minutes) : resizeEvent(drag.event, drag.event.allDay ? dayShift * 1440 : minutes, props.step)
    if (range) draft.value = { id: drag.event.id, range }
  } else if (create && e.pointerId === create.pointer) {
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
    const day = days.value[create.day]
    create = null
    ghost.value = null
    if (g && day && !cancelled) emit('create', { start: new Date(day.getTime() + g.start * 60_000), end: new Date(day.getTime() + g.end * 60_000) })
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

/* ── Drag on an empty slot to create ───────────────────── */

let create: { pointer: number; day: number; top: number; anchor: number } | null = null
const ghost = ref<{ day: number; start: number; end: number } | null>(null)

function onColumnPointerDown(e: PointerEvent, day: number) {
  if (!props.editable || e.button !== 0 || e.target !== e.currentTarget) return
  const top = (e.currentTarget as HTMLElement).getBoundingClientRect().top
  const start = Math.floor((((e.clientY - top) / props.hourHeight) * 60 + props.startHour * 60) / props.step) * props.step
  create = { pointer: e.pointerId, day, top, anchor: start }
  ghost.value = { day, start, end: start + props.step }
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
  if (vertical && !event.allDay) range = e.shiftKey ? resizeEvent(event, vertical * props.step, props.step) : moveEvent(event, 0, vertical * props.step)
  else if (horizontal) range = e.shiftKey && event.allDay ? resizeEvent(event, horizontal * 1440, props.step) : moveEvent(event, horizontal, 0)
  if (!range) return
  e.preventDefault()
  emit('change', event, range)
  live.value = loc.value.scheduler.moved(event.title, describe(range, event.allDay))
  // The event may now live in another column: keep the keyboard on it.
  nextTick(() => body.value?.querySelectorAll<HTMLElement>('.ml-scheduler__event').forEach((el) => el.dataset.id === event.id && el.focus()))
}

onMounted(() => {
  if (body.value) body.value.scrollTop = Math.max(0, (props.scrollToHour - props.startHour) * props.hourHeight - 12)
})
onBeforeUnmount(() => listen(false))

const isToday = (d: Date) => sameDay(d, now.value)
const weekend = (d: Date) => d.getDay() === 0 || d.getDay() === 6
const chevron = { left: icons.chevronLeft, right: icons.chevronRight }
defineExpose({ go, goToday })
// For the visually hidden hint under editable schedulers.
const hintId = `ml-scheduler-hint-${useId()}`
</script>

<template>
  <div
    :class="['ml-scheduler', `ml-scheduler--${view}`, { 'ml-scheduler--editable': editable, 'ml-scheduler--dragging': !!draft || !!ghost }]"
    role="region"
    :aria-label="loc.scheduler.label"
    :style="{ '--_sc-hour': `${hourHeight}px`, '--_sc-days': days.length }"
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
          v-for="v in (['week', 'day'] as const)"
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
    <div ref="body" class="ml-scheduler__body" :style="{ height: typeof height === 'number' ? `${height}px` : height }">
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
    <p v-if="editable" :id="hintId" class="ml-visually-hidden">{{ loc.scheduler.hint }}</p>
    <p class="ml-visually-hidden" aria-live="polite">{{ live }}</p>
  </div>
</template>
