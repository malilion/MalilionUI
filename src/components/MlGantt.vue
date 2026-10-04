<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import {
  ganttTipLeft,
  GANTT_DAY_WIDTH,
  ganttArrow,
  ganttDate,
  ganttDay,
  ganttFormat,
  ganttLink,
  ganttMove,
  ganttRange,
  ganttResize,
  ganttRows,
  ganttSpans,
  ganttTicks,
  ganttWeekends,
  type GanttTick,
  type MlGanttDate,
  type MlGanttScale,
  type MlGanttTask,
} from './gantt'
import { chartStops } from './charts'
import { useLocale } from '../locale'
import type { MlChartTone } from '../types'

const loc = useLocale()

const props = withDefaults(
  defineProps<{
    tasks: MlGanttTask[]
    scale?: MlGanttScale
    /** Pixels per day (default: 32 for day, 14 for week, 4 for month). */
    dayWidth?: number
    rowHeight?: number
    /** Width of the task-name column (px). */
    sideWidth?: number
    /** Tone for tasks without their own. */
    tone?: MlChartTone
    /** Where the today line goes; `false` hides it. Default: the user's today (set after mount). */
    today?: MlGanttDate | false
    /** Drag bars to move them, drag the right edge to resize; arrow keys too. Emits `change`. */
    editable?: boolean
    /** Accessible summary of the chart. */
    label?: string
  }>(),
  { scale: 'day', dayWidth: undefined, rowHeight: 36, sideWidth: 168, tone: 'gold', today: undefined, editable: false },
)

const emit = defineEmits<{ change: [task: MlGanttTask, range: { start: Date; end: Date }] }>()

const dayW = computed(() => props.dayWidth ?? GANTT_DAY_WIDTH[props.scale])
const spans = computed(() => ganttSpans(props.tasks))
const range = computed(() => ganttRange(spans.value, props.scale))
const ticks = computed(() => ganttTicks(range.value.from, range.value.to, props.scale))
const weekends = computed(() => (props.scale === 'day' ? ganttWeekends(range.value.from, range.value.to) : []))
const collapsed = ref<string[]>([])
const rows = computed(() => ganttRows(spans.value, collapsed.value))
const canvasWidth = computed(() => (range.value.to - range.value.from) * dayW.value)
const bodyHeight = computed(() => rows.value.length * props.rowHeight)
const x = (day: number) => (day - range.value.from) * dayW.value

// Today is only known in the browser, so it appears after mount (no hydration mismatch).
const clientToday = ref<number | null>(null)
onMounted(() => (clientToday.value = ganttDay(new Date())))
const todayDay = computed(() => (props.today === false ? null : props.today !== undefined ? ganttDay(props.today) : clientToday.value))
const todayX = computed(() => {
  const d = todayDay.value
  return d !== null && Number.isFinite(d) && d >= range.value.from && d < range.value.to ? x(d) + dayW.value / 2 : null
})

const topLabel = (t: GanttTick) => {
  if (props.scale === 'month') return loc.value.gantt.year(t.year)
  return t.days * dayW.value >= 84 ? loc.value.gantt.monthTitle(t.year, t.month) : loc.value.gantt.months[t.month]
}
const bottomLabel = (t: GanttTick) => {
  if (props.scale === 'month') return loc.value.gantt.months[t.month]
  if (props.scale === 'week') return `${t.month + 1}/${t.date}`
  return String(t.date)
}

/* ── Drag & keyboard edits (a draft until the parent applies `change`) ── */
const draft = ref<{ id: string; start: number; end: number } | null>(null)
const spanOf = (id: string) => {
  const s = spans.value.find((x) => x.task.id === id)
  if (!s) return null
  return draft.value?.id === id ? { ...s, start: draft.value.start, end: draft.value.end } : s
}

const bars = computed(() =>
  rows.value.flatMap((row, r) => {
    if (row.kind !== 'task') return []
    const s = spanOf(row.span.task.id)!
    const t = s.task
    const progress = Math.min(1, Math.max(0, t.progress ?? 0))
    return [
      {
        id: t.id,
        task: t,
        r,
        start: s.start,
        end: s.end,
        milestone: !!t.milestone,
        tone: t.tone ?? props.tone,
        progress,
        left: x(s.start),
        width: (s.end - s.start + 1) * dayW.value,
        mid: r * props.rowHeight + props.rowHeight / 2,
        text: `${t.label}：${t.milestone ? `${loc.value.gantt.milestone} ${ganttFormat(s.start)}` : `${ganttFormat(s.start)} – ${ganttFormat(s.end)}，${loc.value.gantt.days(s.end - s.start + 1)}，${loc.value.gantt.progress} ${Math.round(progress * 100)}%`}`,
      },
    ]
  }),
)

const deps = computed(() => {
  const byId = new Map(bars.value.map((b) => [b.id, b]))
  return bars.value.flatMap((b) =>
    (b.task.deps ?? []).flatMap((id) => {
      const from = byId.get(id)
      if (!from) return []
      const x1 = from.milestone ? from.left + dayW.value / 2 + 7 : from.left + from.width
      const x2 = b.milestone ? b.left + dayW.value / 2 - 8 : b.left
      return [{ key: `${id}>${b.id}`, d: ganttLink(x1, from.mid, x2, b.mid, props.rowHeight), arrow: ganttArrow(x2, b.mid) }]
    }),
  )
})

const live = ref('')
function commit(id: string, next: { start: number; end: number }, announce = false) {
  const s = spans.value.find((x) => x.task.id === id)
  if (!s || (s.start === next.start && s.end === next.end)) return
  emit('change', s.task, { start: ganttDate(next.start), end: ganttDate(next.end) })
  if (announce) live.value = loc.value.gantt.moved(s.task.label, ganttFormat(next.start), ganttFormat(next.end))
}

const dragging = ref(false)
let pointer: { id: number; task: string; mode: 'move' | 'resize'; x: number; start: number; end: number } | null = null

function onPointerDown(event: PointerEvent, id: string) {
  if (!props.editable || event.button !== 0) return
  const s = spans.value.find((x) => x.task.id === id)
  if (!s) return
  const handle = (event.target as Element).closest('.ml-gantt__handle')
  pointer = { id: event.pointerId, task: id, mode: handle ? 'resize' : 'move', x: event.clientX, start: s.start, end: s.end }
  event.preventDefault()
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)
  window.addEventListener('pointercancel', onPointerUp)
}

function onPointerMove(event: PointerEvent) {
  if (!pointer || event.pointerId !== pointer.id) return
  const delta = Math.round((event.clientX - pointer.x) / dayW.value)
  if (delta !== 0) dragging.value = true
  const base = { start: pointer.start, end: pointer.end }
  draft.value = { id: pointer.task, ...(pointer.mode === 'move' ? ganttMove(base, delta) : ganttResize(base, delta)) }
}

function stopListening() {
  pointer = null
  if (typeof window === 'undefined') return
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
  window.removeEventListener('pointercancel', onPointerUp)
}

function onPointerUp(event: PointerEvent) {
  if (!pointer || event.pointerId !== pointer.id) return
  const d = draft.value
  const cancelled = event.type === 'pointercancel'
  stopListening()
  draft.value = null
  dragging.value = false
  if (d && !cancelled) commit(d.id, d)
}

onBeforeUnmount(stopListening)

const hovered = ref<string | null>(null)
/** The visible slice of the timeline, for keeping the tooltip on screen. */
const view = ref<{ scroll: number; width: number } | null>(null)
function onScroll(event: Event) {
  const el = event.currentTarget as HTMLElement
  view.value = { scroll: el.scrollLeft, width: el.clientWidth }
}
const focused = ref<string | null>(null)
const current = computed(() => (focused.value && bars.value.some((b) => b.id === focused.value) ? focused.value : bars.value[0]?.id))
const items = ref<HTMLElement[]>([])

function focusBar(id: string | undefined) {
  if (!id) return
  focused.value = id
  nextTick(() => items.value.find((el) => el.dataset.id === id)?.focus())
}

function onKeydown(event: KeyboardEvent) {
  const list = bars.value
  const k = list.findIndex((b) => b.id === current.value)
  if (k < 0) return
  const b = list[k]
  if (event.key === 'ArrowDown') focusBar(list[Math.min(list.length - 1, k + 1)].id)
  else if (event.key === 'ArrowUp') focusBar(list[Math.max(0, k - 1)].id)
  else if (event.key === 'Home') focusBar(list[0].id)
  else if (event.key === 'End') focusBar(list[list.length - 1].id)
  else if (props.editable && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
    const delta = event.key === 'ArrowRight' ? 1 : -1
    commit(b.id, event.shiftKey && !b.milestone ? ganttResize(b, delta) : ganttMove(b, delta), true)
  } else return
  event.preventDefault()
}

function onFocusOut(event: FocusEvent) {
  if (!(event.currentTarget as HTMLElement).contains(event.relatedTarget as Node | null)) focused.value = null
}

const tip = computed(() => {
  if (dragging.value) return null
  const b = bars.value.find((x) => x.id === (hovered.value ?? focused.value))
  if (!b) return null
  return { b, below: b.r < 2, left: ganttTipLeft(b.milestone ? b.left + dayW.value / 2 : b.left + Math.min(b.width, 240) / 2, view.value) }
})

function toggle(group: string) {
  collapsed.value = collapsed.value.includes(group) ? collapsed.value.filter((g) => g !== group) : [...collapsed.value, group]
}

const summary = computed(() => `${props.label ?? loc.value.gantt.summary(spans.value.length)}. ${loc.value.gantt.hint}${props.editable ? `，${loc.value.gantt.editHint}` : ''}`)
</script>

<template>
  <figure
    :class="['ml-gantt', `ml-gantt--${scale}`, { 'ml-gantt--editable': editable, 'ml-gantt--dragging': dragging }]"
    :style="{ '--_gt-row': `${rowHeight}px`, '--_gt-day': `${dayW}px`, '--_gt-side': `${sideWidth}px` }"
  >
    <div class="ml-gantt__frame">
      <div class="ml-gantt__side">
        <div class="ml-gantt__corner" aria-hidden="true">{{ loc.gantt.task }}</div>
        <template v-for="row in rows" :key="row.key">
          <button
            v-if="row.kind === 'group'"
            type="button"
            :class="['ml-gantt__group', { 'ml-gantt__group--closed': row.collapsed }]"
            :aria-expanded="!row.collapsed"
            :aria-label="row.collapsed ? loc.gantt.expand(row.label) : loc.gantt.collapse(row.label)"
            @click="toggle(row.label)"
          >
            <span class="ml-gantt__chevron" aria-hidden="true" />{{ row.label }}<small>{{ row.count }}</small>
          </button>
          <div v-else :class="['ml-gantt__name', { 'ml-gantt__name--nested': row.group }]">
            <i :class="['ml-gantt__dot', { 'ml-gantt__dot--milestone': row.span.task.milestone }]" :style="{ '--_gt-c0': chartStops[row.span.task.tone ?? tone][0] }" />{{ row.span.task.label }}
          </div>
        </template>
      </div>
      <div class="ml-gantt__scroll" @scroll.passive="onScroll" @pointerenter="onScroll" @focusin="onScroll">
        <div class="ml-gantt__canvas" :style="{ width: `${canvasWidth}px` }">
          <div class="ml-gantt__header" aria-hidden="true">
            <div class="ml-gantt__scale">
              <span v-for="t in ticks.top" :key="t.day" class="ml-gantt__cell" :style="{ left: `${x(t.day)}px`, width: `${t.days * dayW}px` }">{{ topLabel(t) }}</span>
            </div>
            <div class="ml-gantt__scale ml-gantt__scale--fine">
              <span
                v-for="t in ticks.bottom"
                :key="t.day"
                :class="['ml-gantt__cell', { 'ml-gantt__cell--weekend': scale === 'day' && (t.weekday === 0 || t.weekday === 6), 'ml-gantt__cell--today': scale === 'day' && t.day === todayDay }]"
                :style="{ left: `${x(t.day)}px`, width: `${t.days * dayW}px` }"
              >{{ bottomLabel(t) }}<small v-if="scale === 'day'">{{ loc.gantt.weekdays[t.weekday] }}</small></span>
            </div>
          </div>
          <div class="ml-gantt__body" :style="{ height: `${bodyHeight}px` }" role="group" :aria-label="summary" @keydown="onKeydown" @focusout="onFocusOut" @pointerleave="hovered = null">
            <span v-for="d in weekends" :key="`w${d}`" class="ml-gantt__weekend" :style="{ left: `${x(d)}px` }" />
            <span v-for="t in ticks.bottom" :key="`l${t.day}`" class="ml-gantt__line" :style="{ left: `${x(t.day)}px` }" />
            <svg class="ml-gantt__deps" :width="canvasWidth" :height="bodyHeight" aria-hidden="true">
              <g v-for="d in deps" :key="d.key" class="ml-gantt__dep">
                <path :d="d.d" class="ml-gantt__dep-line" />
                <path :d="d.arrow" class="ml-gantt__dep-arrow" />
              </g>
            </svg>
            <template v-for="(row, r) in rows" :key="row.key">
              <span
                v-if="row.kind === 'group'"
                class="ml-gantt__summary"
                :style="{ left: `${x(row.start)}px`, width: `${(row.end - row.start + 1) * dayW}px`, top: `${r * rowHeight}px` }"
              />
            </template>
            <div
              v-for="(b, i) in bars"
              :key="b.id"
              ref="items"
              :data-id="b.id"
              :class="[
                b.milestone ? 'ml-gantt__milestone' : 'ml-gantt__bar',
                { 'ml-gantt__bar--done': b.progress >= 1, 'ml-gantt__bar--draft': draft?.id === b.id },
              ]"
              :style="{
                left: `${b.milestone ? b.left + dayW / 2 : b.left}px`,
                top: `${b.r * rowHeight}px`,
                width: b.milestone ? undefined : `${b.width}px`,
                '--_gt-i': i,
                '--_gt-p': b.progress,
                '--_gt-c0': chartStops[b.tone][0],
                '--_gt-c1': chartStops[b.tone][1],
              }"
              role="img"
              :aria-label="b.text"
              :tabindex="current === b.id ? 0 : -1"
              @pointerenter="hovered = b.id"
              @pointerleave="hovered = null"
              @focus="focused = b.id"
              @pointerdown="onPointerDown($event, b.id)"
            >
              <span v-if="!b.milestone" class="ml-gantt__progress" />
              <span v-if="editable && !b.milestone" class="ml-gantt__handle" />
            </div>
            <div v-if="todayX !== null" class="ml-gantt__today" :style="{ left: `${todayX}px` }" aria-hidden="true">
              <span>{{ loc.gantt.today }}</span>
            </div>
            <div
              v-if="tip"
              :class="['ml-gantt__tip', { 'ml-gantt__tip--below': tip.below }]"
              :style="{ left: `${tip.left}px`, top: `${tip.below ? (tip.b.r + 1) * rowHeight : tip.b.r * rowHeight}px` }"
              aria-hidden="true"
            >
              <p class="ml-gantt__tip-title">{{ tip.b.task.label }}</p>
              <template v-if="tip.b.milestone">
                <p class="ml-gantt__tip-row"><span>{{ loc.gantt.milestone }}</span><b>{{ ganttFormat(tip.b.start) }}</b></p>
              </template>
              <template v-else>
                <p class="ml-gantt__tip-row"><span>{{ loc.gantt.start }}</span><b>{{ ganttFormat(tip.b.start) }}</b></p>
                <p class="ml-gantt__tip-row"><span>{{ loc.gantt.end }}</span><b>{{ ganttFormat(tip.b.end) }}</b></p>
                <p class="ml-gantt__tip-row"><span>{{ loc.gantt.duration }}</span><b>{{ loc.gantt.days(tip.b.end - tip.b.start + 1) }}</b></p>
                <p class="ml-gantt__tip-row"><span>{{ loc.gantt.progress }}</span><b>{{ Math.round(tip.b.progress * 100) }}%</b></p>
              </template>
            </div>
          </div>
        </div>
      </div>
    </div>
    <p class="ml-visually-hidden" aria-live="polite">{{ live }}</p>
    <div class="ml-visually-hidden">
    <table>
      <caption>{{ loc.gantt.table }}</caption>
      <thead>
        <tr>
          <th scope="col">{{ loc.gantt.task }}</th>
          <th scope="col">{{ loc.gantt.group }}</th>
          <th scope="col">{{ loc.gantt.start }}</th>
          <th scope="col">{{ loc.gantt.end }}</th>
          <th scope="col">{{ loc.gantt.progress }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="s in spans" :key="s.task.id">
          <th scope="row">{{ s.task.label }}</th>
          <td>{{ s.task.group ?? '' }}</td>
          <td>{{ ganttFormat(s.start) }}</td>
          <td>{{ s.task.milestone ? loc.gantt.milestone : ganttFormat(s.end) }}</td>
          <td>{{ s.task.milestone ? '' : `${Math.round(Math.min(1, Math.max(0, s.task.progress ?? 0)) * 100)}%` }}</td>
        </tr>
      </tbody>
    </table>
    </div>
  </figure>
</template>
