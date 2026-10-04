<script setup lang="ts">
import { computed, onBeforeUnmount, ref, useId } from 'vue'
import { prefersReducedMotion } from '../composables'
import { useLocale } from '../locale'
import { pawBurst } from '../pawStamp'
import { icons } from './icons'
import MlPaw from './MlPaw.vue'
import {
  SETTLE,
  WHEEL_C,
  WHEEL_R,
  WheelSpinner,
  isThenable,
  labelSize,
  pegs,
  pickWeighted,
  pointerKick,
  rimLights,
  usedTones,
  wheelSlices,
  type MlWheelPrize,
} from './wheel'

const props = withDefaults(
  defineProps<{
    prizes: MlWheelPrize[]
    /** Rendered width in px. */
    size?: number
    /** ms for a full spin. */
    duration?: number
    /** Minimum full turns before landing. */
    turns?: number
    disabled?: boolean
    /** Text on the hub button. */
    spinText?: string
    /** Accessible name for the wheel. */
    label?: string
    /** Paw-print confetti on landing. */
    confetti?: boolean
    /**
     * Runs before every hub press / spin() without an index. Return an index
     * (or a Promise of one, e.g. a server draw) to land there, `false` to
     * cancel, or nothing to pick by weight. The wheel spins while it waits.
     */
    beforeSpin?: () => number | false | void | Promise<number | false | void>
  }>(),
  { size: 320, duration: 6000, turns: 6, spinText: 'GO', confetti: true },
)

const emit = defineEmits<{
  start: []
  result: [prize: MlWheelPrize, index: number]
  error: [error: unknown]
}>()

const t = useLocale()
const uid = `ml-wheel-${useId()}`
const root = ref<HTMLElement>()
const rotation = ref(0)
const spinning = ref(false)
const fading = ref(false)
const winner = ref(-1)
const announce = ref('')

const slices = computed(() => wheelSlices(props.prizes, uid))
const imageSlices = computed(() => slices.value.filter((s) => s.prize.image))
const tones = computed(() => usedTones(slices.value))
const lights = computed(() => rimLights(props.prizes.length))
const pegDots = computed(() => pegs(props.prizes.length))
const fontSize = computed(() => labelSize(props.prizes.length))
const kick = computed(() => (spinning.value && !fading.value ? pointerKick(rotation.value, props.prizes.length) : 0))
const canSpin = computed(() => !props.disabled && props.prizes.length > 0)
const wheelLabel = computed(() => t.value.wheel.summary(props.label ?? t.value.wheel.label, props.prizes.map((p) => p.label)))

let resolveSpin: ((index: number) => void) | undefined

const spinner = new WheelSpinner({
  onAngle: (r) => (rotation.value = r),
  onLand: () => {
    const index = winner.value
    spinning.value = false
    fading.value = false
    const prize = props.prizes[index]
    if (prize) {
      announce.value = t.value.wheel.result(prize.label)
      if (props.confetti && root.value) {
        const r = root.value.getBoundingClientRect()
        pawBurst(r.left + r.width / 2, r.top + r.height / 2, { count: 26, spread: 360, power: Math.max(160, props.size * 0.7) })
      }
      emit('result', prize, index)
    } else announce.value = ''
    resolveSpin?.(index)
    resolveSpin = undefined
  },
})

const cruiseSpeed = () => (4 * Math.max(1, props.turns) * 360) / (props.duration * (1 - SETTLE))

function begin() {
  spinning.value = true
  winner.value = -1
  announce.value = t.value.wheel.spinning
  emit('start')
}

function landOn(index: number) {
  winner.value = index
  const reduced = prefersReducedMotion()
  fading.value = reduced
  spinner.land(index, props.prizes.length, { duration: props.duration, turns: props.turns, reduced })
}

const valid = (i: unknown): i is number => typeof i === 'number' && Number.isInteger(i) && i >= 0 && i < props.prizes.length

/**
 * Spin the wheel. With an index it lands there; without one it asks
 * `beforeSpin`, then falls back to the prize weights. Resolves with the
 * winning index, or -1 when it didn't spin.
 */
function spin(targetIndex?: number): Promise<number> {
  if (spinning.value || !canSpin.value) return Promise.resolve(-1)
  const done = new Promise<number>((resolve) => (resolveSpin = resolve))
  if (valid(targetIndex)) {
    begin()
    landOn(targetIndex)
    return done
  }
  let decided: ReturnType<NonNullable<typeof props.beforeSpin>>
  try {
    decided = props.beforeSpin?.()
  } catch (error) {
    emit('error', error)
    resolveSpin = undefined
    return Promise.resolve(-1)
  }
  if (!isThenable(decided)) {
    if (decided === false) {
      resolveSpin = undefined
      return Promise.resolve(-1)
    }
    const index = valid(decided) ? decided : pickWeighted(props.prizes)
    if (index < 0) {
      resolveSpin = undefined
      return Promise.resolve(-1)
    }
    begin()
    landOn(index)
    return done
  }
  // Server draw: spin while we wait, then brake onto the answer.
  begin()
  const reduced = prefersReducedMotion()
  if (!reduced) spinner.cruise(cruiseSpeed())
  decided.then(
    (answer) => {
      if (!spinning.value) return
      const index = answer === false ? -1 : valid(answer) ? answer : pickWeighted(props.prizes)
      winner.value = index
      if (reduced) {
        if (index >= 0) landOn(index)
        else spinner.halt()
      } else spinner.landFromCruise(index, props.prizes.length, { duration: props.duration * 0.6 })
    },
    (error) => {
      if (!spinning.value) return
      emit('error', error)
      winner.value = -1
      if (reduced) spinner.halt()
      else spinner.landFromCruise(-1, props.prizes.length, { duration: props.duration * 0.4 })
    },
  )
  return done
}

function onHub() {
  if (spinning.value) return
  void spin()
}

onBeforeUnmount(() => {
  spinner.stop()
  resolveSpin?.(-1)
})

defineExpose({ spin })
</script>

<template>
  <div
    ref="root"
    :class="[
      'ml-lucky-wheel',
      {
        'ml-lucky-wheel--spinning': spinning,
        'ml-lucky-wheel--fade': fading,
        'ml-lucky-wheel--landed': !spinning && winner >= 0,
        'ml-lucky-wheel--disabled': !canSpin,
      },
    ]"
    :style="{ '--_size': `${size}px` }"
  >
    <svg class="ml-lucky-wheel__svg" viewBox="0 0 200 200" role="img" :aria-label="wheelLabel">
      <defs>
        <radialGradient v-for="g in tones" :id="`${uid}-${g.tone}`" :key="g.tone" :cx="WHEEL_C" :cy="WHEEL_C" :r="WHEEL_R" gradientUnits="userSpaceOnUse">
          <stop offset="0.2" :stop-color="g.stops[1]" />
          <stop offset="1" :stop-color="g.stops[0]" />
        </radialGradient>
        <linearGradient :id="`${uid}-rim`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#fff4cc" />
          <stop offset="0.22" stop-color="#ffd56a" />
          <stop offset="0.48" stop-color="#b7780f" />
          <stop offset="0.7" stop-color="#f2bd4a" />
          <stop offset="1" stop-color="#7c4e0b" />
        </linearGradient>
        <radialGradient :id="`${uid}-sheen`" cx="0.38" cy="0.26" r="0.75">
          <stop offset="0" stop-color="#fff" stop-opacity="0.34" />
          <stop offset="0.45" stop-color="#fff" stop-opacity="0.06" />
          <stop offset="1" stop-color="#000" stop-opacity="0.22" />
        </radialGradient>
        <clipPath v-for="s in imageSlices" :id="`${uid}-clip-${s.index}`" :key="`c${s.index}`">
          <circle :cx="s.media.x + s.media.size / 2" :cy="s.media.y + s.media.size / 2" :r="s.media.size / 2" />
        </clipPath>
      </defs>
      <circle class="ml-lucky-wheel__rim" cx="100" cy="100" r="99" :fill="`url(#${uid}-rim)`" />
      <circle class="ml-lucky-wheel__rim-groove" cx="100" cy="100" r="87" />
      <g class="ml-lucky-wheel__lights">
        <circle v-for="l in lights" :key="l.i" class="ml-lucky-wheel__light" :cx="l.x" :cy="l.y" r="2.6" :style="{ '--_i': l.i }" />
      </g>
      <g class="ml-lucky-wheel__face" :transform="`rotate(${rotation.toFixed(2)} 100 100)`">
        <g
          v-for="s in slices"
          :key="s.index"
          :class="[
            'ml-lucky-wheel__slice',
            `ml-lucky-wheel__slice--${s.ink}`,
            { 'ml-lucky-wheel__slice--win': !spinning && s.index === winner, 'ml-lucky-wheel__slice--off': s.prize.disabled },
          ]"
        >
          <path class="ml-lucky-wheel__wedge" :d="s.d" :fill="s.fill" />
          <image
            v-if="s.prize.image"
            class="ml-lucky-wheel__image"
            :href="s.prize.image"
            :x="s.media.x"
            :y="s.media.y"
            :width="s.media.size"
            :height="s.media.size"
            preserveAspectRatio="xMidYMid slice"
            :clip-path="`url(#${uid}-clip-${s.index})`"
            :transform="`rotate(${s.media.rotate} ${s.media.x + s.media.size / 2} ${s.media.y + s.media.size / 2})`"
          />
          <path
            v-else-if="s.prize.icon"
            class="ml-lucky-wheel__icon"
            :d="icons[s.prize.icon]"
            :transform="`translate(${s.media.x} ${s.media.y}) rotate(${s.media.rotate} ${s.media.size / 2} ${s.media.size / 2}) scale(${s.media.size / 24})`"
          />
          <text
            class="ml-lucky-wheel__label"
            :x="s.label.x"
            :y="s.label.y"
            :font-size="fontSize"
            text-anchor="middle"
            dominant-baseline="central"
            :transform="`rotate(${s.label.rotate} ${s.label.x} ${s.label.y})`"
          >{{ s.prize.label }}</text>
        </g>
        <circle v-for="(p, i) in pegDots" :key="`p${i}`" class="ml-lucky-wheel__peg" :cx="p.x" :cy="p.y" r="1.9" />
      </g>
      <circle class="ml-lucky-wheel__sheen" cx="100" cy="100" :r="WHEEL_R" :fill="`url(#${uid}-sheen)`" />
      <g class="ml-lucky-wheel__pointer" :transform="`rotate(${kick.toFixed(2)} 100 7.5)`">
        <path class="ml-lucky-wheel__pointer-body" d="M100 27 L90.5 5.5 Q100 -1 109.5 5.5 Z" :fill="`url(#${uid}-rim)`" />
        <circle class="ml-lucky-wheel__pointer-pin" cx="100" cy="7.5" r="2.6" />
      </g>
    </svg>
    <button
      type="button"
      class="ml-lucky-wheel__hub"
      :disabled="!canSpin"
      :aria-disabled="spinning || undefined"
      :aria-label="t.wheel.spin"
      :aria-describedby="`${uid}-live`"
      @click="onHub"
    >
      <MlPaw class="ml-lucky-wheel__paw" tone="current" />
      <span class="ml-lucky-wheel__go">{{ spinText }}</span>
    </button>
    <span :id="`${uid}-live`" class="ml-visually-hidden" aria-live="polite">{{ announce }}</span>
  </div>
</template>
