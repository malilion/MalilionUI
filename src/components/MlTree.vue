<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import MlIcon from './MlIcon.vue'
import MlPaw from './MlPaw.vue'
import type { MlTreeNode } from '../types'

type Key = string | number

interface Row {
  node: MlTreeNode
  level: number
  parent: Key | null
  posinset: number
  setsize: number
  hasChildren: boolean
  expanded: boolean
}

const props = withDefaults(
  defineProps<{
    data: MlTreeNode[]
    /** Tri-state checkboxes; checked keys live in v-model:checked. */
    checkable?: boolean
    /** Click / Enter marks a single node as selected (v-model:selected). */
    selectable?: boolean
    /** Show only nodes whose label contains this text (plus their ancestors). */
    filter?: string
    /** Accessible name for the tree. */
    label?: string
    /** Text when nothing matches the filter. */
    emptyText?: string
  }>(),
  { selectable: true, emptyText: '沒有符合的節點' },
)

const emit = defineEmits<{ select: [node: MlTreeNode]; check: [node: MlTreeNode, checked: boolean] }>()
const expanded = defineModel<Key[]>('expanded', { default: () => [] })
const selected = defineModel<Key | null>('selected', { default: null })
const checked = defineModel<Key[]>('checked', { default: () => [] })

const rowEls = new Map<Key, HTMLElement>()
const focusedKey = ref<Key | null>(null)

/* ── Indexes over the data ─────────────────────────────── */
const index = computed(() => {
  const byKey = new Map<Key, MlTreeNode>()
  const parentOf = new Map<Key, Key | null>()
  const walk = (nodes: MlTreeNode[], parent: Key | null) => {
    for (const n of nodes) {
      byKey.set(n.key, n)
      parentOf.set(n.key, parent)
      if (n.children) walk(n.children, n.key)
    }
  }
  walk(props.data, null)
  return { byKey, parentOf }
})

const query = computed(() => props.filter?.trim().toLowerCase() ?? '')
const matches = (n: MlTreeNode) => !!query.value && n.label.toLowerCase().includes(query.value)

/** While filtering: nodes to keep (matches and their ancestors). */
const kept = computed(() => {
  if (!query.value) return null
  const keep = new Set<Key>()
  const visit = (n: MlTreeNode): boolean => {
    const childHit = (n.children ?? []).map(visit).some(Boolean)
    const hit = matches(n) || childHit
    if (hit) keep.add(n.key)
    return hit
  }
  props.data.forEach(visit)
  return keep
})

const expandedSet = computed(() => new Set(expanded.value))
const isExpanded = (n: MlTreeNode) =>
  !!n.children?.length && (kept.value ? (n.children ?? []).some((c) => kept.value!.has(c.key)) : expandedSet.value.has(n.key))

const rows = computed<Row[]>(() => {
  const out: Row[] = []
  const walk = (nodes: MlTreeNode[], level: number, parent: Key | null) => {
    const shown = kept.value ? nodes.filter((n) => kept.value!.has(n.key)) : nodes
    shown.forEach((node, i) => {
      const open = isExpanded(node)
      out.push({ node, level, parent, posinset: i + 1, setsize: shown.length, hasChildren: !!node.children?.length, expanded: open })
      if (open) walk(node.children!, level + 1, node.key)
    })
  }
  walk(props.data, 1, null)
  return out
})

/* ── Checking (tri-state, cascading) ───────────────────── */
const checkedSet = computed(() => new Set(checked.value))

function leaves(n: MlTreeNode): MlTreeNode[] {
  return n.children?.length ? n.children.flatMap(leaves) : [n]
}

function checkState(n: MlTreeNode): boolean | 'mixed' {
  if (!n.children?.length) return checkedSet.value.has(n.key)
  const ls = leaves(n).filter((l) => !l.disabled)
  if (!ls.length) return checkedSet.value.has(n.key)
  const on = ls.filter((l) => checkedSet.value.has(l.key)).length
  return on === 0 ? false : on === ls.length ? true : 'mixed'
}

function toggleCheck(n: MlTreeNode) {
  if (n.disabled) return
  const turnOn = checkState(n) !== true
  const next = new Set(checked.value)
  const apply = (node: MlTreeNode) => {
    if (node.disabled) return
    if (turnOn) next.add(node.key)
    else next.delete(node.key)
    node.children?.forEach(apply)
  }
  apply(n)
  // Re-derive every ancestor from its children.
  let parent = index.value.parentOf.get(n.key) ?? null
  while (parent !== null) {
    const p = index.value.byKey.get(parent)!
    const kids = (p.children ?? []).filter((c) => !c.disabled)
    if (kids.length && kids.every((c) => next.has(c.key))) next.add(p.key)
    else next.delete(p.key)
    parent = index.value.parentOf.get(parent) ?? null
  }
  checked.value = [...next]
  emit('check', n, turnOn)
}

/* ── Expanding & selecting ─────────────────────────────── */
function setExpanded(n: MlTreeNode, open: boolean) {
  if (!n.children?.length || kept.value) return
  const has = expandedSet.value.has(n.key)
  if (open && !has) expanded.value = [...expanded.value, n.key]
  else if (!open && has) expanded.value = expanded.value.filter((k) => k !== n.key)
}

function select(n: MlTreeNode) {
  if (n.disabled || !props.selectable) return
  selected.value = n.key
  emit('select', n)
}

function onRowClick(row: Row) {
  focusedKey.value = row.node.key
  if (row.node.disabled) return
  if (props.checkable && !props.selectable) toggleCheck(row.node)
  else select(row.node)
  if (row.hasChildren) setExpanded(row.node, !row.expanded)
}

/* ── Keyboard (WAI-ARIA tree view) ─────────────────────── */
const tabKey = computed(() => {
  const keys = rows.value.map((r) => r.node.key)
  if (focusedKey.value !== null && keys.includes(focusedKey.value)) return focusedKey.value
  if (selected.value !== null && keys.includes(selected.value)) return selected.value
  return keys[0] ?? null
})

async function focusKey(key: Key | undefined | null) {
  if (key === undefined || key === null) return
  focusedKey.value = key
  await nextTick()
  rowEls.get(key)?.focus()
}

let typeahead = ''
let typeaheadTimer: ReturnType<typeof setTimeout> | undefined

function onKeydown(event: KeyboardEvent, row: Row) {
  const list = rows.value
  const i = list.indexOf(row)
  const n = row.node
  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      focusKey(list[i + 1]?.node.key)
      break
    case 'ArrowUp':
      event.preventDefault()
      focusKey(list[i - 1]?.node.key)
      break
    case 'ArrowRight':
      event.preventDefault()
      if (row.hasChildren && !row.expanded) setExpanded(n, true)
      else if (row.expanded) focusKey(list[i + 1]?.node.key)
      break
    case 'ArrowLeft':
      event.preventDefault()
      if (row.expanded && !kept.value) setExpanded(n, false)
      else focusKey(row.parent)
      break
    case 'Home':
      event.preventDefault()
      focusKey(list[0]?.node.key)
      break
    case 'End':
      event.preventDefault()
      focusKey(list[list.length - 1]?.node.key)
      break
    case 'Enter':
      event.preventDefault()
      if (props.selectable) select(n)
      else if (props.checkable) toggleCheck(n)
      break
    case ' ':
      event.preventDefault()
      if (props.checkable) toggleCheck(n)
      else select(n)
      break
    default:
      if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
        clearTimeout(typeaheadTimer)
        typeahead += event.key.toLowerCase()
        typeaheadTimer = setTimeout(() => (typeahead = ''), 600)
        const order = [...list.slice(i + (typeahead.length === 1 ? 1 : 0)), ...list.slice(0, i + 1)]
        focusKey(order.find((r) => r.node.label.toLowerCase().startsWith(typeahead))?.node.key)
      }
  }
}

function parts(label: string) {
  const at = query.value ? label.toLowerCase().indexOf(query.value) : -1
  if (at < 0) return [{ text: label, hit: false }]
  return [
    { text: label.slice(0, at), hit: false },
    { text: label.slice(at, at + query.value.length), hit: true },
    { text: label.slice(at + query.value.length), hit: false },
  ].filter((p) => p.text)
}

/** Expand every node that has children. */
function expandAll() {
  expanded.value = [...index.value.byKey.values()].filter((n) => n.children?.length).map((n) => n.key)
}

function collapseAll() {
  expanded.value = []
}

defineExpose({ expandAll, collapseAll })
</script>

<template>
  <div class="ml-tree-wrap">
    <ul
      role="tree"
      :aria-label="label"
      :aria-multiselectable="checkable || undefined"
      :class="['ml-tree', { 'ml-tree--checkable': checkable }]"
    >
      <li
        v-for="row in rows"
        :key="row.node.key"
        :ref="(el) => (el ? rowEls.set(row.node.key, el as HTMLElement) : rowEls.delete(row.node.key))"
        role="treeitem"
        :aria-level="row.level"
        :aria-setsize="row.setsize"
        :aria-posinset="row.posinset"
        :aria-expanded="row.hasChildren ? row.expanded : undefined"
        :aria-selected="selectable && !checkable ? selected === row.node.key : undefined"
        :aria-checked="checkable ? checkState(row.node) : undefined"
        :aria-disabled="row.node.disabled || undefined"
        :tabindex="tabKey === row.node.key ? 0 : -1"
        :class="[
          'ml-tree__row',
          {
            'ml-tree__row--selected': selectable && selected === row.node.key,
            'ml-tree__row--disabled': row.node.disabled,
            'ml-tree__row--match': matches(row.node),
          },
        ]"
        :style="{ '--_level': row.level }"
        @click="onRowClick(row)"
        @keydown="onKeydown($event, row)"
        @focus="focusedKey = row.node.key"
      >
        <span
          v-if="row.hasChildren"
          class="ml-tree__twisty"
          aria-hidden="true"
          @click.stop="setExpanded(row.node, !row.expanded)"
        >
          <MlIcon name="chevronRight" />
        </span>
        <span v-else class="ml-tree__twisty ml-tree__twisty--leaf" aria-hidden="true">
          <MlPaw tone="current" />
        </span>
        <span
          v-if="checkable"
          :class="['ml-tree__check', { 'ml-tree__check--on': checkState(row.node) === true, 'ml-tree__check--mixed': checkState(row.node) === 'mixed' }]"
          aria-hidden="true"
          @click.stop="toggleCheck(row.node)"
        >
          <MlIcon v-if="checkState(row.node) === true" name="check" />
          <MlIcon v-else-if="checkState(row.node) === 'mixed'" name="minus" />
        </span>
        <MlIcon v-if="row.node.icon" :name="row.node.icon" class="ml-tree__icon" />
        <span class="ml-tree__label">
          <slot name="node" :node="row.node" :level="row.level" :expanded="row.expanded">
            <template v-for="(p, k) in parts(row.node.label)" :key="k">
              <mark v-if="p.hit" class="ml-combobox__hit">{{ p.text }}</mark>
              <template v-else>{{ p.text }}</template>
            </template>
          </slot>
        </span>
      </li>
    </ul>
    <p v-if="!rows.length && query" class="ml-tree__empty">{{ emptyText }}</p>
  </div>
</template>
