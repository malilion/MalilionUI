<script setup lang="ts" generic="Row extends Record<string, any>">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useSlots, watch } from 'vue'
import MlCheckbox from './MlCheckbox.vue'
import MlIcon from './MlIcon.vue'
import MlLoader from './MlLoader.vue'
import MlPagination from './MlPagination.vue'
import MlPaw from './MlPaw.vue'
import type { MlTableColumn, MlTableSort } from '../types'
import { useLocale } from '../locale'

const loc = useLocale()

type Key = string | number

interface FlatRow {
  row: Row
  key: Key
  /** Depth in a tree table (0 = top level). */
  level: number
  hasChildren: boolean
}

const props = withDefaults(
  defineProps<{
    columns: MlTableColumn<Row>[]
    rows: Row[]
    /** Field name or function giving each row a stable key. */
    rowKey?: string | ((row: Row) => Key)
    caption?: string
    striped?: boolean
    dense?: boolean
    loading?: boolean
    /** Adds a checkbox column; selected keys live in v-model:selected. */
    selectable?: boolean
    /** Skip built-in sorting (e.g. the server sorts); just emit the new sort. */
    manualSort?: boolean
    /** Little paw that walks in on the hovered row. */
    hoverPaw?: boolean
    emptyText?: string
    /** Scroll the body inside this height with a sticky header (px number or CSS length). */
    maxHeight?: number | string
    /** Rows per page; adds a pager under the table. Page lives in v-model:page. */
    pageSize?: number
    /** Field that holds child rows: rows with children become a tree. */
    childrenKey?: string
    /** Which rows may open the #expand panel (default: all, when the slot exists). */
    rowExpandable?: (row: Row) => boolean
  }>(),
  { rowKey: 'id', hoverPaw: true, childrenKey: 'children' },
)

const emit = defineEmits<{ 'row-click': [row: Row] }>()
const sort = defineModel<MlTableSort | null>('sort', { default: null })
const selected = defineModel<Key[]>('selected', { default: () => [] })
/** Rows whose #expand detail panel is open. */
const expanded = defineModel<Key[]>('expanded', { default: () => [] })
/** Tree rows whose children are shown. */
const treeOpen = defineModel<Key[]>('treeOpen', { default: () => [] })
const page = defineModel<number>('page', { default: 1 })

const slots = useSlots()
const hasExpand = computed(() => !!slots.expand)

const keyOf = (row: Row): Key =>
  typeof props.rowKey === 'function' ? props.rowKey(row) : (row[props.rowKey] as Key)
const childrenOf = (row: Row): Row[] => {
  const kids = row[props.childrenKey]
  return Array.isArray(kids) ? kids : []
}

const collator = computed(() => new Intl.Collator(loc.value.name, { numeric: true, sensitivity: 'base' }))

const isEmpty = (value: unknown) => value === null || value === undefined || value === ''

function compare(a: unknown, b: unknown): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime()
  return collator.value.compare(String(a), String(b))
}

function sortList(list: Row[]): Row[] {
  const current = sort.value
  if (!current || props.manualSort) return list
  const direction = current.order === 'asc' ? 1 : -1
  return [...list].sort((rowA, rowB) => {
    const a = rowA[current.key]
    const b = rowB[current.key]
    // Empty cells sink to the bottom whichever way we sort.
    if (isEmpty(a) || isEmpty(b)) return Number(isEmpty(a)) - Number(isEmpty(b))
    return compare(a, b) * direction
  })
}

/* ── Paging (top-level rows only; a tree's children stay with their parent) ── */
const sortedTop = computed(() => sortList(props.rows))
const pageCount = computed(() => (props.pageSize ? Math.max(1, Math.ceil(sortedTop.value.length / props.pageSize)) : 1))
const pagedTop = computed(() => {
  if (!props.pageSize) return sortedTop.value
  const start = (Math.min(page.value, pageCount.value) - 1) * props.pageSize
  return sortedTop.value.slice(start, start + props.pageSize)
})
// Fewer rows (a filter, a delete) can leave us past the last page.
watch(pageCount, (count) => {
  if (page.value > count) page.value = count
})

/* ── Tree flattening ── */
const treeOpenSet = computed(() => new Set(treeOpen.value))
const isTree = computed(() => props.rows.some((r) => childrenOf(r).length > 0))

const view = computed<FlatRow[]>(() => {
  const out: FlatRow[] = []
  const walk = (list: Row[], level: number) => {
    for (const row of list) {
      const key = keyOf(row)
      const kids = childrenOf(row)
      out.push({ row, key, level, hasChildren: kids.length > 0 })
      if (kids.length && treeOpenSet.value.has(key)) walk(sortList(kids), level + 1)
    }
  }
  walk(pagedTop.value, 0)
  return out
})

function toggleTree(key: Key) {
  treeOpen.value = treeOpenSet.value.has(key) ? treeOpen.value.filter((k) => k !== key) : [...treeOpen.value, key]
}

/* ── Expandable detail rows ── */
const expandedSet = computed(() => new Set(expanded.value))
const canExpand = (row: Row) => hasExpand.value && (props.rowExpandable?.(row) ?? true)
function toggleExpand(key: Key) {
  expanded.value = expandedSet.value.has(key) ? expanded.value.filter((k) => k !== key) : [...expanded.value, key]
}

/* ── Sorting ── */
// Sort cycle: none → ascending → descending → none
function toggleSort(column: MlTableColumn<Row>) {
  const current = sort.value
  if (!current || current.key !== column.key) sort.value = { key: column.key, order: 'asc' }
  else if (current.order === 'asc') sort.value = { key: column.key, order: 'desc' }
  else sort.value = null
}

function ariaSort(column: MlTableColumn<Row>) {
  if (!column.sortable) return undefined
  if (sort.value?.key !== column.key) return 'none'
  return sort.value.order === 'asc' ? 'ascending' : 'descending'
}

/* ── Selection ── */
const selectedSet = computed(() => new Set(selected.value))
const visibleKeys = computed(() => view.value.map((r) => r.key))
const allSelected = computed(
  () => visibleKeys.value.length > 0 && visibleKeys.value.every((key) => selectedSet.value.has(key)),
)
const someSelected = computed(
  () => !allSelected.value && visibleKeys.value.some((key) => selectedSet.value.has(key)),
)

function toggleAll(checked: boolean) {
  const visible = new Set(visibleKeys.value)
  const others = selected.value.filter((key) => !visible.has(key))
  selected.value = checked ? [...others, ...visibleKeys.value] : others
}

function toggleRow(key: Key, checked: boolean) {
  selected.value = checked ? [...selected.value, key] : selected.value.filter((k) => k !== key)
}

function display(column: MlTableColumn<Row>, row: Row) {
  const value = row[column.key]
  if (column.format) return column.format(value, row)
  return value === null || value === undefined ? '—' : String(value)
}

const columnCount = computed(() => props.columns.length + (props.selectable ? 1 : 0) + (hasExpand.value ? 1 : 0))

/* ── Fixed columns: sticky offsets measured from the header cells ── */
const scroller = ref<HTMLElement>()
const headRow = ref<HTMLTableRowElement>()
const offsets = ref<Record<string, number>>({})
const hasFixedLeft = computed(() => props.columns.some((c) => c.fixed === 'left'))
const hasFixedRight = computed(() => props.columns.some((c) => c.fixed === 'right'))
const edge = ref({ left: false, right: false })

function measure() {
  const cells = headRow.value ? [...headRow.value.children] as HTMLElement[] : []
  if (!cells.length) return
  const next: Record<string, number> = {}
  // Utility columns (expand, select) ride along with the left-fixed ones.
  const lead = cells.length - props.columns.length
  let left = 0
  if (hasFixedLeft.value) {
    for (let i = 0; i < lead; i++) {
      next[`__lead${i}`] = left
      left += cells[i].offsetWidth
    }
  }
  props.columns.forEach((c, i) => {
    if (c.fixed === 'left') {
      next[c.key] = left
      left += cells[lead + i].offsetWidth
    }
  })
  let right = 0
  for (let i = props.columns.length - 1; i >= 0; i--) {
    const c = props.columns[i]
    if (c.fixed === 'right') {
      next[c.key] = right
      right += cells[lead + i].offsetWidth
    }
  }
  offsets.value = next
  onScroll()
}

function onScroll() {
  const el = scroller.value
  if (!el) return
  edge.value = { left: el.scrollLeft > 0, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 1 }
}

function stickyStyle(column: MlTableColumn<Row>) {
  if (!column.fixed) return undefined
  const at = offsets.value[column.key] ?? 0
  return column.fixed === 'left' ? { left: `${at}px` } : { right: `${at}px` }
}
const leadStyle = (i: number) => (hasFixedLeft.value ? { left: `${offsets.value[`__lead${i}`] ?? 0}px` } : undefined)

/** The last left-fixed / first right-fixed column draws the scroll shadow. */
const lastLeft = computed(() => [...props.columns].reverse().find((c) => c.fixed === 'left')?.key)
const firstRight = computed(() => props.columns.find((c) => c.fixed === 'right')?.key)

let observer: ResizeObserver | undefined
onMounted(() => {
  if (!hasFixedLeft.value && !hasFixedRight.value) return
  measure()
  if (typeof ResizeObserver !== 'undefined' && scroller.value) {
    observer = new ResizeObserver(measure)
    observer.observe(scroller.value)
  }
})
onBeforeUnmount(() => observer?.disconnect())
watch(
  () => [props.columns, view.value.length],
  () => (hasFixedLeft.value || hasFixedRight.value) && nextTick(measure),
)

const maxHeightCss = computed(() =>
  props.maxHeight === undefined ? undefined : typeof props.maxHeight === 'number' ? `${props.maxHeight}px` : props.maxHeight,
)

/** The first data column holds the tree toggle and the hover paw. */
const isFirst = (c: number) => c === 0
</script>

<template>
  <div
    :class="[
      'ml-table',
      {
        'ml-table--striped': striped,
        'ml-table--dense': dense,
        'ml-table--loading': loading,
        'ml-table--hover-paw': hoverPaw,
        'ml-table--sticky': maxHeight !== undefined,
        'ml-table--scrolled-left': edge.left,
        'ml-table--scrolled-right': edge.right,
      },
    ]"
  >
    <div ref="scroller" class="ml-table__scroll" :style="maxHeightCss ? { maxHeight: maxHeightCss } : undefined" @scroll="onScroll">
      <table class="ml-table__table" :aria-busy="loading || undefined" :role="isTree ? 'treegrid' : undefined">
        <caption v-if="caption" class="ml-table__caption">{{ caption }}</caption>
        <thead>
          <tr ref="headRow">
            <th v-if="hasExpand" class="ml-table__expand-col" :class="{ 'ml-table__fixed': hasFixedLeft }" :style="leadStyle(0)" scope="col">
              <span class="ml-visually-hidden">{{ loc.table.expand }}</span>
            </th>
            <th
              v-if="selectable"
              class="ml-table__select"
              :class="{ 'ml-table__fixed': hasFixedLeft }"
              :style="leadStyle(hasExpand ? 1 : 0)"
              scope="col"
            >
              <MlCheckbox
                paw
                :aria-label="loc.table.selectAll"
                :model-value="allSelected"
                :indeterminate="someSelected"
                :disabled="!view.length"
                @update:model-value="toggleAll"
              />
            </th>
            <th
              v-for="column in columns"
              :key="column.key"
              scope="col"
              :style="[column.width ? { width: column.width, minWidth: column.width } : {}, stickyStyle(column) ?? {}]"
              :class="[
                `ml-table__cell--${column.align ?? 'left'}`,
                {
                  'ml-table__th--sorted': sort?.key === column.key,
                  'ml-table__fixed': column.fixed,
                  'ml-table__fixed--last-left': column.key === lastLeft,
                  'ml-table__fixed--first-right': column.key === firstRight,
                },
              ]"
              :aria-sort="ariaSort(column)"
            >
              <button
                v-if="column.sortable"
                type="button"
                class="ml-table__sort"
                @click="toggleSort(column)"
              >
                <slot :name="`header-${column.key}`" :column="column">{{ column.title }}</slot>
                <span
                  class="ml-table__sort-icon"
                  :data-order="sort?.key === column.key ? sort.order : undefined"
                  aria-hidden="true"
                >
                  <svg viewBox="0 0 10 14"><path d="M5 1L9 5.5H1z" /><path d="M5 13L1 8.5h8z" /></svg>
                </span>
              </button>
              <slot v-else :name="`header-${column.key}`" :column="column">{{ column.title }}</slot>
            </th>
          </tr>
        </thead>
        <tbody>
          <template v-for="(item, index) in view" :key="item.key">
            <tr
              :class="{
                'ml-table__row--selected': selectedSet.has(item.key),
                'ml-table__row--open': expandedSet.has(item.key),
                'ml-table__row--child': item.level > 0,
              }"
              :aria-level="isTree ? item.level + 1 : undefined"
              :aria-expanded="isTree && item.hasChildren ? treeOpenSet.has(item.key) : undefined"
              @click="emit('row-click', item.row)"
            >
              <td v-if="hasExpand" class="ml-table__expand-col" :class="{ 'ml-table__fixed': hasFixedLeft }" :style="leadStyle(0)" @click.stop>
                <button
                  v-if="canExpand(item.row)"
                  type="button"
                  class="ml-table__expander"
                  :aria-expanded="expandedSet.has(item.key)"
                  :aria-label="loc.table.expandRow(index + 1)"
                  @click="toggleExpand(item.key)"
                >
                  <MlIcon name="chevronRight" />
                </button>
              </td>
              <td
                v-if="selectable"
                class="ml-table__select"
                :class="{ 'ml-table__fixed': hasFixedLeft }"
                :style="leadStyle(hasExpand ? 1 : 0)"
                @click.stop
              >
                <MlCheckbox
                  paw
                  :aria-label="loc.table.selectRow(index + 1)"
                  :model-value="selectedSet.has(item.key)"
                  @update:model-value="(checked) => toggleRow(item.key, checked)"
                />
              </td>
              <td
                v-for="(column, c) in columns"
                :key="column.key"
                :style="stickyStyle(column)"
                :title="column.ellipsis ? display(column, item.row) : undefined"
                :class="[
                  `ml-table__cell--${column.align ?? 'left'}`,
                  {
                    'ml-table__cell--mono': column.mono,
                    'ml-table__cell--ellipsis': column.ellipsis,
                    'ml-table__fixed': column.fixed,
                    'ml-table__fixed--last-left': column.key === lastLeft,
                    'ml-table__fixed--first-right': column.key === firstRight,
                  },
                ]"
              >
                <MlPaw v-if="hoverPaw && isFirst(c)" tone="current" class="ml-table__paw" />
                <span v-if="isTree && isFirst(c)" class="ml-table__tree" :style="{ '--_level': item.level }">
                  <button
                    v-if="item.hasChildren"
                    type="button"
                    class="ml-table__tree-toggle"
                    :aria-label="treeOpenSet.has(item.key) ? loc.table.collapse : loc.table.expand"
                    @click.stop="toggleTree(item.key)"
                  >
                    <MlIcon name="chevronRight" />
                  </button>
                  <span v-else class="ml-table__tree-leaf" aria-hidden="true" />
                </span>
                <slot :name="`cell-${column.key}`" :row="item.row" :value="item.row[column.key]" :index="index" :level="item.level">
                  {{ display(column, item.row) }}
                </slot>
              </td>
            </tr>
            <tr v-if="hasExpand && expandedSet.has(item.key)" class="ml-table__detail-row">
              <td :colspan="columnCount">
                <div class="ml-table__detail">
                  <slot name="expand" :row="item.row" :index="index" />
                </div>
              </td>
            </tr>
          </template>
          <tr v-if="!view.length && !loading" class="ml-table__empty-row">
            <td :colspan="columnCount">
              <slot name="empty">
                <div class="ml-table__empty">
                  <span class="ml-table__empty-trail" aria-hidden="true">
                    <MlPaw v-for="n in 4" :key="n" tone="current" />
                  </span>
                  <p>{{ emptyText ?? loc.table.empty }}</p>
                </div>
              </slot>
            </td>
          </tr>
          <tr v-if="!view.length && loading" class="ml-table__empty-row">
            <td :colspan="columnCount"><div class="ml-table__empty" /></td>
          </tr>
        </tbody>
      </table>
    </div>
    <footer v-if="pageSize && pageCount > 1" class="ml-table__footer">
      <span class="ml-table__count">{{ loc.table.total(sortedTop.length) }}</span>
      <MlPagination v-model:page="page" :total="pageCount" />
    </footer>
    <div v-if="loading" class="ml-table__overlay">
      <MlLoader variant="paws" :size="40" :label="loc.common.loading" />
    </div>
  </div>
</template>
