<script setup lang="ts">
import { computed, ref, useId } from 'vue'
import MlButton from './MlButton.vue'
import MlCheckbox from './MlCheckbox.vue'
import MlIcon from './MlIcon.vue'
import MlPaw from './MlPaw.vue'
import type { MlTransferItem } from '../types'
import { useLocale } from '../locale'

const loc = useLocale()

type Key = string | number
type Side = 'left' | 'right'

const props = withDefaults(
  defineProps<{
    data: MlTransferItem[]
    /** [left title, right title] */
    titles?: [string, string]
    /** Search box above each list. */
    filterable?: boolean
    filterPlaceholder?: string
    /** Text on the move buttons; icons only when omitted. */
    buttonTexts?: [string, string]
    emptyText?: string
  }>(),
  {},
)

/** Column titles: the prop, else the locale's. */
const heads = computed(() => props.titles ?? loc.value.transfer.titles)

const emit = defineEmits<{ change: [keys: Key[], direction: Side, moved: Key[]] }>()
/** Keys of the items in the right-hand list. */
const model = defineModel<Key[]>({ default: () => [] })

const id = `ml-transfer-${useId()}`
const checked = ref<Record<Side, Key[]>>({ left: [], right: [] })
const query = ref<Record<Side, string>>({ left: '', right: '' })

const rightSet = computed(() => new Set(model.value))
const items = computed<Record<Side, MlTransferItem[]>>(() => ({
  left: props.data.filter((d) => !rightSet.value.has(d.key)),
  // Keep the right side in the order the keys were added.
  right: model.value.map((k) => props.data.find((d) => d.key === k)).filter((d): d is MlTransferItem => !!d),
}))

function visible(side: Side) {
  const q = query.value[side].trim().toLowerCase()
  return q ? items.value[side].filter((d) => d.label.toLowerCase().includes(q)) : items.value[side]
}

function isChecked(side: Side, key: Key) {
  return checked.value[side].includes(key)
}

function toggle(side: Side, item: MlTransferItem, on: boolean) {
  if (item.disabled) return
  checked.value[side] = on ? [...checked.value[side], item.key] : checked.value[side].filter((k) => k !== item.key)
}

/** Select-all state over the *visible, enabled* items of one side. */
function allState(side: Side): boolean | 'mixed' {
  const pool = visible(side).filter((d) => !d.disabled)
  if (!pool.length) return false
  const on = pool.filter((d) => isChecked(side, d.key)).length
  return on === 0 ? false : on === pool.length ? true : 'mixed'
}

function toggleAll(side: Side) {
  const pool = visible(side).filter((d) => !d.disabled).map((d) => d.key)
  checked.value[side] =
    allState(side) === true
      ? checked.value[side].filter((k) => !pool.includes(k))
      : [...new Set([...checked.value[side], ...pool])]
}

function move(to: Side) {
  const from: Side = to === 'right' ? 'left' : 'right'
  const moving = checked.value[from].filter((k) => items.value[from].some((d) => d.key === k && !d.disabled))
  if (!moving.length) return
  const next = to === 'right' ? [...model.value, ...moving] : model.value.filter((k) => !moving.includes(k))
  model.value = next
  checked.value[from] = []
  emit('change', next, to, moving)
}

const sides: Side[] = ['left', 'right']
</script>

<template>
  <div class="ml-transfer">
    <template v-for="(side, s) in sides" :key="side">
      <section class="ml-transfer__panel" :aria-labelledby="`${id}-${side}-title`">
        <header class="ml-transfer__head">
          <MlCheckbox
            :model-value="allState(side) === true"
            :indeterminate="allState(side) === 'mixed'"
            :disabled="!visible(side).some((d) => !d.disabled)"
            :aria-label="loc.transfer.selectAll(heads[s])"
            @update:model-value="toggleAll(side)"
          />
          <span :id="`${id}-${side}-title`" class="ml-transfer__title">{{ heads[s] }}</span>
          <span class="ml-transfer__count">
            {{ checked[side].length ? `${checked[side].length} / ` : '' }}{{ items[side].length }}
          </span>
        </header>
        <div v-if="filterable" class="ml-transfer__search">
          <MlIcon name="search" />
          <input
            v-model="query[side]"
            type="search"
            :placeholder="filterPlaceholder ?? loc.transfer.filter"
            :aria-label="loc.transfer.searchIn(heads[s])"
          />
        </div>
        <TransitionGroup tag="ul" name="ml-transfer-item" class="ml-transfer__list" :aria-label="heads[s]">
          <li v-for="item in visible(side)" :key="item.key" class="ml-transfer__item">
            <MlCheckbox
              :model-value="isChecked(side, item.key)"
              :disabled="item.disabled"
              :hint="item.hint"
              @update:model-value="toggle(side, item, $event)"
            >
              <slot name="item" :item="item" :side="side">{{ item.label }}</slot>
            </MlCheckbox>
          </li>
        </TransitionGroup>
        <p v-if="!visible(side).length" class="ml-transfer__empty">
          <MlPaw tone="steel" />{{ query[side] ? loc.transfer.noMatch : emptyText ?? loc.transfer.empty }}
        </p>
      </section>
      <div v-if="s === 0" class="ml-transfer__actions">
        <MlButton
          size="sm"
          :square="!buttonTexts"
          :aria-label="buttonTexts ? undefined : loc.transfer.moveTo(heads[1])"
          :disabled="!checked.left.length"
          @click="move('right')"
        >
          <template v-if="buttonTexts">{{ buttonTexts[1] }}</template>
          <template #suffix><MlIcon name="arrowRight" /></template>
        </MlButton>
        <MlButton
          size="sm"
          variant="outline"
          :square="!buttonTexts"
          :aria-label="buttonTexts ? undefined : loc.transfer.moveBack(heads[0])"
          :disabled="!checked.right.length"
          @click="move('left')"
        >
          <template #prefix><MlIcon name="arrowLeft" /></template>
          <template v-if="buttonTexts">{{ buttonTexts[0] }}</template>
        </MlButton>
      </div>
    </template>
  </div>
</template>
