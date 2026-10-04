<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { useLocale } from '../locale'
import { prefersReducedMotion } from '../composables'
import { pawBurst } from '../pawStamp'
import MlCuteIcon from './MlCuteIcon.vue'
import {
  GRID_CRUISE_MS,
  GRID_RING,
  gridBrake,
  gridSchedule,
  lotteryDecide,
  lotteryTone,
  type MlLotteryDecision,
  type MlLotteryPrize,
} from './lottery'

const loc = useLocale()

const props = withDefaults(
  defineProps<{
    /** Eight prizes, clockwise from the top-left cell. */
    prizes: MlLotteryPrize[]
    /** Width in px (it shrinks with a narrow container). */
    size?: number
    /** ms from press to landing. */
    duration?: number
    /** Full laps before braking. */
    turns?: number
    /** Text on the centre button. */
    buttonText?: string
    /** Draws left, shown under the button (and 0 disables it). */
    chances?: number
    /**
     * Runs before every press / draw() without an index. Return an index (or a
     * Promise of one, e.g. a server draw) to land there, `false` to cancel, or
     * nothing to pick by weight. The light runs while it waits.
     */
    beforeDraw?: () => MlLotteryDecision
    confetti?: boolean
    disabled?: boolean
    label?: string
  }>(),
  { size: 330, duration: 4200, turns: 3, confetti: true, disabled: false },
)

const emit = defineEmits<{
  start: []
  result: [prize: MlLotteryPrize, index: number]
  error: [error: unknown]
}>()

const ring = computed(() => props.prizes.slice(0, 8))
const active = ref(-1)
const winner = ref(-1)
const running = ref(false)
const announce = ref('')
const root = ref<HTMLElement>()
const canDraw = computed(() => !props.disabled && !running.value && ring.value.length > 0 && props.chances !== 0)

const cells = computed(() =>
  Array.from({ length: 9 }, (_, cell) => {
    if (cell === 4) return { cell, go: true as const }
    const index = GRID_RING.indexOf(cell as (typeof GRID_RING)[number])
    const prize = ring.value[index]
    return { cell, go: false as const, index, prize, tone: lotteryTone(ring.value, index) }
  }),
)

let timer: ReturnType<typeof setTimeout> | undefined
let finish: ((index: number) => void) | undefined
onBeforeUnmount(() => {
  clearTimeout(timer)
  finish?.(-1)
})

function step() {
  active.value = (active.value + 1 + 8) % 8
}

function run(delays: number[], target: number) {
  let k = 0
  const next = () => {
    step()
    if (++k >= delays.length) return land(target)
    timer = setTimeout(next, delays[k])
  }
  timer = setTimeout(next, delays[0])
}

function land(index: number) {
  running.value = false
  winner.value = index
  if (index >= 0) active.value = index
  const prize = ring.value[index]
  if (prize) {
    announce.value = loc.value.lottery.result(prize.label)
    if (props.confetti && !prefersReducedMotion()) {
      const el = root.value?.querySelector(`[data-index="${index}"]`)
      const r = el?.getBoundingClientRect()
      if (r) pawBurst(r.left + r.width / 2, r.top + r.height / 2, { count: 20, spread: 360, power: 160 })
    }
    emit('result', prize, index)
  } else announce.value = loc.value.lottery.none
  finish?.(index)
  finish = undefined
}

/** Run the light. With an index it lands there; resolves with the winning index, or -1. */
function draw(target?: number): Promise<number> {
  if (!canDraw.value) return Promise.resolve(-1)
  let decided: ReturnType<typeof lotteryDecide>
  try {
    decided = lotteryDecide(ring.value, target, props.beforeDraw)
  } catch (error) {
    emit('error', error)
    return Promise.resolve(-1)
  }
  if ('sync' in decided && decided.sync < 0) return Promise.resolve(-1)
  const done = new Promise<number>((resolve) => (finish = resolve))
  running.value = true
  winner.value = -1
  announce.value = loc.value.lottery.drawing
  emit('start')
  const reduced = prefersReducedMotion()
  if (active.value < 0) active.value = 7
  if ('sync' in decided) {
    if (reduced) land(decided.sync)
    else run(gridSchedule(active.value, decided.sync, props.turns, props.duration), decided.sync)
    return done
  }
  // Server draw: cruise until the answer arrives, then brake onto it.
  const cruise = () => {
    step()
    timer = setTimeout(cruise, GRID_CRUISE_MS)
  }
  if (!reduced) cruise()
  decided.later.then(
    (index) => {
      if (!running.value) return
      clearTimeout(timer)
      if (index < 0 || reduced) land(index)
      else run(gridBrake(active.value, index, props.duration * 0.6), index)
    },
    (error) => {
      if (!running.value) return
      clearTimeout(timer)
      emit('error', error)
      land(-1)
    },
  )
  return done
}

defineExpose({ draw })
</script>

<template>
  <div
    ref="root"
    :class="['ml-grid-lottery', { 'ml-grid-lottery--running': running, 'ml-grid-lottery--landed': !running && winner >= 0, 'ml-grid-lottery--disabled': disabled }]"
    :style="{ '--_size': `${size}px` }"
    role="group"
    :aria-label="label ?? loc.lottery.grid"
  >
    <div class="ml-grid-lottery__board">
      <template v-for="c in cells" :key="c.cell">
        <button v-if="c.go" type="button" class="ml-grid-lottery__go" :disabled="!canDraw" @click="draw()">
          <span class="ml-grid-lottery__go-text">{{ buttonText ?? loc.lottery.draw }}</span>
          <span v-if="chances !== undefined" class="ml-grid-lottery__chances">× {{ chances }}</span>
        </button>
        <div
          v-else
          :data-index="c.index"
          :class="[
            'ml-grid-lottery__cell',
            `ml-grid-lottery__cell--${c.tone}`,
            {
              'ml-grid-lottery__cell--active': active === c.index,
              'ml-grid-lottery__cell--won': !running && winner === c.index,
              'ml-grid-lottery__cell--disabled': c.prize?.disabled,
              'ml-grid-lottery__cell--empty': !c.prize,
            },
          ]"
          role="img"
          :aria-label="c.prize?.label"
        >
          <template v-if="c.prize">
            <img v-if="c.prize.image" class="ml-grid-lottery__img" :src="c.prize.image" alt="" />
            <MlCuteIcon v-else-if="c.prize.icon" class="ml-grid-lottery__icon" :name="c.prize.icon" />
            <span class="ml-grid-lottery__label">{{ c.prize.label }}</span>
          </template>
        </div>
      </template>
    </div>
    <p class="ml-visually-hidden" aria-live="polite">{{ announce }}</p>
  </div>
</template>
