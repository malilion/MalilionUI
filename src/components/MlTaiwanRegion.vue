<script setup lang="ts">
import { computed, ref, useId, watch } from 'vue'
import MlCombobox from './MlCombobox.vue'
import MlField from './MlField.vue'
import MlIcon from './MlIcon.vue'
import { describedBy, useSplitAttrs } from '../composables'
import { useFormField } from '../form'
import { useLocale } from '../locale'
import { getTaiwanCounty, matchTaiwanDistrict, type MlTaiwanRegionValue, type TaiwanDistrict } from '../taiwan-regions'
import type { MlSelectOption, MlSize } from '../types'
import {
  countyLabel,
  districtLabel,
  regionCounties,
  regionKey,
  regionLang,
  resolveRegion,
  searchLabel,
  toValue,
  type RegionLang,
} from './region'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    /** `select`: two linked selects (縣市 → 鄉鎮市區). `search`: one searchable field. */
    variant?: 'select' | 'search'
    /** Show the 3-digit postal code next to each 鄉鎮市區. */
    zip?: boolean
    /** Also offer 釣魚臺 (290), 東沙群島 (817) and 南沙群島 (819). */
    includeIslands?: boolean
    /** Names in Chinese or English. Default: follows the locale (zh-* → Chinese). */
    lang?: RegionLang
    clearable?: boolean
    label?: string
    hint?: string
    error?: string
    index?: string
    size?: MlSize
    required?: boolean
    disabled?: boolean
    id?: string
    countyPlaceholder?: string
    districtPlaceholder?: string
    /** Placeholder of the search variant. */
    placeholder?: string
    noMatchText?: string
  }>(),
  { variant: 'select', zip: true, size: 'md' },
)

const emit = defineEmits<{ change: [value: MlTaiwanRegionValue | null, district: TaiwanDistrict | null] }>()
const model = defineModel<MlTaiwanRegionValue | null>({ default: null })

const loc = useLocale()
const { fieldError, fieldRequired } = useFormField(props)
const { rootAttrs, controlAttrs } = useSplitAttrs()
const autoId = useId()
const controlId = computed(() => props.id ?? `ml-region-${autoId}`)
const lang = computed(() => regionLang(loc.value.name, props.lang))

const counties = computed(() => regionCounties(props.includeIslands))
const current = computed(() => resolveRegion(model.value))

/** The 縣市 picked before a 鄉鎮市區 is — the value stays null until both are chosen. */
const pendingCounty = ref('')
let emitted: MlTaiwanRegionValue | null | undefined
watch(
  model,
  (value) => {
    if (value === emitted) return
    pendingCounty.value = value?.county ? (getTaiwanCounty(value.county, { includeIslands: true })?.name ?? '') : ''
  },
  { immediate: true },
)
const county = computed(() => current.value?.county ?? pendingCounty.value)
const districts = computed(() => counties.value.find((c) => c.name === county.value)?.districts ?? [])

function commit(d: TaiwanDistrict | undefined) {
  const value = d ? toValue(d) : null
  emitted = value
  model.value = value
  emit('change', value, d ?? null)
}

// v-model on the native selects (not :value) so SSR marks the chosen <option selected>.
const countyModel = computed({
  get: () => county.value,
  set: (name: string) => {
    pendingCounty.value = name
    if (model.value) commit(undefined)
  },
})
const districtModel = computed({
  get: () => current.value?.name ?? '',
  set: (name: string) => commit(districts.value.find((d) => d.name === name)),
})

function clear() {
  pendingCounty.value = ''
  commit(undefined)
}

/* ── search variant ───────────────────────────────────── */
const byKey = computed(() => {
  const map = new Map<string, TaiwanDistrict>()
  for (const c of counties.value) for (const d of c.districts) map.set(regionKey(d.county, d.name), d)
  return map
})
const searchOptions = computed<MlSelectOption[]>(() =>
  [...byKey.value].map(([value, d]) => ({ value, label: searchLabel(d, lang.value, props.zip) })),
)
const searchValue = computed(() => (current.value ? regionKey(current.value.county, current.value.name) : null))
const filter = (option: MlSelectOption, query: string) => {
  const d = byKey.value.get(String(option.value))
  return !!d && matchTaiwanDistrict(d, query)
}
function onSearch(value: unknown) {
  commit(typeof value === 'string' ? byKey.value.get(value) : undefined)
}
</script>

<template>
  <MlCombobox
    v-if="variant === 'search'"
    v-bind="$attrs"
    :id="id"
    :model-value="searchValue"
    :options="searchOptions"
    :filter="filter"
    searchable
    :clearable="clearable"
    :label="label"
    :hint="hint"
    :error="error"
    :index="index"
    :size="size"
    :required="required"
    :disabled="disabled"
    :placeholder="placeholder ?? loc.region.search"
    :no-match-text="noMatchText"
    @update:model-value="onSearch"
  >
    <template v-if="$slots.label" #label><slot name="label" /></template>
    <template #prefix><MlIcon name="search" /></template>
  </MlCombobox>
  <MlField
    v-else
    v-bind="rootAttrs()"
    :control-id="controlId"
    :label="label"
    :hint="hint"
    :error="fieldError"
    :index="index"
    :required="fieldRequired"
  >
    <template v-if="$slots.label" #label><slot name="label" /></template>
    <div :class="['ml-region', { 'ml-region--clearable': clearable }]">
      <div
        :class="[
          'ml-input',
          `ml-input--${size}`,
          'ml-region__county',
          { 'ml-input--error': fieldError, 'ml-input--disabled': disabled },
        ]"
      >
        <select
          :id="controlId"
          v-bind="controlAttrs()"
          class="ml-input__control"
          v-model="countyModel"
          :required="fieldRequired"
          :disabled="disabled"
          :aria-label="label || $slots.label ? undefined : loc.region.county"
          :aria-invalid="fieldError ? true : undefined"
          :aria-describedby="describedBy(controlId, hint, fieldError)"
        >
          <option value="" disabled>{{ countyPlaceholder ?? loc.region.pickCounty }}</option>
          <option v-for="c in counties" :key="c.name" :value="c.name">{{ countyLabel(c, lang) }}</option>
        </select>
        <MlIcon name="chevronDown" class="ml-input__chevron" />
      </div>
      <div
        :class="[
          'ml-input',
          `ml-input--${size}`,
          'ml-region__district',
          { 'ml-input--error': fieldError, 'ml-input--disabled': disabled || !county },
        ]"
      >
        <select
          :id="`${controlId}-district`"
          class="ml-input__control"
          v-model="districtModel"
          :required="fieldRequired"
          :disabled="disabled || !county"
          :aria-label="label ? `${label} ${loc.region.district}` : loc.region.district"
          :aria-invalid="fieldError ? true : undefined"
          :aria-describedby="describedBy(controlId, hint, fieldError)"
        >
          <option value="" disabled>{{ districtPlaceholder ?? loc.region.pickDistrict }}</option>
          <option v-for="d in districts" :key="d.name" :value="d.name">{{ districtLabel(d, lang, zip) }}</option>
        </select>
        <MlIcon name="chevronDown" class="ml-input__chevron" />
      </div>
      <button
        v-if="clearable && county && !disabled"
        type="button"
        class="ml-region__clear"
        :aria-label="loc.common.clear"
        @click="clear"
      >
        <MlIcon name="close" />
      </button>
    </div>
  </MlField>
</template>
