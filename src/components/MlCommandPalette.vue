<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'
import MlIcon from './MlIcon.vue'
import MlKbd from './MlKbd.vue'
import MlPaw from './MlPaw.vue'
import { useScrollLock } from '../composables'
import type { MlCommandItem } from '../types'
import { useLocale } from '../locale'

const loc = useLocale()

const props = withDefaults(
  defineProps<{
    items: MlCommandItem[]
    placeholder?: string
    /** Global shortcut that toggles the palette; "mod" is ⌘ on Mac, Ctrl elsewhere. null disables it. */
    shortcut?: string | null
    /** Shown when nothing matches. */
    emptyText?: string
    /** Most results shown at once. */
    limit?: number
  }>(),
  { shortcut: 'mod+k', limit: 50 },
)

const emit = defineEmits<{ select: [item: MlCommandItem] }>()
const open = defineModel<boolean>('open', { default: false })

const query = ref('')
const active = ref(0)
const input = ref<HTMLInputElement>()
const listEl = ref<HTMLElement>()
const uid = `ml-cmd-${useId()}`
const scrollLock = useScrollLock()
let returnFocusTo: HTMLElement | null = null

/**
 * Subsequence match: every typed character must appear in order. Returns the
 * matched character positions (for highlighting) and a score that prefers
 * consecutive runs and matches at word starts — or null when it doesn't match.
 */
function fuzzy(text: string, q: string): { score: number; hits: number[] } | null {
  const lower = text.toLowerCase()
  const hits: number[] = []
  let score = 0
  let from = 0
  for (const ch of q.toLowerCase()) {
    if (ch === ' ') continue
    const at = lower.indexOf(ch, from)
    if (at === -1) return null
    const prev = hits[hits.length - 1]
    score += at === prev + 1 ? 5 : 1
    if (at === 0 || /[\s\-_/.]/.test(lower[at - 1])) score += 3
    hits.push(at)
    from = at + 1
  }
  return { score: score - lower.length * 0.01, hits }
}

const results = computed(() => {
  const q = query.value.trim()
  const scored = props.items.flatMap((item) => {
    if (!q) return [{ item, hits: [] as number[], score: 0 }]
    const onLabel = fuzzy(item.label, q)
    const onKeywords = (item.keywords ?? []).some((k) => fuzzy(k, q)) ? { score: 0.5, hits: [] } : null
    const best = onLabel ?? onKeywords
    return best ? [{ item, hits: best.hits, score: best.score }] : []
  })
  if (q) scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, props.limit)
})

/** Results grouped for display, keeping a flat index for keyboard movement. */
const sections = computed(() => {
  const groups = new Map<string, { item: MlCommandItem; hits: number[]; index: number }[]>()
  results.value.forEach((r, index) => {
    const name = query.value.trim() ? '' : r.item.group ?? ''
    if (!groups.has(name)) groups.set(name, [])
    groups.get(name)!.push({ ...r, index })
  })
  return [...groups.entries()].map(([name, rows]) => ({ name, rows }))
})

function parts(label: string, hits: number[]) {
  const set = new Set(hits)
  const out: { text: string; hit: boolean }[] = []
  for (let i = 0; i < label.length; i++) {
    const hit = set.has(i)
    const last = out[out.length - 1]
    if (last && last.hit === hit) last.text += label[i]
    else out.push({ text: label[i], hit })
  }
  return out
}

function step(delta: 1 | -1) {
  const list = results.value
  if (!list.length) return
  for (let i = 1; i <= list.length; i++) {
    const next = (active.value + delta * i + list.length) % list.length
    if (!list[next].item.disabled) {
      active.value = next
      return
    }
  }
}

function run(item: MlCommandItem | undefined) {
  if (!item || item.disabled) return
  open.value = false
  emit('select', item)
}

function onKeydown(event: KeyboardEvent) {
  if (event.isComposing) return
  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      step(1)
      break
    case 'ArrowUp':
      event.preventDefault()
      step(-1)
      break
    case 'Enter':
      event.preventDefault()
      run(results.value[active.value]?.item)
      break
    case 'Escape':
      event.preventDefault()
      event.stopPropagation()
      open.value = false
      break
    case 'Tab':
      event.preventDefault() // the input is the only stop inside the dialog
  }
}

watch(query, () => {
  active.value = 0
  if (results.value[0]?.item.disabled) step(1)
})

watch(active, async () => {
  await nextTick()
  listEl.value?.querySelector('.ml-cmd__item--active')?.scrollIntoView?.({ block: 'nearest' })
})

watch(open, async (isOpen) => {
  if (isOpen) {
    returnFocusTo = document.activeElement as HTMLElement | null
    query.value = ''
    active.value = 0
    scrollLock.lock()
    await nextTick()
    input.value?.focus()
  } else {
    scrollLock.unlock()
    returnFocusTo?.focus?.()
    returnFocusTo = null
  }
})

const isMac = typeof navigator !== 'undefined' && /mac|iphone|ipad/i.test(navigator.platform || navigator.userAgent)
const shortcutKeys = computed(() =>
  (props.shortcut ?? '').split('+').map((k) => (k === 'mod' ? (isMac ? '⌘' : 'Ctrl') : k.length === 1 ? k.toUpperCase() : k)),
)

function onGlobalKeydown(event: KeyboardEvent) {
  if (!props.shortcut) return
  const keys = props.shortcut.toLowerCase().split('+')
  const key = keys[keys.length - 1]
  const mod = keys.includes('mod')
  if (event.key.toLowerCase() !== key) return
  if (mod && !(isMac ? event.metaKey : event.ctrlKey)) return
  if (keys.includes('shift') !== event.shiftKey) return
  event.preventDefault()
  open.value = !open.value
}

onMounted(() => window.addEventListener('keydown', onGlobalKeydown))
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onGlobalKeydown)
  scrollLock.unlock()
})

defineExpose({ shortcutKeys })
</script>

<template>
  <slot name="trigger" :open="() => (open = true)" :keys="shortcutKeys" />
  <Teleport to="body">
    <Transition name="ml-cmd" :duration="{ enter: 420, leave: 200 }">
      <div v-if="open" class="ml-cmd">
        <div class="ml-cmd__backdrop" @click="open = false" />
        <div class="ml-cmd__panel" role="dialog" aria-modal="true" :aria-label="loc.command.dialog">
          <div class="ml-cmd__search">
            <MlIcon name="search" class="ml-cmd__search-icon" />
            <input
              ref="input"
              v-model="query"
              class="ml-cmd__input"
              type="text"
              role="combobox"
              autocomplete="off"
              spellcheck="false"
              aria-expanded="true"
              aria-autocomplete="list"
              :aria-controls="`${uid}-list`"
              :aria-activedescendant="results.length ? `${uid}-opt-${active}` : undefined"
              :placeholder="placeholder ?? loc.command.placeholder"
              @keydown="onKeydown"
            />
            <MlKbd class="ml-cmd__esc">Esc</MlKbd>
          </div>
          <div :id="`${uid}-list`" ref="listEl" class="ml-cmd__list" role="listbox" :aria-label="loc.command.list">
            <template v-for="section in sections" :key="section.name">
              <div role="group" :aria-label="section.name || undefined">
                <p v-if="section.name" class="ml-cmd__group" aria-hidden="true">{{ section.name }}</p>
                <div
                  v-for="row in section.rows"
                  :id="`${uid}-opt-${row.index}`"
                  :key="row.item.value"
                  role="option"
                  :aria-selected="row.index === active"
                  :aria-disabled="row.item.disabled || undefined"
                  :class="['ml-cmd__item', { 'ml-cmd__item--active': row.index === active }]"
                  @mousedown.prevent
                  @click="run(row.item)"
                  @mousemove="!row.item.disabled && (active = row.index)"
                >
                  <MlIcon v-if="row.item.icon" :name="row.item.icon" class="ml-cmd__icon" />
                  <span v-else class="ml-cmd__icon ml-cmd__icon--blank" aria-hidden="true" />
                  <span class="ml-cmd__label">
                    <template v-for="(p, k) in parts(row.item.label, row.hits)" :key="k">
                      <mark v-if="p.hit" class="ml-cmd__hit">{{ p.text }}</mark>
                      <template v-else>{{ p.text }}</template>
                    </template>
                  </span>
                  <span v-if="row.item.shortcut" class="ml-cmd__shortcut">{{ row.item.shortcut }}</span>
                </div>
              </div>
            </template>
            <p v-if="!results.length" class="ml-cmd__empty">
              <MlPaw tone="steel" class="ml-cmd__empty-paw" />{{ emptyText ?? loc.command.empty }}
            </p>
          </div>
          <footer class="ml-cmd__foot" aria-hidden="true">
            <span><MlKbd>↑</MlKbd><MlKbd>↓</MlKbd> {{ loc.command.move }}</span>
            <span><MlKbd>Enter</MlKbd> {{ loc.command.run }}</span>
            <span class="ml-cmd__brand"><MlPaw tone="current" /> Malilion</span>
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
