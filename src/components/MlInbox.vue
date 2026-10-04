<script setup lang="ts">
import { computed, nextTick, ref, useId, watch } from 'vue'
import MlAvatar from './MlAvatar.vue'
import MlCuteIcon from './MlCuteIcon.vue'
import MlEmpty from './MlEmpty.vue'
import MlIcon from './MlIcon.vue'
import { useLocale } from '../locale'
import { useOutsidePointer } from '../composables'
import { safeHref } from '../url'
import { useNow } from './use-now'
import { relativeTime, toIso, type MlTimeInput } from './relative-time'
import { tabMove } from './stickers'
import {
  INBOX_TABS,
  INBOX_TYPE_ICON,
  inboxBadge,
  inboxCounts,
  inboxDismiss,
  inboxFilter,
  inboxGroups,
  inboxMarkAllRead,
  inboxMarkRead,
  type MlInboxItem,
  type MlInboxTab,
} from './inbox'

const loc = useLocale()

const props = withDefaults(
  defineProps<{
    /** Render just the panel, in the flow (no bell, no popover). */
    inline?: boolean
    /** "Now" for relative times and the 今天 / 昨天 groups. Defaults to the clock. */
    now?: MlTimeInput
    /** Panel heading. */
    title?: string
    /** Popover position under the bell. */
    placement?: 'bottom-end' | 'bottom-start'
    /** Panel width: px number or any CSS length. */
    width?: number | string
    /** Height the list scrolls at. */
    maxHeight?: number | string
    /** Badge shows "99+" past this. */
    max?: number
    /** Close the popover after an item is chosen. */
    closeOnSelect?: boolean
  }>(),
  { inline: false, placement: 'bottom-end', width: 360, maxHeight: 420, max: 99, closeOnSelect: true },
)

const emit = defineEmits<{
  read: [id: MlInboxItem['id']]
  'read-all': []
  dismiss: [id: MlInboxItem['id']]
  select: [item: MlInboxItem]
}>()

const items = defineModel<MlInboxItem[]>('items', { default: () => [] })
const open = defineModel<boolean>('open', { default: false })
const tab = defineModel<MlInboxTab>('tab', { default: 'all' })

const uid = `ml-inbox-${useId()}`
const root = ref<HTMLElement>()
const bell = ref<HTMLButtonElement>()
const panel = ref<HTMLElement>()
const body = ref<HTMLElement>()
const tabsEl = ref<HTMLElement>()
const announce = ref('')
const now = useNow(() => props.now)

const length = (v: number | string) => (typeof v === 'number' ? `${v}px` : v)
const counts = computed(() => inboxCounts(items.value))
const groups = computed(() => inboxGroups(inboxFilter(items.value, tab.value), now.value))
const showPanel = computed(() => props.inline || open.value)
const time = (t: MlTimeInput) => relativeTime(t, now.value, loc.value.name, loc.value.relativeTime.justNow)

function say(text: string) {
  announce.value = announce.value === text ? `${text} ` : text
}

/* ── Opening / closing ── */
function mains() {
  return [...(body.value?.querySelectorAll<HTMLElement>('.ml-inbox__main') ?? [])]
}
function show() {
  open.value = true
}
function close(returnFocus = false) {
  if (!open.value) return
  open.value = false
  if (returnFocus) nextTick(() => bell.value?.focus())
}
const toggle = () => (open.value ? close() : show())

watch(open, (on) => {
  if (!on || props.inline) return
  nextTick(() => {
    const list = mains()
    ;(list.find((el) => el.closest('.ml-inbox__item--unread')) ?? list[0] ?? panel.value)?.focus()
  })
})

useOutsidePointer(root, () => !props.inline && open.value, () => close())

function onRootKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && !props.inline && open.value) {
    event.preventDefault()
    event.stopPropagation()
    close(true)
  }
}

/* ── Actions ── */
function markRead(item: MlInboxItem) {
  if (item.read) return
  items.value = inboxMarkRead(items.value, item.id)
  emit('read', item.id)
}

function onSelect(item: MlInboxItem) {
  markRead(item)
  emit('select', item)
  if (!props.inline && props.closeOnSelect) close(!safeHref(item.href))
}

function readAll() {
  if (!counts.value.unread) return
  items.value = inboxMarkAllRead(items.value)
  emit('read-all')
  say(loc.value.inbox.markedAll)
}

function dismiss(item: MlInboxItem) {
  const list = mains()
  const at = list.findIndex((el) => el.dataset.id === String(item.id))
  const nextId = (list[at + 1] ?? list[at - 1])?.dataset.id
  items.value = inboxDismiss(items.value, item.id)
  emit('dismiss', item.id)
  say(loc.value.inbox.dismissed(item.title))
  nextTick(() => {
    const target = mains().find((el) => el.dataset.id === nextId)
    ;(target ?? panel.value)?.focus()
  })
}

/* ── Keyboard ── */
function onTabsKeydown(event: KeyboardEvent) {
  const next = tabMove(INBOX_TABS.indexOf(tab.value), event.key, INBOX_TABS.length)
  if (next === null) return
  event.preventDefault()
  tab.value = INBOX_TABS[next]
  nextTick(() => tabsEl.value?.querySelector<HTMLElement>(`[data-tab="${INBOX_TABS[next]}"]`)?.focus())
}

function onListKeydown(event: KeyboardEvent) {
  const list = mains()
  if (!list.length) return
  const current = (event.target as Element).closest('.ml-inbox__item')?.querySelector<HTMLElement>('.ml-inbox__main')
  const at = current ? list.indexOf(current) : -1
  let next = -1
  if (event.key === 'ArrowDown') next = Math.min(list.length - 1, at + 1)
  else if (event.key === 'ArrowUp') next = Math.max(0, at - 1)
  else if (event.key === 'Home') next = 0
  else if (event.key === 'End') next = list.length - 1
  else if (event.key === 'Delete' && at >= 0) {
    event.preventDefault()
    const item = items.value.find((i) => String(i.id) === list[at].dataset.id)
    if (item) dismiss(item)
    return
  } else return
  event.preventDefault()
  list[next]?.focus()
}

defineExpose({ show, close, toggle })
</script>

<template>
  <div ref="root" :class="['ml-inbox', { 'ml-inbox--inline': inline, 'ml-inbox--open': !inline && open }]" @keydown="onRootKeydown">
    <button
      v-if="!inline"
      ref="bell"
      type="button"
      :class="['ml-inbox__bell', { 'ml-inbox__bell--unread': counts.unread > 0 }]"
      :aria-label="loc.inbox.open(counts.unread)"
      aria-haspopup="dialog"
      :aria-expanded="open ? 'true' : 'false'"
      :aria-controls="open ? `${uid}-panel` : undefined"
      @click="toggle"
    >
      <MlIcon name="bell" class="ml-inbox__bell-icon" />
      <span v-if="counts.unread" class="ml-inbox__badge" aria-hidden="true">{{ inboxBadge(counts.unread, max) }}</span>
    </button>
    <div
      v-if="showPanel"
      :id="`${uid}-panel`"
      ref="panel"
      :class="['ml-inbox__panel', !inline && `ml-inbox__panel--${placement}`]"
      :role="inline ? 'region' : 'dialog'"
      :aria-labelledby="`${uid}-title`"
      tabindex="-1"
      :style="{ '--_ib-w': length(width), '--_ib-h': length(maxHeight) }"
    >
      <header class="ml-inbox__head">
        <h2 :id="`${uid}-title`" class="ml-inbox__title">{{ title ?? loc.inbox.label }}</h2>
        <button type="button" class="ml-inbox__read-all" :disabled="!counts.unread" @click="readAll">{{ loc.inbox.readAll }}</button>
      </header>
      <div ref="tabsEl" class="ml-inbox__tabs" role="tablist" :aria-label="title ?? loc.inbox.label" @keydown="onTabsKeydown">
        <button
          v-for="t in INBOX_TABS"
          :id="`${uid}-tab-${t}`"
          :key="t"
          type="button"
          role="tab"
          :data-tab="t"
          :class="['ml-inbox__tab', { 'ml-inbox__tab--active': t === tab }]"
          :aria-selected="t === tab ? 'true' : 'false'"
          :aria-controls="`${uid}-body`"
          :tabindex="t === tab ? 0 : -1"
          @click="tab = t"
        >
          <span class="ml-inbox__tab-label">{{ loc.inbox.tabs[t] }}</span>
          <span class="ml-inbox__count">{{ counts[t] }}</span>
        </button>
      </div>
      <div :id="`${uid}-body`" ref="body" class="ml-inbox__body" role="tabpanel" :aria-labelledby="`${uid}-tab-${tab}`" @keydown="onListKeydown">
        <template v-if="groups.length">
          <section v-for="g in groups" :key="g.id" class="ml-inbox__group" :aria-labelledby="`${uid}-g-${g.id}`">
            <h3 :id="`${uid}-g-${g.id}`" class="ml-inbox__group-title">{{ loc.inbox.groups[g.id] }}</h3>
            <ul class="ml-inbox__list">
              <li
                v-for="item in g.items"
                :key="item.id"
                :class="['ml-inbox__item', `ml-inbox__item--${item.type ?? 'info'}`, { 'ml-inbox__item--unread': !item.read }]"
              >
                <component
                  :is="safeHref(item.href) ? 'a' : 'button'"
                  :href="safeHref(item.href)"
                  :type="safeHref(item.href) ? undefined : 'button'"
                  class="ml-inbox__main"
                  :data-id="String(item.id)"
                  @click="onSelect(item)"
                >
                  <MlAvatar v-if="item.avatar" class="ml-inbox__avatar" size="sm" ring="steel" :src="item.avatar" />
                  <span v-else class="ml-inbox__icon" role="img" :aria-label="loc.inbox.types[item.type ?? 'info']">
                    <MlCuteIcon :name="INBOX_TYPE_ICON[item.type ?? 'info']" />
                  </span>
                  <span class="ml-inbox__text">
                    <span class="ml-inbox__item-title">{{ item.title }}</span>
                    <span v-if="item.body" class="ml-inbox__item-body">{{ item.body }}</span>
                    <time class="ml-inbox__time" :datetime="toIso(item.time)">{{ time(item.time) }}</time>
                  </span>
                  <span v-if="!item.read" class="ml-inbox__dot"><span class="ml-visually-hidden">{{ loc.inbox.unread }}</span></span>
                </component>
                <button type="button" class="ml-inbox__dismiss" :aria-label="loc.inbox.dismiss(item.title)" :title="loc.inbox.dismiss(item.title)" @click="dismiss(item)">
                  <MlIcon name="close" />
                </button>
              </li>
            </ul>
          </section>
        </template>
        <MlEmpty v-else size="sm" :title="loc.inbox.empty[tab]" />
      </div>
      <p class="ml-visually-hidden" aria-live="polite">{{ announce }}</p>
    </div>
  </div>
</template>
