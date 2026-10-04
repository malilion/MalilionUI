<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { useLocale } from '../locale'
import MlLionMark from './MlLionMark.vue'
import {
  CLOCK_HANDS,
  CLOCK_REST,
  clockAngles,
  clockDigital,
  clockFormatOffset,
  clockMarks,
  clockNumerals,
  clockOffset,
  clockTime,
  clockToDate,
  mountClock,
  type ClockController,
  type ClockTime,
  type MlClockInput,
  type MlClockMotion,
  type MlClockNumerals,
  type MlClockTone,
} from './clock'

const loc = useLocale()

const props = withDefaults(
  defineProps<{
    /** Freeze the clock at this moment (SSR, screenshots, tests). */
    time?: MlClockInput
    /** Where "now" comes from for a live clock (e.g. server-synced time). */
    now?: () => MlClockInput
    /** IANA zone, e.g. 'Asia/Taipei'. Default: the visitor's own. */
    timeZone?: string
    /** Place name shown under the dial and in the accessible name. */
    label?: string
    /** Digital readout under the dial. */
    digital?: boolean
    /** UTC offset under the dial (UTC+8). */
    offset?: boolean
    /** Second hand (and seconds in the readout). */
    seconds?: boolean
    /** Second hand: one springy jump a second, or a smooth sweep. */
    motion?: MlClockMotion
    numerals?: MlClockNumerals
    /** The lion crest on the dial. */
    crest?: boolean
    tone?: MlClockTone
    /** Width in px (it never overflows its container). */
    size?: number
  }>(),
  { seconds: true, motion: 'tick', numerals: 'arabic', crest: true, tone: 'gold', size: 200 },
)

const marks = clockMarks()
const numerals = computed(() => clockNumerals(props.numerals))

const frozen = computed(() => (props.time === undefined ? null : clockToDate(props.time)))
/** Live time as last reported: once a second with a readout, else once a minute. */
const live = shallowRef<ClockTime | null>(null)
const liveOffset = ref<number | null>(null)

const shown = computed<ClockTime | null>(() => (frozen.value ? clockTime(frozen.value, props.timeZone) : live.value))
const angles = computed(() => clockAngles(frozen.value ? shown.value! : CLOCK_REST, props.motion === 'sweep' && frozen.value ? 'sweep' : 'still'))
const ariaLabel = computed(() => (shown.value ? loc.value.clock.time(props.label, shown.value.h, shown.value.m) : props.label ?? loc.value.clock.label))
const readout = computed(() => (shown.value ? clockDigital(shown.value, props.seconds) : props.seconds ? '--:--:--' : '--:--'))
const offsetText = computed(() => {
  const min = frozen.value ? clockOffset(frozen.value, props.timeZone) : liveOffset.value
  return min === null ? '' : clockFormatOffset(min)
})

const face = ref<HTMLElement>()
let ctl: ClockController | undefined

function onTime(t: ClockTime) {
  const prev = live.value
  if (props.digital || !prev || prev.m !== t.m || prev.h !== t.h) {
    live.value = t
    if (props.offset) liveOffset.value = clockOffset(clockToDate(props.now ? props.now() : Date.now()), props.timeZone)
  }
}

function start() {
  ctl?.destroy()
  ctl = undefined
  if (frozen.value || !face.value) return
  live.value = null
  ctl = mountClock(face.value, { timeZone: props.timeZone, motion: props.motion, now: props.now }, onTime)
}

onMounted(start)
watch(() => props.time === undefined, start)
watch(
  () => [props.timeZone, props.motion, props.now, props.digital, props.offset] as const,
  () => {
    live.value = null
    ctl?.update({ timeZone: props.timeZone, motion: props.motion, now: props.now })
  },
)
onBeforeUnmount(() => ctl?.destroy())
</script>

<template>
  <figure :class="['ml-clock', `ml-clock--${tone}`, `ml-clock--${motion}`]" :style="{ '--_ck-size': `${size}px` }">
    <div ref="face" class="ml-clock__face" role="img" :aria-label="ariaLabel">
      <div class="ml-clock__dial" aria-hidden="true" />
      <div v-if="crest" class="ml-clock__crest" aria-hidden="true"><MlLionMark :size="32" /></div>
      <svg class="ml-clock__svg" viewBox="0 0 200 200" aria-hidden="true">
        <path class="ml-clock__marks ml-clock__marks--minor" :d="marks.minor" />
        <path class="ml-clock__marks ml-clock__marks--major" :d="marks.major" />
        <text v-for="n in numerals" :key="n.text" class="ml-clock__numeral" :x="n.x" :y="n.y">{{ n.text }}</text>
        <g class="ml-clock__hand ml-clock__hand--hour" :style="{ '--_ck-a': `${angles.hour}deg` }"><path :d="CLOCK_HANDS.hour" /></g>
        <g class="ml-clock__hand ml-clock__hand--minute" :style="{ '--_ck-a': `${angles.minute}deg` }"><path :d="CLOCK_HANDS.minute" /></g>
        <g v-if="seconds" class="ml-clock__hand ml-clock__hand--second" :style="{ '--_ck-a': `${angles.second}deg` }">
          <path :d="CLOCK_HANDS.second" />
          <circle cx="100" cy="122" r="4" />
        </g>
        <circle class="ml-clock__cap" cx="100" cy="100" r="5.5" />
        <circle class="ml-clock__pin" cx="100" cy="100" r="1.8" />
      </svg>
    </div>
    <figcaption v-if="label || digital || offset" class="ml-clock__caption" aria-hidden="true">
      <span v-if="label" class="ml-clock__label">{{ label }}</span>
      <time v-if="digital" class="ml-clock__digital" :datetime="shown ? readout : undefined">{{ readout }}</time>
      <span v-if="offset" class="ml-clock__offset">{{ offsetText }}</span>
    </figcaption>
  </figure>
</template>
