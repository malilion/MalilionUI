<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'
import MlCuteIcon from './MlCuteIcon.vue'
import MlIcon from './MlIcon.vue'
import { useLocale } from '../locale'
import type { CuteIconName, MlCuteIconVariant } from './cute-icons'
import {
  STICKER_TAB_ICONS,
  STICKER_TABS,
  OFFSCREEN,
  gridMove,
  popupPosition,
  loadRecent,
  pushRecent,
  saveRecent,
  searchStickers,
  stickerGroup,
  tabMove,
  type StickerGroupId,
} from './stickers'

const loc = useLocale()

const props = withDefaults(
  defineProps<{
    /** How the stickers are drawn. */
    variant?: MlCuteIconVariant
    /** Sticker size in px. */
    size?: number
    /** Stickers per row (arrow keys move by this much up and down). */
    columns?: number
    /** Show a button that opens the picker in a popover (e.g. beside a chat input). */
    trigger?: boolean
    /** Popover side, trigger mode only. */
    placement?: 'top' | 'bottom'
    /** Popover edge lined up with the button, trigger mode only. */
    align?: 'start' | 'end'
    /** The sticker on the trigger button. */
    triggerIcon?: CuteIconName
    /** Show the "recent" tab. */
    recent?: boolean
    /** How many recent stickers to keep. */
    recentLimit?: number
    /** Remember recent stickers in localStorage under this key. */
    storageKey?: string
    /** Close the popover after picking (trigger mode). */
    closeOnSelect?: boolean
    disabled?: boolean
    label?: string
  }>(),
  {
    variant: 'color',
    size: 32,
    columns: 6,
    trigger: false,
    placement: 'top',
    align: 'start',
    triggerIcon: 'lion',
    recent: true,
    recentLimit: 16,
    closeOnSelect: true,
    disabled: false,
  },
)

const emit = defineEmits<{ select: [name: CuteIconName] }>()
const open = defineModel<boolean>('open', { default: false })

const panelId = `ml-sticker-${useId()}`
const root = ref<HTMLElement>()
const triggerEl = ref<HTMLButtonElement>()
const inputEl = ref<HTMLInputElement>()
const gridEl = ref<HTMLElement>()
const tabsEl = ref<HTMLElement>()
const panel = ref<HTMLElement>()
const pos = ref<{ left: string; top: string } | undefined>()
const side = ref<'top' | 'bottom'>(props.placement)

const tab = ref<StickerGroupId>('animals')
const query = ref('')
const recentList = ref<CuteIconName[]>([])
const focusIdx = ref(0)
const announce = ref('')

const tabs = computed(() => (props.recent ? STICKER_TABS : STICKER_TABS.filter((t) => t !== 'recent')))
const searching = computed(() => query.value.trim() !== '')
const names = computed(() => (searching.value ? searchStickers(query.value, loc.value.sticker.names) : stickerGroup(tab.value, recentList.value)))
const tabLabel = (t: StickerGroupId) => (t === 'recent' ? loc.value.sticker.recent : loc.value.sticker.groups[t])
const heading = computed(() => (searching.value ? loc.value.sticker.results(names.value.length) : tabLabel(tab.value)))
const empty = computed(() => (searching.value ? loc.value.sticker.noMatch : loc.value.sticker.noRecent))
const showPanel = computed(() => !props.trigger || open.value)

onMounted(() => {
  if (props.storageKey) recentList.value = loadRecent(props.storageKey).slice(0, props.recentLimit)
})

watch(names, () => (focusIdx.value = 0))
watch(query, () => (announce.value = searching.value ? loc.value.sticker.results(names.value.length) : ''))

function focusItem(i: number) {
  focusIdx.value = i
  nextTick(() => gridEl.value?.querySelector<HTMLElement>(`[data-index="${i}"]`)?.focus())
}

function selectTab(t: StickerGroupId) {
  tab.value = t
  query.value = ''
}

function pick(name: CuteIconName) {
  recentList.value = pushRecent(recentList.value, name, props.recentLimit)
  saveRecent(props.storageKey, recentList.value)
  emit('select', name)
  if (props.trigger && props.closeOnSelect) close(true)
}

function onGridKeydown(event: KeyboardEvent) {
  const next = gridMove(focusIdx.value, event.key, names.value.length, props.columns)
  if (next === null) return
  event.preventDefault()
  focusItem(next)
}

function onTabsKeydown(event: KeyboardEvent) {
  const i = tabs.value.indexOf(tab.value)
  const next = tabMove(i, event.key, tabs.value.length)
  if (next === null) return
  event.preventDefault()
  selectTab(tabs.value[next])
  nextTick(() => tabsEl.value?.querySelector<HTMLElement>(`[data-tab="${tabs.value[next]}"]`)?.focus())
}

function onSearchKeydown(event: KeyboardEvent) {
  if (event.key === 'ArrowDown' && names.value.length) {
    event.preventDefault()
    focusItem(0)
  } else if (event.key === 'Enter' && searching.value && names.value.length && !event.isComposing) {
    event.preventDefault()
    pick(names.value[0])
  }
}

/* ── Trigger mode: the panel is portalled to <body> and placed with fixed coordinates ── */
function place() {
  const t = triggerEl.value
  const p = panel.value
  if (!t || !p) return
  const at = popupPosition(
    t.getBoundingClientRect(),
    { width: p.offsetWidth, height: p.offsetHeight },
    { width: window.innerWidth, height: window.innerHeight },
    props.placement,
    props.align,
  )
  side.value = at.placement
  pos.value = { left: `${at.left}px`, top: `${at.top}px` }
}

function onOutside(event: Event) {
  const target = event.target as Node
  if (!root.value?.contains(target) && !panel.value?.contains(target)) close()
}

function listen(on: boolean) {
  if (typeof window === 'undefined') return
  if (on) {
    document.addEventListener('pointerdown', onOutside)
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
  } else {
    document.removeEventListener('pointerdown', onOutside)
    window.removeEventListener('resize', place)
    window.removeEventListener('scroll', place, true)
  }
}

watch(
  () => props.trigger && open.value,
  (on) => {
    listen(on)
    if (on) nextTick(place)
  },
)
onMounted(() => {
  if (props.trigger && open.value) {
    listen(true)
    place()
  }
})
onBeforeUnmount(() => listen(false))

function show() {
  if (props.disabled) return
  open.value = true
  nextTick(() => inputEl.value?.focus({ preventScroll: true }))
}
function close(returnFocus = false) {
  if (!open.value) return
  open.value = false
  if (returnFocus) triggerEl.value?.focus()
}
const toggle = () => (open.value ? close() : show())

function onRootKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && props.trigger && open.value) {
    event.preventDefault()
    event.stopPropagation()
    close(true)
  }
}

defineExpose({ show, close, focus: () => (props.trigger ? triggerEl.value?.focus() : inputEl.value?.focus()) })
</script>

<template>
  <component
    :is="trigger ? 'span' : 'div'"
    ref="root"
    :class="['ml-sticker-picker', { 'ml-sticker-picker--trigger': trigger, 'ml-sticker-picker--open': trigger && open }]"
    :style="{ '--_sp-cols': columns, '--_sp-size': `${size}px` }"
    @keydown="onRootKeydown"
  >
    <button
      v-if="trigger"
      ref="triggerEl"
      type="button"
      class="ml-sticker-picker__trigger"
      :aria-label="loc.sticker.open"
      :aria-expanded="open ? 'true' : 'false'"
      aria-haspopup="dialog"
      :aria-controls="open ? panelId : undefined"
      :disabled="disabled"
      @click="toggle"
    >
      <MlCuteIcon :name="triggerIcon" :variant="variant" />
    </button>
    <Teleport to="body" :disabled="!trigger">
    <div
      v-if="showPanel"
      :id="panelId"
      ref="panel"
      :class="['ml-sticker-picker__panel', trigger && 'ml-sticker-picker__panel--popup', trigger && `ml-sticker-picker__panel--${side}`]"
      :style="[{ '--_sp-cols': columns, '--_sp-size': `${size}px` }, trigger ? (pos ?? OFFSCREEN) : undefined]"
      :role="trigger ? 'dialog' : 'group'"
      :aria-label="label ?? loc.sticker.label"
      @keydown="onRootKeydown"
    >
      <label class="ml-sticker-picker__search">
        <MlIcon name="search" class="ml-sticker-picker__search-icon" />
        <input
          ref="inputEl"
          v-model="query"
          type="search"
          class="ml-sticker-picker__input"
          :placeholder="loc.sticker.search"
          :aria-label="loc.sticker.search"
          autocomplete="off"
          @keydown="onSearchKeydown"
        />
      </label>
      <div ref="tabsEl" class="ml-sticker-picker__tabs" role="tablist" :aria-label="label ?? loc.sticker.label" @keydown="onTabsKeydown">
        <button
          v-for="t in tabs"
          :id="`${panelId}-tab-${t}`"
          :key="t"
          type="button"
          role="tab"
          :data-tab="t"
          :class="['ml-sticker-picker__tab', { 'ml-sticker-picker__tab--active': t === tab && !searching }]"
          :aria-selected="t === tab ? 'true' : 'false'"
          :aria-controls="`${panelId}-body`"
          :tabindex="t === tab ? 0 : -1"
          :title="tabLabel(t)"
          @click="selectTab(t)"
        >
          <MlIcon v-if="t === 'recent'" name="clock" class="ml-sticker-picker__tab-icon" />
          <MlCuteIcon v-else :name="STICKER_TAB_ICONS[t]" :variant="variant" class="ml-sticker-picker__tab-icon" />
          <span class="ml-visually-hidden">{{ tabLabel(t) }}</span>
        </button>
      </div>
      <div :id="`${panelId}-body`" class="ml-sticker-picker__body" role="tabpanel" :aria-labelledby="`${panelId}-tab-${tab}`">
        <p class="ml-sticker-picker__heading" aria-hidden="true">{{ heading }}</p>
        <div v-if="names.length" ref="gridEl" class="ml-sticker-picker__grid" role="group" :aria-label="heading" @keydown="onGridKeydown">
          <button
            v-for="(n, i) in names"
            :key="n"
            type="button"
            class="ml-sticker-picker__item"
            :data-index="i"
            :data-name="n"
            :tabindex="i === focusIdx ? 0 : -1"
            :aria-label="loc.sticker.names[n]"
            :title="loc.sticker.names[n]"
            @click="pick(n)"
            @focus="focusIdx = i"
          >
            <MlCuteIcon :name="n" :variant="variant" />
          </button>
        </div>
        <p v-else class="ml-sticker-picker__empty">{{ empty }}</p>
      </div>
      <p class="ml-visually-hidden" aria-live="polite">{{ announce }}</p>
    </div>
    </Teleport>
  </component>
</template>
