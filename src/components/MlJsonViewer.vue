<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import MlIcon from './MlIcon.vue'
import MlPaw from './MlPaw.vue'
import {
  flattenJson,
  formatJsonPath,
  jsonAllContainers,
  jsonCopyText,
  jsonDefaultOpen,
  jsonDisplayText,
  jsonHighlight,
  jsonIsDate,
  jsonReveal,
  jsonSafeUrl,
  jsonStringView,
  parseJson,
  searchJson,
  type JsonMoreRow,
  type JsonNodeRow,
  type JsonParseResult,
  type JsonRow,
} from './json'
import { copyText } from '../clipboard'
import { pawStamp } from '../pawStamp'
import { useLocale } from '../locale'
import type { MlJsonCopyEvent, MlJsonPathStyle } from '../types'

const loc = useLocale()

const props = withDefaults(
  defineProps<{
    /** Any JSON-like value (objects, arrays, primitives; Dates, Maps and Sets read naturally). */
    data?: unknown
    /** A JSON string to parse instead of `data`. Invalid JSON shows the line / column. */
    source?: string
    /** Open levels on first render (the root is level 1). */
    expandDepth?: number
    /** Path format copied by clicking a key. */
    pathStyle?: MlJsonPathStyle
    /** Search box, match count and expand / collapse all. */
    toolbar?: boolean
    /** While searching, hide rows that don't match or lead to a match. */
    filter?: boolean
    /** Click a key to copy its path, a value to copy the value. */
    copyable?: boolean
    /** Longer strings are cut with a "show more" toggle. */
    maxStringLength?: number
    /** Big arrays / objects show this many children at a time. */
    chunkSize?: number
    /** Render http(s) URLs as links and ISO dates as <time>. */
    links?: boolean
    /** Accessible name of the tree. */
    label?: string
    /** Scroll inside this height (px number or CSS length). */
    maxHeight?: number | string
  }>(),
  { data: undefined, expandDepth: 2, pathStyle: 'jsonpath', toolbar: true, copyable: true, maxStringLength: 120, chunkSize: 100, links: true },
)

const emit = defineEmits<{ copy: [event: MlJsonCopyEvent] }>()
const search = defineModel<string>('search', { default: '' })

const parsed = computed<JsonParseResult>(() => (props.source !== undefined ? parseJson(props.source) : { ok: true, value: props.data }))
const root = computed(() => (parsed.value.ok ? parsed.value.value : undefined))
const parseError = computed(() => (parsed.value.ok ? null : parsed.value.error))

const open = shallowRef<Set<string>>(jsonDefaultOpen(root.value, props.expandDepth))
const shown = shallowRef<Map<string, number>>(new Map())
const longOpen = shallowRef<Set<string>>(new Set())
watch(root, (value) => {
  open.value = jsonDefaultOpen(value, props.expandDepth)
  shown.value = new Map()
  longOpen.value = new Set()
})

const found = computed(() => searchJson(root.value, search.value ?? ''))
const query = computed(() => found.value?.query)
// New search: open the way to every match (the user can still fold things afterwards).
watch(
  found,
  (s) => {
    if (!s) return
    const next = jsonReveal(open.value, shown.value, s, props.chunkSize)
    open.value = next.open
    shown.value = next.shown
  },
  { immediate: true },
)

const rows = computed(() =>
  flattenJson(root.value, { open: open.value, shown: shown.value, chunkSize: props.chunkSize, search: found.value, filter: props.filter }),
)
const focusable = computed(() => rows.value.filter((r): r is JsonNodeRow | JsonMoreRow => r.kind !== 'close'))

/* ── Expanding ─────────────────────────────────────────── */
function setOpen(id: string, value: boolean) {
  if (open.value.has(id) === value) return
  const next = new Set(open.value)
  if (value) next.add(id)
  else next.delete(id)
  open.value = next
}

function toggle(row: JsonNodeRow) {
  if (row.expandable) setOpen(row.id, !row.expanded)
}

function showMore(row: JsonMoreRow) {
  const next = new Map(shown.value)
  next.set(row.parentId, (next.get(row.parentId) ?? props.chunkSize) + row.next)
  shown.value = next
}

function setLong(id: string, value: boolean) {
  const next = new Set(longOpen.value)
  if (value) next.add(id)
  else next.delete(id)
  longOpen.value = next
}

function expandAll() {
  open.value = jsonAllContainers(root.value)
}

function collapseAll() {
  open.value = new Set()
  focusedId.value = '$'
}

/* ── Rendering helpers ─────────────────────────────────── */
const stringView = (row: JsonNodeRow) =>
  jsonStringView(jsonDisplayText(row.value), { max: props.maxStringLength, expanded: longOpen.value.has(row.id), query: query.value })
const keyParts = (row: JsonNodeRow) => jsonHighlight(String(row.key), typeof row.key === 'string' ? query.value : undefined)
const valueParts = (row: JsonNodeRow) => jsonHighlight(jsonDisplayText(row.value), query.value)
const urlOf = (row: JsonNodeRow) => (props.links && row.type === 'string' ? jsonSafeUrl(row.value as string) : undefined)
const isDate = (row: JsonNodeRow) => row.type === 'date' || (props.links && row.type === 'string' && jsonIsDate(row.value as string))
const opener = (row: JsonNodeRow | { type: string }) => (row.type === 'array' ? '[' : '{')
const closer = (row: JsonNodeRow | { type: string }) => (row.type === 'array' ? ']' : '}')
const countText = (row: JsonNodeRow) => (row.type === 'array' ? loc.value.json.items(row.size) : loc.value.json.keys(row.size))
const circularText = (row: JsonNodeRow) => `${loc.value.json.circular} → ${formatJsonPath(pathOf(row.circular ?? '$'), props.pathStyle) || '$'}`
const pathOf = (id: string) => (rows.value.find((r) => r.id === id && r.kind === 'node') as JsonNodeRow | undefined)?.path ?? []

/* ── Copying ───────────────────────────────────────────── */
const announce = ref('')
const flashId = ref<string | null>(null)
let flashTimer: ReturnType<typeof setTimeout> | undefined
onBeforeUnmount(() => clearTimeout(flashTimer))

async function doCopy(row: JsonNodeRow, kind: 'path' | 'value', event?: MouseEvent | KeyboardEvent) {
  if (!props.copyable) return
  const text = kind === 'path' ? formatJsonPath(row.path, props.pathStyle) : jsonCopyText(row.value)
  const target = event?.currentTarget as HTMLElement | null
  if (!(await copyText(text))) return
  announce.value = kind === 'path' ? loc.value.json.copiedPath(text) : loc.value.json.copiedValue
  flashId.value = row.id
  clearTimeout(flashTimer)
  flashTimer = setTimeout(() => (flashId.value = null), 900)
  if (event && 'clientX' in event && event.detail > 0) pawStamp(event.clientX, event.clientY)
  else if (target) {
    const r = target.getBoundingClientRect()
    pawStamp(r.left + Math.min(r.width / 2, 40), r.top + r.height / 2)
  }
  emit('copy', { kind, text, path: [...row.path] })
}

function onValueClick(row: JsonNodeRow, event: MouseEvent) {
  if (row.expandable && !row.expanded) return toggle(row)
  doCopy(row, 'value', event)
}

/* ── Keyboard (WAI-ARIA tree view) ─────────────────────── */
const rowEls = new Map<string, HTMLElement>()
const focusedId = ref<string | null>(null)
const tabId = computed(() => {
  const ids = focusable.value.map((r) => r.id)
  if (focusedId.value !== null && ids.includes(focusedId.value)) return focusedId.value
  return ids[0] ?? null
})

async function focusRow(id: string | null | undefined) {
  if (!id) return
  focusedId.value = id
  await nextTick()
  rowEls.get(id)?.focus()
}

function onKeydown(event: KeyboardEvent, row: JsonNodeRow | JsonMoreRow) {
  const list = focusable.value
  const i = list.findIndex((r) => r.id === row.id)
  const node = row.kind === 'node' ? row : null
  const long = node && (node.type === 'string' || node.type === 'date') ? stringView(node) : null
  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      focusRow(list[i + 1]?.id)
      break
    case 'ArrowUp':
      event.preventDefault()
      focusRow(list[i - 1]?.id)
      break
    case 'ArrowRight':
      event.preventDefault()
      if (node?.expandable && !node.expanded) setOpen(node.id, true)
      else if (node?.expanded) focusRow(list[i + 1]?.id)
      else if (long?.truncated && node) setLong(node.id, true)
      break
    case 'ArrowLeft':
      event.preventDefault()
      if (node?.expanded) setOpen(node.id, false)
      else if (node && long?.long && !long.truncated && !long.forced) setLong(node.id, false)
      else focusRow(row.parentId)
      break
    case 'Home':
      event.preventDefault()
      focusRow(list[0]?.id)
      break
    case 'End':
      event.preventDefault()
      focusRow(list[list.length - 1]?.id)
      break
    case 'Enter':
    case ' ':
      event.preventDefault()
      if (!node) showMore(row as JsonMoreRow)
      else if (node.expandable) toggle(node)
      else doCopy(node, 'value', event)
      break
    default: {
      if (!node || event.altKey || event.shiftKey) return
      const key = event.key.toLowerCase()
      const mod = event.ctrlKey || event.metaKey
      // c (or Ctrl/⌘+C with nothing selected) copies the value, p copies the path.
      if (key === 'c' && !(mod && document.getSelection?.()?.toString())) {
        event.preventDefault()
        doCopy(node, 'value', event)
      } else if (key === 'p' && !mod) {
        event.preventDefault()
        doCopy(node, 'path', event)
      }
    }
  }
}

function onRowClick(row: JsonRow) {
  if (row.kind === 'close') return
  focusedId.value = row.id
  if (row.kind === 'more') showMore(row)
  else toggle(row)
}

const setRowEl = (id: string) => (el: unknown) => (el ? rowEls.set(id, el as HTMLElement) : rowEls.delete(id))
const maxHeightStyle = computed(() =>
  props.maxHeight !== undefined ? { maxHeight: typeof props.maxHeight === 'number' ? `${props.maxHeight}px` : props.maxHeight } : undefined,
)
const caret = computed(() => (parseError.value ? `${' '.repeat(Math.max(0, parseError.value.column - 1))}^` : ''))

defineExpose({ expandAll, collapseAll })
</script>

<template>
  <div :class="['ml-json', { 'ml-json--error': parseError, 'ml-json--copyable': copyable }]">
    <div v-if="toolbar && !parseError" class="ml-json__toolbar">
      <label class="ml-json__search">
        <MlIcon name="search" class="ml-json__search-icon" />
        <input
          v-model="search"
          class="ml-json__search-input"
          type="search"
          :placeholder="loc.json.search"
          :aria-label="loc.json.search"
          autocomplete="off"
          spellcheck="false"
        />
      </label>
      <span v-if="found" class="ml-json__matches" aria-live="polite">{{ loc.json.matches(found.count) }}</span>
      <span class="ml-json__tools">
        <button type="button" class="ml-btn ml-btn--ghost ml-btn--sm" @click="expandAll">{{ loc.json.expandAll }}</button>
        <button type="button" class="ml-btn ml-btn--ghost ml-btn--sm" @click="collapseAll">{{ loc.json.collapseAll }}</button>
      </span>
    </div>
    <div v-if="parseError" class="ml-json__error" role="alert">
      <p class="ml-json__error-title">{{ loc.json.parseError(parseError.line, parseError.column) }}</p>
      <p class="ml-json__error-detail">{{ parseError.found === undefined ? loc.json.unexpectedEnd : loc.json.unexpected(parseError.found) }}</p>
      <pre class="ml-json__error-snippet"><code><span class="ml-json__error-line">{{ parseError.lineText }}</span>
<span class="ml-json__error-caret" aria-hidden="true">{{ caret }}</span></code></pre>
    </div>
    <ul v-else role="tree" class="ml-json__tree" :aria-label="label ?? loc.json.label" :style="maxHeightStyle">
      <template v-for="row in rows" :key="row.id">
        <li
          v-if="row.kind === 'close'"
          role="none"
          aria-hidden="true"
          class="ml-json__row ml-json__row--close"
          :style="{ '--_level': row.level }"
        >
          <span class="ml-json__twisty ml-json__twisty--leaf" />
          <span class="ml-json__brace">{{ closer(row) }}</span>
          <span v-if="!row.last" class="ml-json__comma">,</span>
        </li>
        <li
          v-else-if="row.kind === 'more'"
          :ref="setRowEl(row.id)"
          role="treeitem"
          :aria-level="row.level"
          :aria-setsize="row.setsize"
          :aria-posinset="row.posinset"
          :tabindex="tabId === row.id ? 0 : -1"
          class="ml-json__row ml-json__row--more"
          :style="{ '--_level': row.level }"
          @click="onRowClick(row)"
          @keydown="onKeydown($event, row)"
          @focus="focusedId = row.id"
        >
          <span class="ml-json__twisty ml-json__twisty--leaf" />
          <span class="ml-json__more"><MlPaw tone="current" />{{ loc.json.more(row.next, row.rest) }}</span>
        </li>
        <li
          v-else
          :ref="setRowEl(row.id)"
          role="treeitem"
          :aria-level="row.level"
          :aria-setsize="row.setsize"
          :aria-posinset="row.posinset"
          :aria-expanded="row.expandable ? row.expanded : undefined"
          :tabindex="tabId === row.id ? 0 : -1"
          :class="[
            'ml-json__row',
            `ml-json__row--${row.type}`,
            { 'ml-json__row--match': row.hit, 'ml-json__row--copied': flashId === row.id },
          ]"
          :style="{ '--_level': row.level }"
          @click="onRowClick(row)"
          @keydown="onKeydown($event, row)"
          @focus="focusedId = row.id"
        >
          <span v-if="row.expandable" class="ml-json__twisty" aria-hidden="true"><MlIcon name="chevronRight" /></span>
          <span v-else class="ml-json__twisty ml-json__twisty--leaf" />
          <template v-if="row.key !== undefined">
            <span
              :class="['ml-json__key', { 'ml-json__key--index': typeof row.key === 'number' }]"
              :title="copyable ? loc.json.copyPath : undefined"
              @click.stop="doCopy(row, 'path', $event)"
            ><template v-for="(p, k) in keyParts(row)" :key="k"><mark v-if="p.hit" class="ml-json__hit">{{ p.text }}</mark><template v-else>{{ p.text }}</template></template></span>
            <span class="ml-json__colon">:</span>
          </template>
          <template v-if="row.type === 'object' || row.type === 'array'">
            <span v-if="row.expanded" class="ml-json__brace">{{ opener(row) }}</span>
            <template v-else>
              <span
                class="ml-json__value ml-json__value--collapsed"
                :title="row.expandable && copyable ? undefined : copyable ? loc.json.copyValue : undefined"
                @click.stop="onValueClick(row, $event)"
              >{{ opener(row) }}{{ row.size ? '…' : '' }}{{ closer(row) }}</span>
              <span v-if="row.size" class="ml-json__count">{{ countText(row) }}</span>
            </template>
          </template>
          <span v-else-if="row.type === 'circular'" class="ml-json__value ml-json__value--circular">{{ circularText(row) }}</span>
          <template v-else-if="row.type === 'string' || row.type === 'date'">
            <span
              :class="['ml-json__value', `ml-json__value--string`, { 'ml-json__value--date': isDate(row) }]"
              :title="copyable ? loc.json.copyValue : undefined"
              @click.stop="doCopy(row, 'value', $event)"
            >"<a
                v-if="urlOf(row)"
                class="ml-json__link"
                :href="urlOf(row)"
                target="_blank"
                rel="noopener noreferrer"
                @click.stop
              ><template v-for="(p, k) in stringView(row).parts" :key="k"><mark v-if="p.hit" class="ml-json__hit">{{ p.text }}</mark><template v-else>{{ p.text }}</template></template></a><time
                v-else-if="isDate(row)"
                class="ml-json__date"
                :datetime="jsonDisplayText(row.value)"
              ><template v-for="(p, k) in stringView(row).parts" :key="k"><mark v-if="p.hit" class="ml-json__hit">{{ p.text }}</mark><template v-else>{{ p.text }}</template></template></time><template
                v-else
              ><template v-for="(p, k) in stringView(row).parts" :key="k"><mark v-if="p.hit" class="ml-json__hit">{{ p.text }}</mark><template v-else>{{ p.text }}</template></template></template>{{ stringView(row).truncated ? '…' : '' }}"</span>
            <button
              v-if="stringView(row).long && !stringView(row).forced"
              type="button"
              class="ml-json__toggle-text"
              tabindex="-1"
              @click.stop="setLong(row.id, stringView(row).truncated)"
            >{{ stringView(row).truncated ? loc.json.expandString(stringView(row).hidden) : loc.json.collapseString }}</button>
          </template>
          <span
            v-else
            :class="['ml-json__value', `ml-json__value--${row.type}`]"
            :title="copyable ? loc.json.copyValue : undefined"
            @click.stop="doCopy(row, 'value', $event)"
          ><template v-for="(p, k) in valueParts(row)" :key="k"><mark v-if="p.hit" class="ml-json__hit">{{ p.text }}</mark><template v-else>{{ p.text }}</template></template></span>
          <span v-if="!row.last && !row.expanded" class="ml-json__comma">,</span>
        </li>
      </template>
    </ul>
    <p v-if="!parseError && filter && found && !found.count" class="ml-json__empty">{{ loc.json.empty }}</p>
    <span class="ml-visually-hidden" role="status" aria-live="polite">{{ announce }}</span>
  </div>
</template>
