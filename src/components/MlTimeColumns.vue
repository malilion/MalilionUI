<script setup lang="ts">
// Internal: the scrolling hour / minute / second wheels used by the time pickers.
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { padTime, range, toSeconds, type TimeParts } from './time'

type Unit = 'h' | 'm' | 's'

const props = withDefaults(
  defineProps<{
    value: TimeParts | null
    seconds?: boolean
    minuteStep?: number
    secondStep?: number
    /** Inclusive bounds in seconds of the day. */
    min?: number
    max?: number
  }>(),
  { minuteStep: 1, secondStep: 1, min: 0, max: 86399 },
)

const emit = defineEmits<{ change: [value: TimeParts] }>()

const columns = computed(() => {
  const list: { unit: Unit; label: string; values: number[] }[] = [
    { unit: 'h', label: '時', values: range(1, 24) },
    { unit: 'm', label: '分', values: range(props.minuteStep, 60) },
  ]
  if (props.seconds) list.push({ unit: 's', label: '秒', values: range(props.secondStep, 60) })
  return list
})

/** An option is disabled when nothing it could lead to lies inside [min, max]. */
function disabled(unit: Unit, n: number) {
  const v = props.value
  let lo: number
  let hi: number
  if (unit === 'h') {
    lo = n * 3600
    hi = lo + 3599
  } else if (unit === 'm') {
    if (!v) return false
    lo = v.h * 3600 + n * 60
    hi = lo + 59
  } else {
    if (!v) return false
    lo = hi = v.h * 3600 + v.m * 60 + n
  }
  return hi < props.min || lo > props.max
}

function clamp(t: TimeParts): TimeParts {
  const sec = Math.min(props.max, Math.max(props.min, toSeconds(t)))
  if (sec === toSeconds(t)) return t
  return { h: Math.floor(sec / 3600), m: Math.floor((sec % 3600) / 60), s: sec % 60 }
}

function pick(unit: Unit, n: number) {
  if (disabled(unit, n)) return
  const base = props.value ?? { h: 0, m: 0, s: 0 }
  emit('change', clamp({ ...base, [unit]: n }))
}

const lists = ref<HTMLElement[]>([])

function onKeydown(event: KeyboardEvent, unit: Unit, values: number[]) {
  const current = props.value ? values.indexOf(props.value[unit]) : -1
  const enabled = values.map((n, i) => (disabled(unit, n) ? -1 : i)).filter((i) => i >= 0)
  if (!enabled.length) return
  const pos = enabled.indexOf(current)
  let next: number | undefined
  if (event.key === 'ArrowDown') next = enabled[pos < 0 ? 0 : Math.min(enabled.length - 1, pos + 1)]
  else if (event.key === 'ArrowUp') next = enabled[pos < 0 ? 0 : Math.max(0, pos - 1)]
  else if (event.key === 'PageDown') next = enabled[pos < 0 ? 0 : Math.min(enabled.length - 1, pos + 5)]
  else if (event.key === 'PageUp') next = enabled[pos < 0 ? 0 : Math.max(0, pos - 5)]
  else if (event.key === 'Home') next = enabled[0]
  else if (event.key === 'End') next = enabled[enabled.length - 1]
  if (next === undefined) return
  event.preventDefault()
  pick(unit, values[next])
}

/** Keep each column's selected value centred. */
async function center(smooth = true) {
  await nextTick()
  for (const list of lists.value) {
    const el = list?.querySelector<HTMLElement>('[aria-selected="true"]')
    if (!el || typeof list.scrollTo !== 'function') continue
    list.scrollTo({ top: el.offsetTop - list.clientHeight / 2 + el.offsetHeight / 2, behavior: smooth ? 'smooth' : 'auto' })
  }
}

watch(() => props.value, () => center(), { deep: true })
onMounted(() => center(false))

function focus() {
  lists.value[0]?.focus()
}

defineExpose({ focus })
</script>

<template>
  <div class="ml-time">
    <ul
      v-for="(col, c) in columns"
      :key="col.unit"
      :ref="(el) => (lists[c] = el as HTMLElement)"
      class="ml-time__col"
      role="listbox"
      tabindex="0"
      :aria-label="col.label"
      @keydown="onKeydown($event, col.unit, col.values)"
    >
      <li
        v-for="n in col.values"
        :key="n"
        role="option"
        :aria-selected="value?.[col.unit] === n"
        :aria-disabled="disabled(col.unit, n) || undefined"
        :class="['ml-time__cell', { 'ml-time__cell--selected': value?.[col.unit] === n }]"
        @click="pick(col.unit, n)"
      >
        {{ padTime(n) }}
      </li>
    </ul>
  </div>
</template>
