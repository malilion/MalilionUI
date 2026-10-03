<script setup lang="ts" generic="Item extends Record<string, any>">
import { useId, watch } from 'vue'
import MlSortable from './MlSortable.vue'
import { useLocale } from '../locale'
import type { MlKanbanColumn } from '../types'

const loc = useLocale()

withDefaults(
  defineProps<{
    /** Field name or function giving each card a stable key. */
    itemKey?: string | ((item: Item) => string | number)
    /** Text for screen-reader announcements. */
    itemLabel?: (item: Item) => string
    /** Drag cards only by their grip. */
    handle?: boolean
    disabled?: boolean
  }>(),
  { itemKey: 'id' },
)

const emit = defineEmits<{
  move: [event: { item: Item; from: string; to: string; newIndex: number }]
}>()

const columns = defineModel<MlKanbanColumn<Item>[]>({ default: () => [] })
const group = `ml-kanban-${useId()}`

// A cross-column drop updates two columns back to back, faster than v-model
// round-trips through the parent, so build each update on the latest copy.
let latest = columns.value
watch(columns, (value) => (latest = value))

function setItems(key: string, items: Item[]) {
  latest = latest.map((c) => (c.key === key ? { ...c, items } : c))
  columns.value = latest
}

function onChange(fromKey: string, e: { item: Item; newIndex: number }) {
  const toKey = latest.find((c) => c.items.includes(e.item))?.key ?? fromKey
  emit('move', { item: e.item, from: fromKey, to: toKey, newIndex: e.newIndex })
}
</script>

<template>
  <div class="ml-kanban">
    <section
      v-for="column in columns"
      :key="column.key"
      :class="['ml-kanban__col', column.tone && `ml-kanban__col--${column.tone}`]"
      :aria-label="column.title"
    >
      <header class="ml-kanban__head">
        <h3 class="ml-kanban__title">{{ column.title }}</h3>
        <span
          :class="['ml-kanban__count', { 'ml-kanban__count--full': column.limit !== undefined && column.items.length >= column.limit }]"
          :title="column.limit !== undefined && column.items.length >= column.limit ? loc.kanban.full : undefined"
        >{{ loc.kanban.count(column.items.length, column.limit) }}</span>
        <slot name="column-actions" :column="column" />
      </header>
      <MlSortable
        :model-value="column.items"
        :group="group"
        :item-key="itemKey"
        :item-label="itemLabel"
        :handle="handle"
        :disabled="disabled"
        :max="column.limit"
        class="ml-kanban__list"
        @update:model-value="(items: Item[]) => setItems(column.key, items)"
        @change="(e) => onChange(column.key, e as never)"
      >
        <template #default="{ item, index }">
          <div class="ml-kanban__card"><slot name="card" :item="item as Item" :index="index" :column="column" /></div>
        </template>
        <template #empty>
          <p class="ml-kanban__empty">{{ loc.kanban.empty }}</p>
        </template>
      </MlSortable>
      <footer v-if="$slots['column-footer']" class="ml-kanban__foot"><slot name="column-footer" :column="column" /></footer>
    </section>
  </div>
</template>
