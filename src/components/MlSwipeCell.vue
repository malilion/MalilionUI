<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useSlots, watch } from 'vue'
import MlIcon from './MlIcon.vue'
import {
  attachSwipeGesture,
  claimSwipeGroup,
  fullSwipeDistance,
  releaseSwipeGroup,
  sideOffset,
  swipeOffset,
  swipeSnap,
  type SwipeLimits,
} from './gesture'
import { useLocale } from '../locale'
import type { MlSwipeAction, MlSwipeSide } from '../types'

const loc = useLocale()

const props = withDefaults(
  defineProps<{
    /** Buttons revealed by swiping right, listed left to right. */
    leftActions?: MlSwipeAction[]
    /** Buttons revealed by swiping left, listed left to right. */
    rightActions?: MlSwipeAction[]
    /** Swiping far enough fires the outermost action (left side's first, right side's last). */
    fullSwipe?: boolean
    disabled?: boolean
    /** Only one cell per group is open at a time. */
    group?: string
    /** 'li' inside MlList (the default), 'div' anywhere else. */
    tag?: 'li' | 'div'
    /** List-row content like MlListItem; without a title the default slot is used. */
    title?: string
    subtitle?: string
    meta?: string
    badge?: number | string
    /** Makes the row a button (emits "select"). */
    clickable?: boolean
  }>(),
  { group: 'default', tag: 'li' },
)

const emit = defineEmits<{
  action: [action: MlSwipeAction, side: MlSwipeSide]
  select: []
}>()

/** Which side is open: 'left', 'right' or null. */
const open = defineModel<MlSwipeSide | null>('open', { default: null })

const slots = useSlots()
const root = ref<HTMLElement>()
const content = ref<HTMLElement>()
const leftEl = ref<HTMLElement>()
const rightEl = ref<HTMLElement>()
const moreEl = ref<HTMLButtonElement>()
const offset = ref(0)
const dragging = ref(false)
const full = ref(false)
const limits = ref<SwipeLimits>({ left: 0, right: 0 })

const hasLeft = computed(() => !!(props.leftActions?.length || slots.left))
const hasRight = computed(() => !!(props.rightActions?.length || slots.right))
const fullSide = computed<MlSwipeSide | null>(() => (full.value ? (offset.value > 0 ? 'left' : 'right') : null))

function measure() {
  const width = (el?: HTMLElement) => (el ? el.getBoundingClientRect().width : 0)
  limits.value = { left: width(leftEl.value), right: width(rightEl.value), full: props.fullSwipe, width: width(root.value) }
}

/** Past the actions' natural width the revealed side stretches with the row. */
function stretch(side: MlSwipeSide) {
  const size = side === 'left' ? limits.value.left : limits.value.right
  const revealed = side === 'left' ? offset.value : -offset.value
  return revealed > size ? { width: `${revealed}px` } : undefined
}

const self = { close: () => setOpen(null) }

function setOpen(side: MlSwipeSide | null) {
  if (side) claimSwipeGroup(props.group, self)
  else releaseSwipeGroup(props.group, self)
  offset.value = sideOffset(side, limits.value)
  full.value = false
  open.value = side
}

watch(open, async (side) => {
  if (side) claimSwipeGroup(props.group, self)
  else releaseSwipeGroup(props.group, self)
  if (dragging.value) return
  await nextTick()
  measure()
  offset.value = sideOffset(side, limits.value)
})

function close() {
  setOpen(null)
}

function outer(side: MlSwipeSide) {
  const list = side === 'left' ? props.leftActions : props.rightActions
  return side === 'left' ? list?.[0] : list?.[list.length - 1]
}

function onAction(action: MlSwipeAction, side: MlSwipeSide, event: MouseEvent) {
  emit('action', action, side)
  setOpen(null)
  // From the keyboard, focus would fall to <body> once the actions go inert.
  if (event.detail === 0) nextTick(() => moreEl.value?.focus())
}

/* ── Keyboard / screen-reader path ── */
async function reveal(side: MlSwipeSide, focus: boolean) {
  measure()
  setOpen(side)
  if (!focus) return
  await nextTick()
  const box = side === 'left' ? leftEl.value : rightEl.value
  box?.querySelector<HTMLElement>('button, [href], [tabindex]:not([tabindex="-1"])')?.focus()
}

const defaultSide = (): MlSwipeSide => (hasRight.value ? 'right' : 'left')

function onMore() {
  if (open.value) {
    close()
  } else reveal(defaultSide(), true)
}

function onKeydown(event: KeyboardEvent) {
  if (props.disabled || !(hasLeft.value || hasRight.value)) return
  if (event.key === 'ContextMenu' || (event.key === 'F10' && event.shiftKey)) {
    event.preventDefault()
    reveal(open.value ?? defaultSide(), true)
  } else if (event.key === 'Escape' && open.value) {
    event.preventDefault()
    close()
    moreEl.value?.focus()
  } else if (open.value && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
    // Arrows switch sides the way a swipe would: ← shows the right actions.
    const side: MlSwipeSide = event.key === 'ArrowLeft' ? 'right' : 'left'
    if (side !== open.value && (side === 'left' ? hasLeft.value : hasRight.value)) {
      event.preventDefault()
      reveal(side, true)
    }
  }
}

function onFocusOut(event: FocusEvent) {
  const next = event.relatedTarget as Node | null
  if (open.value && next && !root.value?.contains(next)) close()
}

/** A tap on the row while it is open just closes it. */
function onContentClick(event: MouseEvent) {
  if (!open.value) return
  event.preventDefault()
  event.stopPropagation()
  close()
}

function onOutside(event: PointerEvent) {
  if (open.value && !root.value?.contains(event.target as Node)) close()
}

watch(
  () => !!open.value,
  (on) => {
    if (typeof document === 'undefined') return
    if (on) document.addEventListener('pointerdown', onOutside, true)
    else document.removeEventListener('pointerdown', onOutside, true)
  },
)

/* ── Gesture ── */
let base = 0
let detach: (() => void) | undefined
onMounted(() => {
  if (open.value) {
    measure()
    offset.value = sideOffset(open.value, limits.value)
    claimSwipeGroup(props.group, self)
    document.addEventListener('pointerdown', onOutside, true)
  }
  detach = attachSwipeGesture({
    el: content.value!,
    enabled: () => !props.disabled && (hasLeft.value || hasRight.value),
    onStart() {
      measure()
      base = sideOffset(open.value, limits.value)
      dragging.value = true
      claimSwipeGroup(props.group, self)
    },
    onMove(dx) {
      offset.value = swipeOffset(base + dx, limits.value)
      const side = offset.value > 0 ? 'left' : 'right'
      const size = side === 'left' ? limits.value.left : limits.value.right
      full.value = !!props.fullSwipe && !!outer(side) && Math.abs(offset.value) >= fullSwipeDistance(limits.value.width ?? 0, size)
    },
    onEnd(dx, velocity, cancelled) {
      dragging.value = false
      const side = fullSide.value
      if (side && !cancelled) {
        const action = outer(side)!
        setOpen(null)
        emit('action', action, side)
        return
      }
      setOpen(cancelled ? open.value : swipeSnap(swipeOffset(base + dx, limits.value), velocity, limits.value))
    },
  })
})

onBeforeUnmount(() => {
  detach?.()
  releaseSwipeGroup(props.group, self)
  document.removeEventListener('pointerdown', onOutside, true)
})

defineExpose({ open: reveal, close })
</script>

<template>
  <component
    :is="tag"
    ref="root"
    :class="[
      'ml-list-item',
      'ml-swipe-cell',
      {
        'ml-swipe-cell--dragging': dragging,
        'ml-swipe-cell--open': !!open,
        'ml-swipe-cell--full': full,
        'ml-swipe-cell--disabled': disabled,
      },
    ]"
    @keydown="onKeydown"
    @focusout="onFocusOut"
  >
    <div
      ref="content"
      class="ml-swipe-cell__content"
      :style="offset ? { transform: `translate3d(${offset}px, 0, 0)` } : undefined"
      @click.capture="onContentClick"
    >
      <component
        :is="clickable ? 'button' : 'div'"
        v-if="title !== undefined"
        :type="clickable ? 'button' : undefined"
        :class="['ml-list-item__row', { 'ml-list-item__row--interactive': clickable }]"
        @click="clickable && emit('select')"
      >
        <span v-if="$slots.leading" class="ml-list-item__leading"><slot name="leading" /></span>
        <span class="ml-list-item__text">
          <span class="ml-list-item__title">{{ title }}</span>
          <span v-if="subtitle" class="ml-list-item__subtitle">{{ subtitle }}</span>
        </span>
        <span v-if="meta || badge !== undefined || $slots.trailing" class="ml-list-item__trailing">
          <span v-if="meta" class="ml-list-item__meta">{{ meta }}</span>
          <span v-if="badge !== undefined" class="ml-list-item__badge">{{ badge }}</span>
          <slot name="trailing" />
        </span>
      </component>
      <slot v-else />
      <button
        v-if="!disabled && (hasLeft || hasRight)"
        ref="moreEl"
        type="button"
        class="ml-swipe-cell__more"
        :aria-expanded="!!open"
        :aria-label="title ? loc.swipeCell.moreFor(title) : loc.swipeCell.more"
        @click="onMore"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" /></svg>
      </button>
    </div>
    <div
      v-if="hasLeft"
      ref="leftEl"
      class="ml-swipe-cell__actions ml-swipe-cell__actions--left"
      role="group"
      :aria-label="loc.swipeCell.left"
      :inert="open !== 'left' || undefined"
      :style="stretch('left')"
    >
      <slot name="left" :close="close">
        <button
          v-for="(action, i) in leftActions"
          :key="String(action.value ?? action.label)"
          type="button"
          :class="[
            'ml-swipe-cell__action',
            `ml-swipe-cell__action--${action.tone ?? 'default'}`,
            { 'ml-swipe-cell__action--outer': i === 0, 'ml-swipe-cell__action--expanded': fullSide === 'left' && i === 0 },
          ]"
          @click="onAction(action, 'left', $event)"
        >
          <MlIcon v-if="action.icon" :name="action.icon" />
          <span class="ml-swipe-cell__label">{{ action.label }}</span>
        </button>
      </slot>
    </div>
    <div
      v-if="hasRight"
      ref="rightEl"
      class="ml-swipe-cell__actions ml-swipe-cell__actions--right"
      role="group"
      :aria-label="loc.swipeCell.right"
      :inert="open !== 'right' || undefined"
      :style="stretch('right')"
    >
      <slot name="right" :close="close">
        <button
          v-for="(action, i) in rightActions"
          :key="String(action.value ?? action.label)"
          type="button"
          :class="[
            'ml-swipe-cell__action',
            `ml-swipe-cell__action--${action.tone ?? 'default'}`,
            {
              'ml-swipe-cell__action--outer': i === rightActions!.length - 1,
              'ml-swipe-cell__action--expanded': fullSide === 'right' && i === rightActions!.length - 1,
            },
          ]"
          @click="onAction(action, 'right', $event)"
        >
          <MlIcon v-if="action.icon" :name="action.icon" />
          <span class="ml-swipe-cell__label">{{ action.label }}</span>
        </button>
      </slot>
    </div>
  </component>
</template>
