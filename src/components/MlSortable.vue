<script setup lang="ts" generic="Item">
import { computed, markRaw, onBeforeUnmount, onMounted, ref, useId } from 'vue'
import { dragState, sortables, type SortableInstance } from './sortable'
import { useLocale } from '../locale'

const loc = useLocale()

const props = withDefaults(
  defineProps<{
    /** Field name or function giving each item a stable key. */
    itemKey?: string | ((item: Item) => string | number)
    /** Lists sharing a group name can pass items between each other. */
    group?: string
    /** Drag only by the grip on each row (otherwise the whole row). */
    handle?: boolean
    direction?: 'vertical' | 'horizontal'
    /** Most items this list accepts from other lists. */
    max?: number
    disabled?: boolean
    /** Text for screen-reader announcements; defaults to the key. */
    itemLabel?: (item: Item) => string
    tag?: string
  }>(),
  { itemKey: 'id', direction: 'vertical', tag: 'ul' },
)

const emit = defineEmits<{
  change: [event: { item: Item; from: string; to: string; oldIndex: number; newIndex: number }]
}>()

const items = defineModel<Item[]>({ default: () => [] })
const root = ref<HTMLElement>()
const listId = `ml-sortable-${useId()}`
const announce = ref('')

const keyOf = (item: Item): string | number =>
  typeof props.itemKey === 'function' ? props.itemKey(item) : ((item as Record<string, unknown>)[props.itemKey] as string | number)
const labelOf = (item: Item) => (props.itemLabel ? props.itemLabel(item) : String(keyOf(item)))

const self: SortableInstance = markRaw({
  id: listId,
  group: () => props.group ?? listId,
  items: () => items.value as unknown[],
  setItems: (next) => (items.value = next as Item[]),
  max: () => props.max,
  root: () => root.value,
  vertical: () => props.direction === 'vertical',
})

onMounted(() => sortables.add(self))
onBeforeUnmount(() => sortables.delete(self))

const isSource = computed(() => dragState.active && dragState.source === self)
const isTarget = computed(() => dragState.active && dragState.target === self)
const draggingKey = computed(() => (isSource.value ? keyOf(dragState.item as Item) : undefined))

/** Rows rendered, with the placeholder slotted in where the item would land. */
const rows = computed(() => {
  const list = items.value.filter((it) => !(isSource.value && keyOf(it) === draggingKey.value))
  const out: ({ kind: 'item'; item: Item; index: number } | { kind: 'placeholder' })[] = list.map((item) => ({
    kind: 'item',
    item,
    index: items.value.indexOf(item),
  }))
  if (isTarget.value) out.splice(Math.min(dragState.targetIndex, out.length), 0, { kind: 'placeholder' })
  return out
})

/* ── Pointer dragging (mouse, pen, touch) ── */
let ghost: HTMLElement | null = null
let pending: { x: number; y: number; item: Item; el: HTMLElement; pointerId: number } | null = null

function onPointerDown(event: PointerEvent, item: Item) {
  if (props.disabled || event.button !== 0) return
  const target = event.target as HTMLElement
  if (props.handle && !target.closest('.ml-sortable__handle')) return
  if (!props.handle && target.closest('input, textarea, select, button, a, [contenteditable]')) return
  const el = (event.currentTarget as HTMLElement)
  pending = { x: event.clientX, y: event.clientY, item, el, pointerId: event.pointerId }
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp, { once: true })
  window.addEventListener('pointercancel', cancelPointer, { once: true })
}

function start(event: PointerEvent) {
  if (!pending) return
  const { el, item } = pending
  const rect = el.getBoundingClientRect()
  ghost = el.cloneNode(true) as HTMLElement
  ghost.classList.add('ml-sortable__ghost')
  Object.assign(ghost.style, { width: `${rect.width}px`, height: `${rect.height}px`, left: `${rect.left}px`, top: `${rect.top}px` })
  document.body.appendChild(ghost)
  Object.assign(dragState, {
    active: true,
    item,
    source: self,
    sourceIndex: items.value.indexOf(item),
    target: self,
    targetIndex: items.value.indexOf(item),
    offsetX: pending.x - rect.left,
    offsetY: pending.y - rect.top,
  })
  document.documentElement.classList.add('ml-sortable-dragging')
  move(event)
}

function move(event: PointerEvent) {
  if (ghost) {
    ghost.style.left = `${event.clientX - dragState.offsetX}px`
    ghost.style.top = `${event.clientY - dragState.offsetY}px`
  }
  // Which list is under the pointer? Only lists in the same group count.
  const hit = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-ml-sortable]')
  const over = hit ? [...sortables].find((s) => s.root() === hit && s.group() === self.group()) : undefined
  if (!over) return
  const full = over !== dragState.source && over.max() !== undefined && over.items().length >= over.max()!
  if (full) {
    dragState.target = null
    return
  }
  // Insertion index: the first row whose midpoint is past the pointer.
  const rowsEls = [...over.root()!.querySelectorAll<HTMLElement>(':scope > .ml-sortable__item')]
  const pos = over.vertical() ? event.clientY : event.clientX
  let index = rowsEls.length
  for (let i = 0; i < rowsEls.length; i++) {
    const r = rowsEls[i].getBoundingClientRect()
    const mid = over.vertical() ? r.top + r.height / 2 : r.left + r.width / 2
    if (pos < mid) {
      index = i
      break
    }
  }
  dragState.target = over
  dragState.targetIndex = index
}

function onPointerMove(event: PointerEvent) {
  if (pending && !dragState.active) {
    // A few pixels of travel before it counts as a drag, so clicks still work.
    if (Math.hypot(event.clientX - pending.x, event.clientY - pending.y) < 5) return
    start(event)
  }
  if (dragState.active && dragState.source === self) {
    event.preventDefault()
    move(event)
  }
}

function finish(commit: boolean) {
  window.removeEventListener('pointermove', onPointerMove)
  ghost?.remove()
  ghost = null
  pending = null
  document.documentElement.classList.remove('ml-sortable-dragging')
  if (!dragState.active) return
  // The pointerup that ends a drag would also fire a click on whatever is under
  // it (a card, a row, the page); swallow that one click.
  const swallow = (event: MouseEvent) => {
    event.stopPropagation()
    event.preventDefault()
  }
  window.addEventListener('click', swallow, { capture: true, once: true })
  setTimeout(() => window.removeEventListener('click', swallow, { capture: true }), 0)
  const { source, target, item, sourceIndex, targetIndex } = dragState
  Object.assign(dragState, { active: false, item: null, source: null, target: null, sourceIndex: -1, targetIndex: -1 })
  if (!commit || !source || !target) return
  if (source === target) {
    const next = source.items().filter((it) => it !== item)
    next.splice(targetIndex, 0, item)
    if (next.indexOf(item) === sourceIndex) return
    source.setItems(next)
  } else {
    source.setItems(source.items().filter((it) => it !== item))
    const next = [...target.items()]
    next.splice(targetIndex, 0, item)
    target.setItems(next)
  }
  emit('change', { item: item as Item, from: source.id, to: target.id, oldIndex: sourceIndex, newIndex: targetIndex })
  announce.value = loc.value.sortable.moved(labelOf(item as Item), targetIndex + 1, target.items().length)
}

function onPointerUp() {
  window.removeEventListener('pointercancel', cancelPointer)
  finish(true)
}

function cancelPointer() {
  window.removeEventListener('pointerup', onPointerUp)
  finish(false)
}

onBeforeUnmount(() => {
  if (dragState.source === self) finish(false)
  window.removeEventListener('pointermove', onPointerMove)
})

/* ── Keyboard: Space picks up, arrows move, Space drops, Esc cancels ── */
const grabbed = ref<string | number | null>(null)
let snapshot: Item[] = []

async function onHandleKeydown(event: KeyboardEvent, item: Item) {
  if (props.disabled) return
  const key = keyOf(item)
  const back = props.direction === 'vertical' ? 'ArrowUp' : 'ArrowLeft'
  const fwd = props.direction === 'vertical' ? 'ArrowDown' : 'ArrowRight'
  if (event.key === ' ' || event.key === 'Enter') {
    event.preventDefault()
    if (grabbed.value === key) {
      grabbed.value = null
      announce.value = loc.value.sortable.dropped
      const from = snapshot.indexOf(item)
      const to = items.value.indexOf(item)
      if (from !== to) emit('change', { item, from: listId, to: listId, oldIndex: from, newIndex: to })
    } else {
      grabbed.value = key
      snapshot = [...items.value]
      announce.value = loc.value.sortable.grabbed(labelOf(item))
    }
  } else if (grabbed.value === key && (event.key === back || event.key === fwd)) {
    event.preventDefault()
    const from = items.value.indexOf(item)
    const to = from + (event.key === fwd ? 1 : -1)
    if (to < 0 || to >= items.value.length) return
    const next = [...items.value]
    next.splice(from, 1)
    next.splice(to, 0, item)
    items.value = next
    announce.value = loc.value.sortable.moved(labelOf(item), to + 1, next.length)
    // Keep focus on the moved row's handle after re-render.
    const handle = event.currentTarget as HTMLElement
    requestAnimationFrame(() => handle.focus())
  } else if (event.key === 'Escape' && grabbed.value === key) {
    event.preventDefault()
    items.value = snapshot
    grabbed.value = null
  }
}
</script>

<template>
  <component
    :is="tag"
    ref="root"
    :class="[
      'ml-sortable',
      `ml-sortable--${direction}`,
      { 'ml-sortable--target': isTarget, 'ml-sortable--disabled': disabled, 'ml-sortable--handle': handle },
    ]"
    data-ml-sortable
  >
    <template v-for="row in rows" :key="row.kind === 'item' ? keyOf(row.item) : '__placeholder'">
      <li v-if="row.kind === 'placeholder'" class="ml-sortable__placeholder" aria-hidden="true" />
      <li
        v-else
        :class="['ml-sortable__item', { 'ml-sortable__item--grabbed': grabbed === keyOf(row.item) }]"
        @pointerdown="onPointerDown($event, row.item)"
      >
        <button
          v-if="handle"
          type="button"
          class="ml-sortable__handle"
          :aria-label="loc.sortable.handle"
          :aria-pressed="grabbed === keyOf(row.item)"
          :aria-describedby="`${listId}-live`"
          :disabled="disabled"
          @keydown="onHandleKeydown($event, row.item)"
        >
          <svg viewBox="0 0 10 16" aria-hidden="true"><circle cx="3" cy="3" r="1.4" /><circle cx="7" cy="3" r="1.4" /><circle cx="3" cy="8" r="1.4" /><circle cx="7" cy="8" r="1.4" /><circle cx="3" cy="13" r="1.4" /><circle cx="7" cy="13" r="1.4" /></svg>
        </button>
        <div class="ml-sortable__content"><slot :item="row.item" :index="row.index" /></div>
      </li>
    </template>
    <li v-if="!rows.length" class="ml-sortable__empty"><slot name="empty" /></li>
    <li :id="`${listId}-live`" class="ml-visually-hidden" aria-live="assertive">{{ announce }}</li>
  </component>
</template>
