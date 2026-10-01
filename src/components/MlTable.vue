<script setup lang="ts" generic="Row extends Record<string, any>">
import { computed } from 'vue'
import MlCheckbox from './MlCheckbox.vue'
import MlLoader from './MlLoader.vue'
import MlPaw from './MlPaw.vue'
import type { MlTableColumn, MlTableSort } from '../types'

type Key = string | number

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
  }>(),
  { rowKey: 'id', hoverPaw: true, emptyText: '這裡還沒有獵物' },
)

const emit = defineEmits<{ 'row-click': [row: Row] }>()
const sort = defineModel<MlTableSort | null>('sort', { default: null })
const selected = defineModel<Key[]>('selected', { default: () => [] })

const keyOf = (row: Row): Key =>
  typeof props.rowKey === 'function' ? props.rowKey(row) : (row[props.rowKey] as Key)

const collator = new Intl.Collator('zh-Hant', { numeric: true, sensitivity: 'base' })

const isEmpty = (value: unknown) => value === null || value === undefined || value === ''

function compare(a: unknown, b: unknown): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime()
  return collator.compare(String(a), String(b))
}

const view = computed(() => {
  const current = sort.value
  if (!current || props.manualSort) return props.rows
  const direction = current.order === 'asc' ? 1 : -1
  return [...props.rows].sort((rowA, rowB) => {
    const a = rowA[current.key]
    const b = rowB[current.key]
    // Empty cells sink to the bottom whichever way we sort.
    if (isEmpty(a) || isEmpty(b)) return Number(isEmpty(a)) - Number(isEmpty(b))
    return compare(a, b) * direction
  })
})

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

const selectedSet = computed(() => new Set(selected.value))
const visibleKeys = computed(() => view.value.map(keyOf))
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

function toggleRow(row: Row, checked: boolean) {
  const key = keyOf(row)
  selected.value = checked ? [...selected.value, key] : selected.value.filter((k) => k !== key)
}

function display(column: MlTableColumn<Row>, row: Row) {
  const value = row[column.key]
  if (column.format) return column.format(value, row)
  return value === null || value === undefined ? '—' : String(value)
}

const columnCount = computed(() => props.columns.length + (props.selectable ? 1 : 0))
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
      },
    ]"
  >
    <div class="ml-table__scroll">
      <table class="ml-table__table" :aria-busy="loading || undefined">
        <caption v-if="caption" class="ml-table__caption">{{ caption }}</caption>
        <thead>
          <tr>
            <th v-if="selectable" class="ml-table__select" scope="col">
              <MlCheckbox
                paw
                aria-label="全選"
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
              :style="column.width ? { width: column.width } : undefined"
              :class="[
                `ml-table__cell--${column.align ?? 'left'}`,
                { 'ml-table__th--sorted': sort?.key === column.key },
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
          <tr
            v-for="(row, index) in view"
            :key="keyOf(row)"
            :class="{ 'ml-table__row--selected': selectedSet.has(keyOf(row)) }"
            @click="emit('row-click', row)"
          >
            <td v-if="selectable" class="ml-table__select" @click.stop>
              <MlCheckbox
                paw
                :aria-label="`選取第 ${index + 1} 列`"
                :model-value="selectedSet.has(keyOf(row))"
                @update:model-value="(checked) => toggleRow(row, checked)"
              />
            </td>
            <td
              v-for="(column, c) in columns"
              :key="column.key"
              :class="[`ml-table__cell--${column.align ?? 'left'}`, { 'ml-table__cell--mono': column.mono }]"
            >
              <MlPaw v-if="hoverPaw && c === 0" tone="current" class="ml-table__paw" />
              <slot :name="`cell-${column.key}`" :row="row" :value="row[column.key]" :index="index">
                {{ display(column, row) }}
              </slot>
            </td>
          </tr>
          <tr v-if="!view.length && !loading" class="ml-table__empty-row">
            <td :colspan="columnCount">
              <slot name="empty">
                <div class="ml-table__empty">
                  <span class="ml-table__empty-trail" aria-hidden="true">
                    <MlPaw v-for="n in 4" :key="n" tone="current" />
                  </span>
                  <p>{{ emptyText }}</p>
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
    <div v-if="loading" class="ml-table__overlay">
      <MlLoader variant="paws" :size="40" label="Loading" />
    </div>
  </div>
</template>
