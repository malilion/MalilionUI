<script setup lang="ts" generic="T extends MlIndexBarItem">
import { computed, nextTick, ref, watch } from 'vue'
import { activeGroup, groupIndexItems, itemKey, railKeyAt, railKeys } from './index-bar'
import { useLocale } from '../locale'
import type { MlIndexBarItem } from '../types'
import type { MlIndexMode } from '../zhuyin'

const loc = useLocale()

const props = withDefaults(
  defineProps<{
    items?: T[]
    /** zhuyin: ㄅㄆㄇ for Chinese (by 注音 collation), then A–Z. alphabet: A–Z, Chinese by pinyin. */
    mode?: MlIndexMode
    /** The rail's keys, in order. Default: only the indexes that have items. */
    indexes?: string[]
    /** Sort each group like a phone book. false keeps your order. */
    sort?: boolean
    /** Height of the scrolling list. Numbers are pixels. */
    height?: number | string
    /** Group headers stick to the top while their group scrolls past. */
    sticky?: boolean
    /** Accessible name of the rail. Default "索引". */
    label?: string
  }>(),
  { items: () => [], mode: 'zhuyin', sort: true, height: 420, sticky: true },
)
const emit = defineEmits<{ change: [index: string]; 'item-click': [item: T] }>()
defineSlots<{
  item?: (props: { item: T; index: string }) => unknown
  header?: (props: { index: string }) => unknown
  empty?: () => unknown
}>()

const groups = computed(() => groupIndexItems(props.items, props.mode, props.sort, props.indexes))
const keys = computed(() => railKeys(groups.value, props.indexes))
const present = computed(() => new Set(groups.value.map((g) => g.key)))
const active = ref(groups.value[0]?.key ?? '')
watch(groups, (g) => {
  if (!g.some((x) => x.key === active.value)) active.value = g[0]?.key ?? ''
})

const list = ref<HTMLElement>()
const rail = ref<HTMLElement>()
const dragging = ref(false)

function setActive(key: string) {
  if (key === active.value) return
  active.value = key
  emit('change', key)
}

function onScroll() {
  const el = list.value
  if (!el) return
  const sections = [...el.querySelectorAll<HTMLElement>('.ml-indexbar__group')]
  if (!sections.length) return
  setActive(groups.value[activeGroup(sections.map((s) => s.offsetTop), el.scrollTop)]?.key ?? active.value)
}

/** Scroll the list so a group's header sits at the top. Keys without items do nothing. */
function jump(key: string) {
  const el = list.value
  const section = [...(el?.querySelectorAll<HTMLElement>('.ml-indexbar__group') ?? [])].find((s) => s.dataset.index === key)
  if (!el || !section) return
  el.scrollTop = section.offsetTop
  setActive(key)
}

function pick(clientY: number) {
  const buttons = [...(rail.value?.querySelectorAll<HTMLElement>('.ml-indexbar__key:not(:disabled)') ?? [])]
  if (!buttons.length) return
  const centers = buttons.map((b) => {
    const r = b.getBoundingClientRect()
    return r.top + r.height / 2
  })
  const key = buttons[railKeyAt(centers, clientY)].dataset.key
  if (key) jump(key)
  return key
}

// No pointer capture: a finger already stays with the rail, and capturing would
// send the click that ends a drag to the <nav>, where it bubbles out as a click
// on nothing. Instead the click that ends a drag onto another key is dropped.
let downKey: string | undefined
let draggedAway = false

function onPointerDown(event: PointerEvent) {
  if (event.button !== 0) return
  event.preventDefault()
  dragging.value = true
  draggedAway = false
  downKey = pick(event.clientY)
}
function onPointerMove(event: PointerEvent) {
  if (dragging.value && pick(event.clientY) !== downKey) draggedAway = true
}
function onPointerUp() {
  dragging.value = false
}

function onKeyClick(key: string) {
  if (draggedAway) draggedAway = false
  else jump(key)
}

/** A mouse drag between keys clicks the rail itself; keep that click from reaching outer handlers. */
function onRailClick(event: MouseEvent) {
  if (event.target !== event.currentTarget) return
  draggedAway = false
  event.stopPropagation()
}

function onKeydown(event: KeyboardEvent) {
  const usable = keys.value.filter((k) => present.value.has(k))
  const i = usable.indexOf(active.value)
  const next =
    event.key === 'ArrowDown' ? usable[Math.min(usable.length - 1, i + 1)]
    : event.key === 'ArrowUp' ? usable[Math.max(0, i - 1)]
    : event.key === 'Home' ? usable[0]
    : event.key === 'End' ? usable[usable.length - 1]
    : undefined
  if (next === undefined) return
  event.preventDefault()
  jump(next)
  nextTick(() => [...(rail.value?.querySelectorAll<HTMLElement>('.ml-indexbar__key') ?? [])].find((b) => b.dataset.key === next)?.focus())
}

defineExpose({ jump })
</script>

<template>
  <div
    :class="['ml-indexbar', { 'ml-indexbar--sticky': sticky, 'ml-indexbar--dragging': dragging }]"
    :style="{ '--ml-indexbar-h': typeof height === 'number' ? `${height}px` : height }"
  >
    <div ref="list" class="ml-indexbar__list" tabindex="0" @scroll.passive="onScroll">
      <section v-for="group in groups" :key="group.key" class="ml-indexbar__group" :data-index="group.key">
        <div class="ml-indexbar__header" role="heading" aria-level="3">
          <slot name="header" :index="group.key">{{ group.key }}</slot>
        </div>
        <ul class="ml-indexbar__items">
          <li v-for="(item, i) in group.items" :key="itemKey(item, i)" class="ml-indexbar__row">
            <slot name="item" :item="item" :index="group.key">
              <button type="button" class="ml-indexbar__item" @click="emit('item-click', item)">
                <span class="ml-indexbar__label">{{ item.label }}</span>
                <span v-if="item.desc" class="ml-indexbar__desc">{{ item.desc }}</span>
              </button>
            </slot>
          </li>
        </ul>
      </section>
      <p v-if="!groups.length" class="ml-indexbar__empty"><slot name="empty">{{ loc.indexBar.empty }}</slot></p>
    </div>
    <nav
      v-if="groups.length"
      ref="rail"
      class="ml-indexbar__rail"
      :aria-label="label ?? loc.indexBar.label"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
      @pointerleave="onPointerUp"
      @keydown="onKeydown"
      @click="onRailClick"
    >
      <button
        v-for="key in keys"
        :key="key"
        type="button"
        :class="['ml-indexbar__key', { 'ml-indexbar__key--active': key === active, 'ml-indexbar__key--empty': !present.has(key) }]"
        :data-key="key"
        :aria-label="loc.indexBar.jump(key)"
        :aria-current="key === active ? 'true' : undefined"
        :disabled="!present.has(key)"
        :tabindex="key === active ? 0 : -1"
        @click="onKeyClick(key)"
      >
        {{ key }}
      </button>
    </nav>
    <span v-if="dragging && active" class="ml-indexbar__bubble" aria-hidden="true">{{ active }}</span>
  </div>
</template>
