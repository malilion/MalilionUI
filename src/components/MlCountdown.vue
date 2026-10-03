<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useLocale } from '../locale'

const loc = useLocale()

const props = withDefaults(
  defineProps<{
    /** When it ends: a Date or a timestamp in ms. */
    to?: Date | number
    /** Or count down this many ms from mount (ignored when `to` is set). */
    duration?: number
    /** Which units to show; larger ones fold into the first shown. */
    units?: ('days' | 'hours' | 'minutes' | 'seconds')[]
    /** tiles: metal flip tiles. text: inline "01:02:03". */
    variant?: 'tiles' | 'text'
    paused?: boolean
    /** Unit captions under the tiles. */
    labels?: Partial<Record<'days' | 'hours' | 'minutes' | 'seconds', string>>
    /** Accessible name, read before the remaining time. */
    label?: string
  }>(),
  { units: () => ['days', 'hours', 'minutes', 'seconds'], variant: 'tiles' },
)

const emit = defineEmits<{ finish: [] }>()

const UNIT_MS = { days: 86_400_000, hours: 3_600_000, minutes: 60_000, seconds: 1000 } as const

const now = ref(Date.now())
let deadline = 0
let remainingWhenPaused = 0
let timer: ReturnType<typeof setTimeout> | undefined
let finished = false

function setDeadline() {
  if (props.to !== undefined) deadline = typeof props.to === 'number' ? props.to : props.to.getTime()
  else deadline = Date.now() + (props.duration ?? 0)
  remainingWhenPaused = Math.max(0, deadline - Date.now())
  finished = false
  now.value = Date.now()
}

const remaining = computed(() => (props.paused ? remainingWhenPaused : Math.max(0, deadline - now.value)))

const parts = computed(() => {
  let rest = Math.ceil(remaining.value / 1000) * 1000
  return props.units.map((unit) => {
    const value = Math.floor(rest / UNIT_MS[unit])
    rest -= value * UNIT_MS[unit]
    return { unit, value, text: String(value).padStart(2, '0') }
  })
})

// Tick on the second boundary so the display never skips or doubles a second.
function tick() {
  clearTimeout(timer)
  if (props.paused) return
  now.value = Date.now()
  if (remaining.value <= 0) {
    if (!finished) {
      finished = true
      emit('finish')
    }
    return
  }
  timer = setTimeout(tick, ((remaining.value - 1) % 1000) + 1)
}

watch(
  () => [props.to, props.duration],
  () => {
    setDeadline()
    tick()
  },
  { immediate: true },
)

watch(
  () => props.paused,
  (paused) => {
    if (paused) {
      remainingWhenPaused = Math.max(0, deadline - Date.now())
      clearTimeout(timer)
    } else {
      deadline = Date.now() + remainingWhenPaused
      tick()
    }
  },
)

onBeforeUnmount(() => clearTimeout(timer))

const spoken = computed(() =>
  parts.value.map((p) => `${p.value} ${props.labels?.[p.unit] ?? loc.value.countdown[p.unit]}`).join(' '),
)

/** Restart from `duration` (or re-read `to`). */
function reset() {
  setDeadline()
  tick()
}

defineExpose({ reset })
</script>

<template>
  <span
    :class="['ml-countdown', `ml-countdown--${variant}`, { 'ml-countdown--done': remaining <= 0 }]"
    role="timer"
    :aria-label="`${label ?? loc.countdown.label}：${spoken}`"
  >
    <slot :remaining="remaining" :parts="parts">
      <template v-for="(p, i) in parts" :key="p.unit">
        <span v-if="i" class="ml-countdown__colon" aria-hidden="true">:</span>
        <span class="ml-countdown__unit" aria-hidden="true">
          <span class="ml-countdown__value">
            <Transition name="ml-countdown-flip" mode="out-in">
              <span :key="p.text" class="ml-countdown__digits">{{ p.text }}</span>
            </Transition>
          </span>
          <span v-if="variant === 'tiles'" class="ml-countdown__label">{{ labels?.[p.unit] ?? loc.countdown[p.unit] }}</span>
        </span>
      </template>
    </slot>
  </span>
</template>
