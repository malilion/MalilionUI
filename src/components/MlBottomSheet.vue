<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useId, useSlots, watch } from 'vue'
import MlPaw from './MlPaw.vue'
import { trapFocus, useScrollLock } from '../composables'
import { useLocale } from '../locale'
import {
  bindSheetGesture,
  inertSiblings,
  resolveSnapPoints,
  sheetPosition,
  snapKey,
  snapPointCss,
  type SheetSnapPoint,
} from './sheet'

defineOptions({ inheritAttrs: false })

const loc = useLocale()

const props = withDefaults(
  defineProps<{
    title?: string
    description?: string
    /**
     * Heights the sheet rests at, low → high: px numbers, "320px" or "60%"
     * of the screen. Without them the sheet fits its content.
     */
    snapPoints?: SheetSnapPoint[]
    /** Drag down, Esc and the backdrop close it. False: it can only be closed from code. */
    dismissible?: boolean
    /** Backdrop, focus trap, page scroll lock. False: a peek sheet the page stays usable behind. */
    modal?: boolean
    /** Show the grab handle. */
    handle?: boolean
    /** Render in place (absolutely inside the nearest positioned parent) instead of on <body>. */
    inline?: boolean
    /** Accessible name when there is no title. */
    label?: string
  }>(),
  { dismissible: true, modal: true, handle: true },
)

const emit = defineEmits<{ close: [] }>()
const open = defineModel<boolean>('open', { default: false })
const snap = defineModel<number>('snap', { default: 0 })
const slots = useSlots()

const titleId = `ml-sheet-${useId()}`
const root = ref<HTMLElement>()
const panel = ref<HTMLElement>()
const body = ref<HTMLElement>()

/** Container height in px; 0 until measured (SSR and the first render use CSS lengths). */
const containerHeight = ref(0)
/** Finger-following height while dragging (and while a flick-dismiss animates out). */
const dragRaw = ref<number | null>(null)
const dragging = ref(false)
/** Content height of a fit-content sheet, measured when a drag starts. */
let fitHeight = 0

const fit = computed(() => !props.snapPoints?.length)
const count = computed(() => (fit.value ? 1 : props.snapPoints!.length))
const index = computed(() => Math.max(0, Math.min(count.value - 1, snap.value)))
const snapsPx = computed(() =>
  fit.value ? [fitHeight] : resolveSnapPoints(props.snapPoints!, containerHeight.value),
)

const position = computed(() =>
  dragRaw.value === null
    ? null
    : sheetPosition(dragRaw.value, snapsPx.value, props.dismissible, containerHeight.value || window.innerHeight),
)

const panelStyle = computed(() => {
  const style: Record<string, string> = {}
  const pos = position.value
  if (!fit.value) {
    style['--_h'] = pos
      ? `${pos.height}px`
      : containerHeight.value
        ? `${snapsPx.value[index.value]}px`
        : snapPointCss(props.snapPoints![index.value])
  }
  if (pos && pos.offset) style['--_y'] = `${pos.offset}px`
  return style
})
const rootStyle = computed(() => (position.value ? { '--_p': position.value.progress.toFixed(3) } : undefined))

const labelledBy = computed(() => (props.title || slots.title ? titleId : undefined))
const valueText = computed(() => loc.value.sheet.position(index.value + 1, count.value))

function measure() {
  if (root.value) containerHeight.value = root.value.clientHeight
}

function close() {
  if (!open.value) return
  open.value = false
  emit('close')
}

function snapTo(target: number) {
  if (fit.value) return
  snap.value = Math.max(0, Math.min(count.value - 1, target))
}

/* ── Gesture ── */
let unbind: (() => void) | null = null
watch(panel, (el) => {
  unbind?.()
  unbind = null
  if (!el) return
  unbind = bindSheetGesture(el, {
    snaps: () => snapsPx.value,
    index: () => index.value,
    restHeight: () => {
      measure()
      if (fit.value) fitHeight = panel.value?.offsetHeight ?? 0
      return snapsPx.value[index.value] ?? 0
    },
    body: () => body.value ?? null,
    enabled: () => open.value,
    dismissible: () => props.dismissible,
    dragging: (on) => (dragging.value = on),
    move: (raw) => (dragRaw.value = raw),
    release: (target) => {
      if (target === -1) return close() // keep the drag position; the leave animation starts from it
      dragRaw.value = null
      snapTo(target)
    },
  })
})

/* ── Open / close side effects ── */
const scrollLock = useScrollLock()
let returnFocusTo: HTMLElement | null = null
let undoInert: (() => void) | null = null
let resizeObserver: ResizeObserver | null = null

async function onOpen() {
  dragRaw.value = null
  if (props.modal) returnFocusTo = document.activeElement as HTMLElement | null
  await nextTick()
  measure()
  if (typeof ResizeObserver !== 'undefined' && root.value) {
    resizeObserver = new ResizeObserver(measure)
    resizeObserver.observe(root.value)
  }
  if (props.modal) {
    if (!props.inline) {
      scrollLock.lock()
      if (root.value) undoInert = inertSiblings(root.value)
    }
    panel.value?.focus({ preventScroll: true })
  }
}

function onClose() {
  resizeObserver?.disconnect()
  resizeObserver = null
  undoInert?.()
  undoInert = null
  scrollLock.unlock()
  returnFocusTo?.focus?.()
  returnFocusTo = null
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    if (!props.dismissible) return
    event.stopPropagation()
    close()
    return
  }
  if (props.modal && panel.value) trapFocus(event, panel.value)
}

function onHandleKeydown(event: KeyboardEvent) {
  if (fit.value) return
  const next = snapKey(event.key, index.value, count.value)
  if (next === null) return
  event.preventDefault()
  snapTo(next)
}

watch(open, (value) => (value ? onOpen() : onClose()))
onMounted(() => {
  if (open.value) onOpen()
})
onBeforeUnmount(() => {
  unbind?.()
  onClose()
})

defineExpose({ snapTo, close })
</script>

<template>
  <Teleport to="body" :disabled="inline">
    <Transition name="ml-sheet" :duration="{ enter: 480, leave: 280 }" @after-leave="dragRaw = null">
      <div
        v-if="open"
        ref="root"
        v-bind="$attrs"
        :class="[
          'ml-sheet',
          modal ? 'ml-sheet--modal' : 'ml-sheet--peek',
          { 'ml-sheet--inline': inline, 'ml-sheet--fit': fit, 'ml-sheet--dragging': dragging },
        ]"
        :style="rootStyle"
        @keydown="onKeydown"
      >
        <div v-if="modal" class="ml-sheet__backdrop" @click="dismissible && close()" />
        <div
          ref="panel"
          class="ml-sheet__panel"
          role="dialog"
          :aria-modal="modal ? 'true' : undefined"
          tabindex="-1"
          :aria-labelledby="labelledBy"
          :aria-label="labelledBy ? undefined : label"
          :style="panelStyle"
        >
          <div class="ml-sheet__grip">
            <div
              v-if="handle"
              class="ml-sheet__handle"
              :role="fit ? undefined : 'slider'"
              :tabindex="fit ? undefined : 0"
              :aria-hidden="fit ? 'true' : undefined"
              :aria-label="fit ? undefined : loc.sheet.handle"
              :aria-orientation="fit ? undefined : 'vertical'"
              :aria-valuemin="fit ? undefined : 1"
              :aria-valuemax="fit ? undefined : count"
              :aria-valuenow="fit ? undefined : index + 1"
              :aria-valuetext="fit ? undefined : valueText"
              @keydown="onHandleKeydown"
            >
              <span class="ml-sheet__bar"><MlPaw class="ml-sheet__paw" tone="current" :shine="false" /></span>
            </div>
            <header v-if="title || description || $slots.title || $slots.header" class="ml-sheet__header">
              <slot name="header" :close="close">
                <h2 v-if="title || $slots.title" :id="titleId" class="ml-sheet__title">
                  <slot name="title">{{ title }}</slot>
                </h2>
                <p v-if="description" class="ml-sheet__desc">{{ description }}</p>
              </slot>
            </header>
          </div>
          <div ref="body" class="ml-sheet__body">
            <slot :close="close" :snap-to="snapTo" />
          </div>
          <footer v-if="$slots.footer" class="ml-sheet__footer">
            <slot name="footer" :close="close" />
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
