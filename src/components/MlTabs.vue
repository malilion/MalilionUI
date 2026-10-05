<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, reactive, ref, useId, watch } from 'vue'
import MlIcon from './MlIcon.vue'
import type { MlTabItem } from '../types'
import { useLocale } from '../locale'
import { dropTab, moveTab, nextTabAfterClose, scrollToReveal, tabDropSlot, tabOverflow } from './tabs'

const loc = useLocale()

const props = withDefaults(
  defineProps<{
    items: MlTabItem[]
    variant?: 'line' | 'plate'
    /** Accessible name for the tab list. */
    label?: string
    /** Close buttons on every tab (an item's own `closable` wins). */
    closable?: boolean
    /** A "+" button after the last tab; emits "add". */
    addable?: boolean
    /** Drag tabs, or Alt + ←/→, to reorder them; emits "reorder". */
    reorderable?: boolean
  }>(),
  { variant: 'line' },
)

// The component never changes `items`; the app applies these.
const emit = defineEmits<{ close: [value: string]; add: []; reorder: [values: string[]] }>()

const model = defineModel<string>()
if (model.value === undefined) {
  model.value = props.items.find((item) => !item.disabled)?.value
}

const baseId = `ml-tabs-${useId()}`
const tabId = (value: string) => `${baseId}-tab-${value}`
const panelId = (value: string) => `${baseId}-panel-${value}`

const list = ref<HTMLElement>()
const tabEls = new Map<string, HTMLElement>()
const ink = reactive({ x: 0, width: 0, ready: false })
const more = reactive({ start: false, end: false })
const announce = ref('')

const isClosable = (item: MlTabItem) => item.closable ?? props.closable
const shortcuts = (item: MlTabItem) =>
  [isClosable(item) && 'Delete', props.reorderable && 'Alt+ArrowLeft Alt+ArrowRight'].filter(Boolean).join(' ') || undefined

function setTabEl(value: string, el: unknown) {
  if (el instanceof HTMLElement) tabEls.set(value, el)
  else tabEls.delete(value)
}

/** The tab's whole box: its wrapper when it carries a close button. */
function boxOf(value: string | undefined) {
  const el = value === undefined ? undefined : tabEls.get(value)
  const wrap = el?.parentElement
  return wrap?.classList.contains('ml-tabs__item') ? wrap : el
}

function measure() {
  const el = boxOf(model.value)
  if (!el) return
  ink.x = el.offsetLeft
  ink.width = el.offsetWidth
  ink.ready = true
}

const scrollBehavior = (): ScrollBehavior =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'

function scrollStrip(left: number) {
  const el = list.value
  if (!el) return
  if (typeof el.scrollTo === 'function') el.scrollTo({ left, behavior: scrollBehavior() })
  else el.scrollLeft = left
}

function checkOverflow() {
  if (list.value) Object.assign(more, tabOverflow(list.value))
}

/** Keep the active tab in view when the strip overflows. */
function reveal() {
  const el = boxOf(model.value)
  const view = list.value
  if (!el || !view || view.scrollWidth <= view.clientWidth) return
  const left = scrollToReveal(view, el.offsetLeft, el.offsetWidth)
  if (left !== undefined) scrollStrip(left)
}

function page(dir: 1 | -1) {
  if (list.value) scrollStrip(list.value.scrollLeft + dir * list.value.clientWidth * 0.7)
}

function sync() {
  measure()
  checkOverflow()
}

function select(item: MlTabItem) {
  if (item.disabled) return
  model.value = item.value
}

function close(item: MlTabItem, fromKeyboard = false) {
  if (item.disabled || !isClosable(item)) return
  const next = nextTabAfterClose(props.items, item.value)
  emit('close', item.value)
  if (fromKeyboard && next !== undefined) tabEls.get(next)?.focus()
}

function shift(item: MlTabItem, dir: 1 | -1) {
  const values = props.items.map((i) => i.value)
  const to = values.indexOf(item.value) + dir
  if (to < 0 || to >= values.length) return
  emit('reorder', moveTab(values, item.value, to))
  announce.value = loc.value.sortable.moved(item.label, to + 1, values.length)
  // Re-rendering in the new order can drop focus; put it back.
  nextTick(() => tabEls.get(item.value)?.focus())
}

// Roving focus with automatic activation, per the WAI-ARIA tabs pattern.
function onKeydown(event: KeyboardEvent, item: MlTabItem) {
  if ((event.key === 'Delete' || event.key === 'Backspace') && isClosable(item)) {
    event.preventDefault()
    close(item, true)
    return
  }
  if (props.reorderable && event.altKey && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
    event.preventDefault()
    shift(item, event.key === 'ArrowRight' ? 1 : -1)
    return
  }
  const enabled = props.items.filter((item) => !item.disabled)
  const current = enabled.findIndex((item) => item.value === model.value)
  let next = -1
  if (event.key === 'ArrowRight') next = (current + 1) % enabled.length
  else if (event.key === 'ArrowLeft') next = (current - 1 + enabled.length) % enabled.length
  else if (event.key === 'Home') next = 0
  else if (event.key === 'End') next = enabled.length - 1
  if (next < 0) return
  event.preventDefault()
  const target = enabled[next]
  model.value = target.value
  tabEls.get(target.value)?.focus()
}

function onAuxclick(event: MouseEvent, item: MlTabItem) {
  if (event.button === 1) close(item)
}

// Stop the middle button's autoscroll on closable tabs.
function onMousedown(event: MouseEvent, item: MlTabItem) {
  if (event.button === 1 && isClosable(item)) event.preventDefault()
}

/* ── Pointer reordering: mouse and pen (touch keeps scrolling the strip) ── */
const drag = ref<{ value: string; slot: number; x: number } | null>(null)
let pending: { value: string; x: number } | null = null

function onPointerdown(event: PointerEvent, item: MlTabItem) {
  if (!props.reorderable || item.disabled || event.button !== 0 || event.pointerType === 'touch') return
  pending = { value: item.value, x: event.clientX }
  window.addEventListener('pointermove', onPointermove)
  window.addEventListener('pointerup', onPointerup)
  window.addEventListener('pointercancel', cancelDrag)
}

function onPointermove(event: PointerEvent) {
  if (!pending) return
  // A few pixels of travel before it counts as a drag, so clicks still select.
  if (!drag.value && Math.abs(event.clientX - pending.x) < 5) return
  event.preventDefault()
  const view = list.value
  if (view) {
    // Nudge the strip when dragging past either edge.
    const r = view.getBoundingClientRect()
    if (event.clientX < r.left + 24) view.scrollLeft -= 12
    else if (event.clientX > r.right - 24) view.scrollLeft += 12
  }
  const boxes = props.items.map((item) => boxOf(item.value))
  const slot = tabDropSlot(
    boxes.map((el) => {
      const r = el?.getBoundingClientRect()
      return { left: r?.left ?? 0, width: r?.width ?? 0 }
    }),
    event.clientX,
  )
  const at = boxes[slot] ?? boxes[boxes.length - 1]
  const x = at ? (slot < boxes.length ? at.offsetLeft : at.offsetLeft + at.offsetWidth) : 0
  drag.value = { value: pending.value, slot, x }
}

function endDrag(commit: boolean) {
  window.removeEventListener('pointermove', onPointermove)
  window.removeEventListener('pointerup', onPointerup)
  window.removeEventListener('pointercancel', cancelDrag)
  const done = drag.value
  pending = null
  drag.value = null
  if (!commit || !done) return
  const values = props.items.map((i) => i.value)
  const order = dropTab(values, done.value, done.slot)
  if (order.every((v, i) => v === values[i])) return
  emit('reorder', order)
  const item = props.items.find((i) => i.value === done.value)
  announce.value = loc.value.sortable.moved(item?.label ?? done.value, order.indexOf(done.value) + 1, order.length)
}

const onPointerup = () => endDrag(true)
const cancelDrag = () => endDrag(false)

function tabEvents(item: MlTabItem) {
  return {
    click: () => select(item),
    keydown: (event: KeyboardEvent) => onKeydown(event, item),
    auxclick: (event: MouseEvent) => onAuxclick(event, item),
    mousedown: (event: MouseEvent) => onMousedown(event, item),
    pointerdown: (event: PointerEvent) => onPointerdown(event, item),
  }
}

let observer: ResizeObserver | undefined

onMounted(() => {
  sync()
  reveal()
  if (typeof ResizeObserver !== 'undefined' && list.value) {
    observer = new ResizeObserver(sync)
    observer.observe(list.value)
  }
  // Web fonts can change tab widths after first paint.
  document.fonts?.ready.then(sync)
})

onBeforeUnmount(() => {
  observer?.disconnect()
  endDrag(false)
})

watch(model, () =>
  nextTick(() => {
    sync()
    reveal()
  }),
)
watch(
  () => props.items,
  () =>
    nextTick(() => {
      sync()
      reveal()
    }),
  { deep: true },
)
</script>

<template>
  <div :class="['ml-tabs', `ml-tabs--${variant}`, { 'ml-tabs--addable': addable }]">
    <div :class="['ml-tabs__bar', { 'ml-tabs__bar--more-start': more.start, 'ml-tabs__bar--more-end': more.end }]">
      <div ref="list" role="tablist" class="ml-tabs__list" :aria-label="label" @scroll="checkOverflow">
        <template v-for="item in items" :key="item.value">
          <div
            v-if="isClosable(item)"
            role="presentation"
            :class="['ml-tabs__item', { 'ml-tabs__item--active': item.value === model }]"
          >
            <button
              :id="tabId(item.value)"
              :ref="(el) => setTabEl(item.value, el)"
              type="button"
              role="tab"
              :class="['ml-tabs__tab', { 'ml-tabs__tab--dragging': drag?.value === item.value }]"
              :aria-selected="item.value === model"
              :aria-controls="panelId(item.value)"
              :aria-keyshortcuts="shortcuts(item)"
              :tabindex="item.value === model ? 0 : -1"
              :disabled="item.disabled"
              v-on="tabEvents(item)"
            >
              <slot name="tab" :item="item" :active="item.value === model">{{ item.label }}</slot>
            </button>
            <button
              type="button"
              class="ml-tabs__close"
              tabindex="-1"
              :aria-label="loc.nav.closeTab(item.label)"
              :disabled="item.disabled"
              @click.stop="close(item)"
            >
              <MlIcon name="close" />
            </button>
          </div>
          <button
            v-else
            :id="tabId(item.value)"
            :ref="(el) => setTabEl(item.value, el)"
            type="button"
            role="tab"
            :class="['ml-tabs__tab', { 'ml-tabs__tab--dragging': drag?.value === item.value }]"
            :aria-selected="item.value === model"
            :aria-controls="panelId(item.value)"
            :aria-keyshortcuts="shortcuts(item)"
            :tabindex="item.value === model ? 0 : -1"
            :disabled="item.disabled"
            v-on="tabEvents(item)"
          >
            <slot name="tab" :item="item" :active="item.value === model">{{ item.label }}</slot>
          </button>
        </template>
        <span
          v-show="ink.ready"
          class="ml-tabs__ink"
          aria-hidden="true"
          :style="{ width: `${ink.width}px`, transform: `translateX(${ink.x}px)` }"
        />
        <span v-if="drag" class="ml-tabs__drop" aria-hidden="true" :style="{ transform: `translateX(${drag.x}px)` }" />
      </div>
      <button
        v-if="more.start"
        type="button"
        class="ml-tabs__scroll ml-tabs__scroll--prev"
        tabindex="-1"
        :aria-label="loc.nav.scrollTabsPrev"
        @click="page(-1)"
      >
        <MlIcon name="chevronLeft" />
      </button>
      <button
        v-if="more.end"
        type="button"
        class="ml-tabs__scroll ml-tabs__scroll--next"
        tabindex="-1"
        :aria-label="loc.nav.scrollTabsNext"
        @click="page(1)"
      >
        <MlIcon name="chevronRight" />
      </button>
      <button v-if="addable" type="button" class="ml-tabs__add" :aria-label="loc.nav.addTab" @click="emit('add')">
        <MlIcon name="plus" />
      </button>
      <span v-if="reorderable" class="ml-visually-hidden" aria-live="polite">{{ announce }}</span>
    </div>
    <template v-for="item in items" :key="item.value">
      <div
        v-if="$slots[item.value]"
        v-show="item.value === model"
        :id="panelId(item.value)"
        role="tabpanel"
        class="ml-tabs__panel"
        tabindex="0"
        :aria-labelledby="tabId(item.value)"
      >
        <slot :name="item.value" />
      </div>
    </template>
  </div>
</template>
