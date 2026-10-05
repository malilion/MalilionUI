<script setup lang="ts">
import { computed, ref, useId } from 'vue'
import MlButton from './MlButton.vue'
import MlCombobox from './MlCombobox.vue'
import MlDatePicker from './MlDatePicker.vue'
import MlDateRangePicker from './MlDateRangePicker.vue'
import MlField from './MlField.vue'
import MlIcon from './MlIcon.vue'
import MlInput from './MlInput.vue'
import MlSelect from './MlSelect.vue'
import { clearFilter, filterChips, isEmptyFilter, rangeInput, type MlFilterField, type MlFilterValue } from './filter'
import { useLocale } from '../locale'
import type { MlDateRange, MlSize } from '../types'

const loc = useLocale()

const props = withDefaults(
  defineProps<{
    fields?: MlFilterField[]
    /** Fields shown before "More filters"; the rest fold away. */
    collapse?: number
    /** Chips of the applied filters, each with its own ×. */
    chips?: boolean
    /** Search on every change instead of waiting for the button. */
    immediate?: boolean
    size?: MlSize
    /** Accessible name of the search region. Default "篩選". */
    label?: string
  }>(),
  { fields: () => [], collapse: Infinity, chips: true, immediate: false, size: 'md' },
)
const emit = defineEmits<{ search: [value: MlFilterValue]; reset: []; change: [value: MlFilterValue] }>()
defineSlots<{
  /** A custom control for one field: `#field-city="{ value, update }"`. */
  [name: `field-${string}`]: (props: { field: MlFilterField; value: unknown; update: (value: unknown) => void }) => unknown
  actions?: () => unknown
}>()

const model = defineModel<MlFilterValue>({ default: () => ({}) })
const expanded = ref(false)
const autoId = useId()

const visible = computed(() => (expanded.value ? props.fields : props.fields.slice(0, props.collapse)))
const folded = computed(() => Math.max(0, props.fields.length - props.collapse))
const applied = computed(() => (props.chips ? filterChips(props.fields, model.value, loc.value.name.toLowerCase().startsWith('zh') ? '、' : ', ') : []))
const count = computed(() => props.fields.filter((f) => !isEmptyFilter(model.value[f.key])).length)

function update(key: string, value: unknown) {
  const next = isEmptyFilter(value) ? clearFilter(model.value, key) : { ...model.value, [key]: value }
  model.value = next
  emit('change', next)
  if (props.immediate) emit('search', next)
}

function search() {
  emit('search', model.value)
}

function reset() {
  model.value = {}
  emit('change', {})
  emit('reset')
  emit('search', {})
}

function remove(key: string) {
  const next = clearFilter(model.value, key)
  model.value = next
  emit('change', next)
  emit('search', next)
}

const selectOptions = (f: MlFilterField) => [{ value: '', label: loc.value.filter.all }, ...(f.options ?? [])]
const rangeOf = (key: string) => (model.value[key] as [number | null, number | null] | undefined) ?? [null, null]
function setRange(key: string, end: 0 | 1, text: string) {
  const next = [...rangeOf(key)] as [number | null, number | null]
  next[end] = rangeInput(text)
  update(key, next)
}
</script>

<template>
  <form :class="['ml-filter', `ml-filter--${size}`]" role="search" :aria-label="label ?? loc.filter.label" @submit.prevent="search">
    <div class="ml-filter__fields">
      <div v-for="f in visible" :key="f.key" :class="['ml-filter__item', `ml-filter__item--${f.type}`]">
        <slot :name="`field-${f.key}`" :field="f" :value="model[f.key]" :update="(v: unknown) => update(f.key, v)">
          <MlInput
            v-if="f.type === 'text'"
            :model-value="(model[f.key] as string | undefined) ?? ''"
            :label="f.label"
            :placeholder="f.placeholder"
            :size="size"
            @update:model-value="update(f.key, $event)"
          />
          <MlSelect
            v-else-if="f.type === 'select'"
            :model-value="(model[f.key] as string | number | undefined) ?? ''"
            :options="selectOptions(f)"
            :label="f.label"
            :size="size"
            @update:model-value="update(f.key, $event)"
          />
          <MlCombobox
            v-else-if="f.type === 'multi'"
            :model-value="(model[f.key] as (string | number)[] | undefined) ?? []"
            :options="f.options ?? []"
            :label="f.label"
            :placeholder="f.placeholder ?? loc.filter.all"
            :size="size"
            multiple
            clearable
            @update:model-value="update(f.key, $event)"
          />
          <MlDatePicker
            v-else-if="f.type === 'date'"
            :model-value="(model[f.key] as Date | undefined) ?? null"
            :label="f.label"
            :placeholder="f.placeholder"
            clearable
            @update:model-value="update(f.key, $event)"
          />
          <MlDateRangePicker
            v-else-if="f.type === 'date-range'"
            :model-value="(model[f.key] as MlDateRange | undefined) ?? [null, null]"
            :label="f.label"
            clearable
            @update:model-value="update(f.key, $event)"
          />
          <MlField v-else-if="f.type === 'number-range'" :label="f.label" :control-id="`ml-filter-${autoId}-${f.key}`">
            <div class="ml-filter__range">
              <div :class="['ml-input', `ml-input--${size}`]">
                <input
                  :id="`ml-filter-${autoId}-${f.key}`"
                  class="ml-input__control"
                  type="number"
                  inputmode="decimal"
                  :placeholder="loc.filter.min"
                  :aria-label="`${f.label} ${loc.filter.min}`"
                  :value="rangeOf(f.key)[0] ?? ''"
                  @change="setRange(f.key, 0, ($event.target as HTMLInputElement).value)"
                />
              </div>
              <span class="ml-filter__dash" aria-hidden="true">–</span>
              <div :class="['ml-input', `ml-input--${size}`]">
                <input
                  class="ml-input__control"
                  type="number"
                  inputmode="decimal"
                  :placeholder="loc.filter.max"
                  :aria-label="`${f.label} ${loc.filter.max}`"
                  :value="rangeOf(f.key)[1] ?? ''"
                  @change="setRange(f.key, 1, ($event.target as HTMLInputElement).value)"
                />
              </div>
            </div>
          </MlField>
        </slot>
      </div>
      <div class="ml-filter__actions">
        <MlButton type="submit" :size="size">
          <MlIcon name="search" />{{ loc.filter.search }}
        </MlButton>
        <MlButton variant="ghost" :size="size" @click="reset">{{ loc.filter.reset }}</MlButton>
        <button v-if="folded" type="button" class="ml-filter__more" :aria-expanded="expanded" @click="expanded = !expanded">
          {{ expanded ? loc.filter.less : loc.filter.more(folded) }}
          <MlIcon name="chevronDown" :class="{ 'ml-filter__chevron--up': expanded }" />
        </button>
        <slot name="actions" />
      </div>
    </div>
    <div v-if="applied.length" class="ml-filter__chips">
      <span class="ml-filter__count">{{ loc.filter.applied(count) }}</span>
      <span v-for="c in applied" :key="c.field.key" class="ml-filter__chip">
        <span class="ml-filter__chip-label">{{ c.field.label }}</span>
        <span class="ml-filter__chip-value">{{ c.text }}</span>
        <button type="button" class="ml-filter__chip-x" :aria-label="loc.filter.clear(c.field.label)" @click="remove(c.field.key)">
          <MlIcon name="close" />
        </button>
      </span>
      <button v-if="applied.length > 1" type="button" class="ml-filter__clear" @click="reset">{{ loc.filter.clearAll }}</button>
    </div>
  </form>
</template>
