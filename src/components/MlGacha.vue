<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, useId } from 'vue'
import { useLocale } from '../locale'
import { prefersReducedMotion } from '../composables'
import { pawBurst } from '../pawStamp'
import MlCuteIcon from './MlCuteIcon.vue'
import { PAW_PAD, PAW_TOES } from './paw'
import {
  GACHA_MS,
  gachaCapsules,
  lotteryDecide,
  lotteryTone,
  type GachaPhase,
  type MlLotteryDecision,
  type MlLotteryPrize,
} from './lottery'

const loc = useLocale()

const props = withDefaults(
  defineProps<{
    prizes: MlLotteryPrize[]
    /** Width in px (it shrinks with a narrow container). */
    size?: number
    /** Text on the turn button. */
    buttonText?: string
    /** Draws left, shown on the button (and 0 disables it). */
    chances?: number
    /**
     * Runs before every turn / draw() without an index. Return an index (or a
     * Promise of one, e.g. a server draw) to land there, `false` to cancel, or
     * nothing to pick by weight. The machine shakes while it waits.
     */
    beforeDraw?: () => MlLotteryDecision
    confetti?: boolean
    disabled?: boolean
    label?: string
  }>(),
  { size: 280, confetti: true, disabled: false },
)

const emit = defineEmits<{
  start: []
  result: [prize: MlLotteryPrize, index: number]
  error: [error: unknown]
  close: []
}>()

const uid = `ml-gacha-${useId()}`
const phase = ref<GachaPhase>('idle')
const waiting = ref(false)
const winner = ref(-1)
const announce = ref('')
const root = ref<HTMLElement>()
const again = ref<HTMLButtonElement>()

const capsules = computed(() =>
  gachaCapsules(props.prizes.map((_, i) => lotteryTone(props.prizes, i))).map((c) => ({
    ...c,
    x: +(100 + (c.x - 50) * 1.44).toFixed(1),
    y: +(92 + (c.y - 50) * 1.44).toFixed(1),
  })),
)
const prize = computed(() => props.prizes[winner.value])
const prizeTone = computed(() => (winner.value >= 0 ? lotteryTone(props.prizes, winner.value) : 'gold'))
const canDraw = computed(() => !props.disabled && phase.value === 'idle' && props.prizes.length > 0 && props.chances !== 0)

const R = 12.2
const TOP = `M${-R} 0A${R} ${R} 0 0 1 ${R} 0Z`
const BOTTOM = `M${-R} 0A${R} ${R} 0 0 0 ${R} 0Z`

let timer: ReturnType<typeof setTimeout> | undefined
let finish: ((index: number) => void) | undefined
onBeforeUnmount(() => {
  clearTimeout(timer)
  finish?.(-1)
})

const later = (ms: number, fn: () => void) => (timer = setTimeout(fn, ms))

function release(index: number) {
  waiting.value = false
  if (index < 0) {
    phase.value = 'idle'
    announce.value = loc.value.lottery.none
    finish?.(-1)
    finish = undefined
    return
  }
  winner.value = index
  if (prefersReducedMotion()) return opened()
  phase.value = 'dropping'
  later(GACHA_MS.drop, () => {
    phase.value = 'opening'
    later(GACHA_MS.open, opened)
  })
}

function opened() {
  phase.value = 'open'
  const p = props.prizes[winner.value]
  announce.value = loc.value.lottery.result(p.label)
  if (props.confetti && !prefersReducedMotion() && root.value) {
    const r = root.value.getBoundingClientRect()
    pawBurst(r.left + r.width / 2, r.top + r.height * 0.4, { count: 22, spread: 360, power: Math.max(150, r.width * 0.6) })
  }
  emit('result', p, winner.value)
  finish?.(winner.value)
  finish = undefined
  nextTick(() => again.value?.focus())
}

/** Turn the knob. With an index that capsule comes out; resolves with the winning index, or -1. */
function draw(target?: number): Promise<number> {
  if (!canDraw.value) return Promise.resolve(-1)
  let decided: ReturnType<typeof lotteryDecide>
  try {
    decided = lotteryDecide(props.prizes, target, props.beforeDraw)
  } catch (error) {
    emit('error', error)
    return Promise.resolve(-1)
  }
  if ('sync' in decided && decided.sync < 0) return Promise.resolve(-1)
  const done = new Promise<number>((resolve) => (finish = resolve))
  phase.value = 'turning'
  winner.value = -1
  announce.value = loc.value.lottery.drawing
  emit('start')
  const turnMs = prefersReducedMotion() ? 0 : GACHA_MS.turn
  if ('sync' in decided) {
    const index = decided.sync
    later(turnMs, () => release(index))
    return done
  }
  const started = Date.now()
  waiting.value = true
  decided.later.then(
    (index) => {
      if (phase.value !== 'turning') return
      later(Math.max(0, turnMs - (Date.now() - started)), () => release(index))
    },
    (error) => {
      if (phase.value !== 'turning') return
      emit('error', error)
      release(-1)
    },
  )
  return done
}

/** Put the capsule away and get ready for the next turn. */
function reset() {
  clearTimeout(timer)
  if (phase.value === 'open') emit('close')
  phase.value = 'idle'
  waiting.value = false
  winner.value = -1
}

defineExpose({ draw, reset })
</script>

<template>
  <div
    ref="root"
    :class="['ml-gacha', `ml-gacha--${phase}`, { 'ml-gacha--waiting': waiting, 'ml-gacha--disabled': !canDraw && phase === 'idle' }]"
    :style="{ '--_size': `${size}px` }"
    role="group"
    :aria-label="label ?? loc.lottery.gacha"
  >
    <svg class="ml-gacha__svg" viewBox="0 0 200 300" aria-hidden="true">
      <defs>
        <linearGradient :id="`${uid}-body`" x1="0" y1="0" x2="1" y2="0">
          <stop class="ml-gacha__stop ml-gacha__stop--a" offset="0" />
          <stop class="ml-gacha__stop ml-gacha__stop--b" offset="0.45" />
          <stop class="ml-gacha__stop ml-gacha__stop--c" offset="1" />
        </linearGradient>
        <radialGradient :id="`${uid}-glass`" cx="0.35" cy="0.3" r="0.8">
          <stop class="ml-gacha__glass-stop ml-gacha__glass-stop--a" offset="0" />
          <stop class="ml-gacha__glass-stop ml-gacha__glass-stop--b" offset="1" />
        </radialGradient>
        <clipPath :id="`${uid}-dome`">
          <circle cx="100" cy="92" r="70" />
        </clipPath>
      </defs>
      <!-- Body -->
      <rect class="ml-gacha__base" x="34" y="268" width="132" height="14" rx="5" />
      <rect class="ml-gacha__body" x="40" y="150" width="120" height="122" rx="14" :fill="`url(#${uid}-body)`" />
      <rect class="ml-gacha__collar" x="50" y="146" width="100" height="14" rx="5" />
      <rect class="ml-gacha__slot" x="134" y="174" width="8" height="22" rx="3" />
      <g class="ml-gacha__crest" transform="translate(56 172) scale(0.9)">
        <ellipse v-for="t in PAW_TOES" :key="t.cx" :cx="t.cx" :cy="t.cy" :rx="t.rx" :ry="t.ry" :transform="`rotate(${t.rotate} ${t.cx} ${t.cy})`" />
        <path :d="PAW_PAD" />
      </g>
      <rect class="ml-gacha__chute" x="74" y="232" width="52" height="26" rx="8" />
      <!-- Knob -->
      <g class="ml-gacha__knob" @click="draw()">
        <circle class="ml-gacha__knob-ring" cx="100" cy="198" r="22" />
        <rect class="ml-gacha__knob-bar" x="94" y="180" width="12" height="36" rx="6" />
        <circle class="ml-gacha__knob-cap" cx="100" cy="198" r="5" />
      </g>
      <!-- Dome -->
      <circle class="ml-gacha__dome-back" cx="100" cy="92" r="72" />
      <g class="ml-gacha__pile" :clip-path="`url(#${uid}-dome)`">
        <g
          v-for="(c, i) in capsules"
          :key="i"
          :class="['ml-gacha__capsule', `ml-gacha__capsule--${c.tone}`]"
          :style="{ '--_i': i }"
          :transform="`translate(${c.x} ${c.y}) rotate(${c.rotate})`"
        >
          <path class="ml-gacha__capsule-top" :d="TOP" />
          <path class="ml-gacha__capsule-bottom" :d="BOTTOM" />
        </g>
      </g>
      <circle class="ml-gacha__dome" cx="100" cy="92" r="72" :fill="`url(#${uid}-glass)`" />
      <path class="ml-gacha__shine" d="M52 66a52 52 0 0 1 34-30" />
      <!-- The capsule that comes out -->
      <g v-if="phase === 'dropping' || phase === 'opening' || phase === 'open'" :class="['ml-gacha__drop', `ml-gacha__capsule--${prizeTone}`]">
        <g class="ml-gacha__drop-body">
          <path class="ml-gacha__capsule-bottom" :d="BOTTOM" />
          <path class="ml-gacha__capsule-top ml-gacha__drop-top" :d="TOP" />
        </g>
      </g>
    </svg>
    <button type="button" class="ml-gacha__turn" :disabled="!canDraw" @click="draw()">
      {{ buttonText ?? loc.lottery.turn }}<span v-if="chances !== undefined" class="ml-gacha__chances"> × {{ chances }}</span>
    </button>
    <div v-if="phase === 'open' && prize" :class="['ml-gacha__prize', `ml-gacha__prize--${prizeTone}`]">
      <div class="ml-gacha__prize-art">
        <img v-if="prize.image" :src="prize.image" alt="" />
        <MlCuteIcon v-else-if="prize.icon" :name="prize.icon" animate="bounce" />
      </div>
      <p class="ml-gacha__prize-label">{{ prize.label }}</p>
      <button ref="again" type="button" class="ml-gacha__again" @click="reset">{{ loc.lottery.again }}</button>
    </div>
    <p class="ml-visually-hidden" aria-live="polite">{{ announce }}</p>
  </div>
</template>
