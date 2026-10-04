<script setup lang="ts" generic="T">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import MlCuteIcon from './MlCuteIcon.vue'
import MlEmpty from './MlEmpty.vue'
import MlIcon from './MlIcon.vue'
import { useLocale } from '../locale'
import { prefersReducedMotion } from '../composables'
import {
  SWIPE_STACK_FLICK,
  SWIPE_STACK_MS,
  SWIPE_STACK_THRESHOLD,
  attachStackDrag,
  dragRotation,
  flyOut,
  stampStrength,
  swipeDecision,
  type MlSwipeDirection,
} from './swipe-stack'

const loc = useLocale()

const props = withDefaults(
  defineProps<{
    items: T[]
    /** Cards drawn in the stack (the top one plus the ones peeking out under it). */
    depth?: number
    /** Allow swiping up ("super like"). */
    up?: boolean
    /** Share of the card width (height for up) to drag before letting go throws it. */
    threshold?: number
    /** Fling speed in px/ms that throws a card whatever the distance. */
    flickVelocity?: number
    /** Card size: px number or any CSS length. */
    width?: number | string
    height?: number | string
    /** Nope / undo / like buttons under the stack. */
    buttons?: boolean
    /** Stamp texts (default from the locale: 喜歡 / 略過 / 超讚). */
    likeText?: string
    nopeText?: string
    superText?: string
    /** Name of an item for screen-reader announcements. */
    itemLabel?: (item: T) => string
    disabled?: boolean
    label?: string
  }>(),
  { depth: 3, up: false, threshold: SWIPE_STACK_THRESHOLD, flickVelocity: SWIPE_STACK_FLICK, width: 320, height: 420, buttons: true, disabled: false },
)

const emit = defineEmits<{
  swipe: [item: T, direction: MlSwipeDirection, index: number]
  undo: [item: T, index: number]
  empty: []
}>()

defineSlots<{
  default?: (props: { item: T; index: number }) => unknown
  empty?: () => unknown
}>()

/** Index of the top card. */
const index = defineModel<number>('index', { default: 0 })

const deck = ref<HTMLElement>()
const drag = ref({ x: 0, y: 0, active: false })
const leaving = shallowRef<{ item: T; index: number; direction: MlSwipeDirection; from: { x: number; y: number; r: number }; to: { x: number; y: number; r: number }; id: number } | null>(null)
const back = ref<{ direction: MlSwipeDirection; id: number } | null>(null)
const history = ref<{ index: number; direction: MlSwipeDirection }[]>([])
const announce = ref('')
let seq = 0
let leaveTimer: ReturnType<typeof setTimeout> | undefined
let backTimer: ReturnType<typeof setTimeout> | undefined

const STAMP = { right: 'like', left: 'nope', up: 'super' } as const
const stampText = (d: MlSwipeDirection) =>
  d === 'right' ? (props.likeText ?? loc.value.swipeStack.stamp.like) : d === 'left' ? (props.nopeText ?? loc.value.swipeStack.stamp.nope) : (props.superText ?? loc.value.swipeStack.stamp.super)
const length = (v: number | string) => (typeof v === 'number' ? `${v}px` : v)
const done = computed(() => index.value >= props.items.length)
const visible = computed(() =>
  props.items.slice(index.value, index.value + Math.max(1, props.depth)).map((item, k) => ({ item, index: index.value + k, k })),
)

function size() {
  const r = deck.value?.getBoundingClientRect()
  const w = r?.width || (typeof props.width === 'number' ? props.width : 320)
  const h = r?.height || (typeof props.height === 'number' ? props.height : 420)
  return { width: w, height: h }
}

const strength = computed(() => {
  if (!drag.value.active) return { left: 0, right: 0, up: 0 }
  return stampStrength(drag.value.x, drag.value.y, { ...size(), up: props.up, threshold: props.threshold })
})

const topStyle = computed(() => {
  if (!drag.value.active) return undefined
  const s = strength.value
  return {
    '--_ss-x': `${drag.value.x}px`,
    '--_ss-y': `${drag.value.y}px`,
    '--_ss-r': `${dragRotation(drag.value.x, size().width)}deg`,
    '--_ss-like': s.right,
    '--_ss-nope': s.left,
    '--_ss-super': s.up,
  }
})
const progress = computed(() => Math.max(strength.value.left, strength.value.right, strength.value.up))

function commit(direction: MlSwipeDirection, from = { x: 0, y: 0, r: 0 }) {
  if (done.value || props.disabled || (direction === 'up' && !props.up)) return false
  const i = index.value
  const item = props.items[i]
  clearTimeout(leaveTimer)
  if (prefersReducedMotion()) leaving.value = null
  else {
    const { width, height } = size()
    leaving.value = { item, index: i, direction, from, to: flyOut(direction, width, height, from.y), id: ++seq }
    leaveTimer = setTimeout(() => (leaving.value = null), SWIPE_STACK_MS)
  }
  back.value = null
  drag.value = { x: 0, y: 0, active: false }
  history.value = [...history.value, { index: i, direction }]
  index.value = i + 1
  announce.value = loc.value.swipeStack.swiped(direction, props.itemLabel?.(item))
  emit('swipe', item, direction, i)
  if (i + 1 >= props.items.length) emit('empty')
  return true
}

/** Throw the top card. Returns false when there is none (or the direction is off). */
function swipe(direction: MlSwipeDirection) {
  return commit(direction)
}

/** Bring the last thrown card back. Returns false when there is nothing to undo. */
function undo() {
  const last = history.value[history.value.length - 1]
  if (!last || props.disabled) return false
  history.value = history.value.slice(0, -1)
  clearTimeout(leaveTimer)
  leaving.value = null
  index.value = last.index
  clearTimeout(backTimer)
  if (!prefersReducedMotion()) {
    back.value = { direction: last.direction, id: ++seq }
    backTimer = setTimeout(() => (back.value = null), SWIPE_STACK_MS)
  }
  announce.value = loc.value.swipeStack.undone
  emit('undo', props.items[last.index], last.index)
  return true
}

function onKeydown(event: KeyboardEvent) {
  if ((event.target as Element | null)?.closest?.('input, textarea, select, [contenteditable]:not([contenteditable="false"])')) return
  let handled = true
  if (event.key === 'ArrowLeft') swipe('left')
  else if (event.key === 'ArrowRight') swipe('right')
  else if (event.key === 'ArrowUp' && props.up) swipe('up')
  else if (event.key === 'Backspace' || ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z')) undo()
  else handled = false
  if (handled) event.preventDefault()
}

let detach: (() => void) | undefined
onMounted(() => {
  if (!deck.value) return
  detach = attachStackDrag({
    el: deck.value,
    enabled: () => !props.disabled && !done.value,
    onStart: () => (drag.value = { x: 0, y: 0, active: true }),
    onMove: (x, y) => (drag.value = { x, y, active: true }),
    onEnd: (x, y, vx, vy, cancelled) => {
      const { width, height } = size()
      const direction = cancelled ? null : swipeDecision(x, y, vx, vy, { width, height, up: props.up, threshold: props.threshold, flick: props.flickVelocity })
      if (direction) commit(direction, { x, y, r: dragRotation(x, width) })
      else drag.value = { x: 0, y: 0, active: false }
    },
  })
})
onBeforeUnmount(() => {
  detach?.()
  clearTimeout(leaveTimer)
  clearTimeout(backTimer)
})

defineExpose({ swipe, undo })
</script>

<template>
  <div
    :class="['ml-swipe-stack', { 'ml-swipe-stack--disabled': disabled, 'ml-swipe-stack--done': done }]"
    :style="{ '--_ss-w': length(width), '--_ss-h': length(height) }"
    role="region"
    :aria-label="label ?? loc.swipeStack.label"
    :aria-description="loc.swipeStack.hint"
    tabindex="0"
    @keydown="onKeydown"
  >
    <div ref="deck" class="ml-swipe-stack__deck" :style="{ '--_ss-p': progress }">
      <div
        v-for="card in visible"
        :key="card.index"
        :class="[
          'ml-swipe-stack__card',
          card.k === 0 && 'ml-swipe-stack__card--top',
          card.k === 0 && drag.active && 'ml-swipe-stack__card--dragging',
          card.k === 0 && back && `ml-swipe-stack__card--back-${back.direction}`,
        ]"
        :style="[{ '--_ss-i': card.k }, card.k === 0 ? topStyle : undefined]"
        role="group"
        :aria-label="loc.swipeStack.card(card.index + 1, items.length)"
        :aria-hidden="card.k === 0 ? undefined : 'true'"
        :inert="card.k !== 0"
      >
        <div class="ml-swipe-stack__content"><slot :item="card.item" :index="card.index" /></div>
        <template v-if="card.k === 0">
          <span class="ml-swipe-stack__stamp ml-swipe-stack__stamp--like" aria-hidden="true">{{ stampText('right') }}</span>
          <span class="ml-swipe-stack__stamp ml-swipe-stack__stamp--nope" aria-hidden="true">{{ stampText('left') }}</span>
          <span v-if="up" class="ml-swipe-stack__stamp ml-swipe-stack__stamp--super" aria-hidden="true">{{ stampText('up') }}</span>
        </template>
      </div>
      <div
        v-if="leaving"
        :key="`leave-${leaving.id}`"
        :class="['ml-swipe-stack__card', 'ml-swipe-stack__card--leaving', `ml-swipe-stack__card--leaving-${leaving.direction}`]"
        :style="{
          '--_ss-x': `${leaving.from.x}px`,
          '--_ss-y': `${leaving.from.y}px`,
          '--_ss-r': `${leaving.from.r}deg`,
          '--_ss-tx': `${leaving.to.x}px`,
          '--_ss-ty': `${leaving.to.y}px`,
          '--_ss-tr': `${leaving.to.r}deg`,
        }"
        aria-hidden="true"
        inert
      >
        <div class="ml-swipe-stack__content"><slot :item="leaving.item" :index="leaving.index" /></div>
        <span :class="['ml-swipe-stack__stamp', `ml-swipe-stack__stamp--${STAMP[leaving.direction]}`]">{{ stampText(leaving.direction) }}</span>
      </div>
      <div v-if="done" class="ml-swipe-stack__empty">
        <slot name="empty"><MlEmpty size="sm" :title="loc.swipeStack.empty" /></slot>
      </div>
    </div>
    <div v-if="buttons" class="ml-swipe-stack__actions">
      <button type="button" class="ml-swipe-stack__btn ml-swipe-stack__btn--nope" :aria-label="loc.swipeStack.nope" :title="loc.swipeStack.nope" :disabled="done || disabled" @click="swipe('left')">
        <MlIcon name="close" />
      </button>
      <button type="button" class="ml-swipe-stack__btn ml-swipe-stack__btn--undo" :aria-label="loc.swipeStack.undo" :title="loc.swipeStack.undo" :disabled="!history.length || disabled" @click="undo()">
        <MlIcon name="rotate" />
      </button>
      <button v-if="up" type="button" class="ml-swipe-stack__btn ml-swipe-stack__btn--super" :aria-label="loc.swipeStack.super" :title="loc.swipeStack.super" :disabled="done || disabled" @click="swipe('up')">
        <MlCuteIcon name="star" />
      </button>
      <button type="button" class="ml-swipe-stack__btn ml-swipe-stack__btn--like" :aria-label="loc.swipeStack.like" :title="loc.swipeStack.like" :disabled="done || disabled" @click="swipe('right')">
        <MlCuteIcon name="heart" />
      </button>
    </div>
    <p class="ml-visually-hidden" aria-live="polite">{{ announce }}</p>
  </div>
</template>
