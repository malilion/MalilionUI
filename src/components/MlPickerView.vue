<script setup lang="ts">
// iOS-style wheel picker. The rows are rendered here; the wheel physics,
// input handling and per-frame painting live in ./picker-wheel (shared with React).
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { useLocale } from '../locale'
import {
  PickerColumn,
  pickValues,
  resolvePicker,
  rowHidden,
  rowTransform,
  sameValues,
  wheelGeometry,
  type MlPickerColumns,
  type MlPickerOption,
  type MlPickerValue,
  type PickerResolved,
  type PickerSource,
} from './picker-wheel'

const loc = useLocale()

const props = withDefaults(
  defineProps<{
    /** Independent columns — or a function of the current values (see datePickerColumns). */
    columns?: MlPickerColumns
    /** Cascading tree: each column holds the children of the previous pick. Wins over `columns`. */
    options?: MlPickerOption[]
    /** Rows in view (odd, ≥ 3). */
    visibleCount?: number
    /** Row height in px. */
    itemHeight?: number
    /** Accessible name of each column, e.g. ['年', '月', '日']. */
    labels?: string[]
    /** Accessible name of the whole picker. */
    label?: string
    /** Toolbar title; giving one shows the toolbar. */
    title?: string
    /** Show the 取消 / 確定 toolbar. */
    toolbar?: boolean
    cancelText?: string
    confirmText?: string
    disabled?: boolean
  }>(),
  { visibleCount: 5, itemHeight: 44 },
)

const emit = defineEmits<{
  /** A column came to rest on a new row (drag, fling, wheel, tap, keys). */
  change: [values: MlPickerValue[], selected: MlPickerOption[], column: number]
  confirm: [values: MlPickerValue[], selected: MlPickerOption[]]
  cancel: []
}>()

/** One value per column. */
const model = defineModel<MlPickerValue[]>({ default: () => [] })

const geo = computed(() => wheelGeometry(props.itemHeight, props.visibleCount))
const source = computed(() => ({ columns: props.columns, options: props.options }))

/** Last rows per column, so a vanished value (31 → Feb) keeps its place. */
let hints: number[] = []
const resolved = computed(() => resolvePicker(source.value, model.value ?? [], hints))
/** Freshest resolution, updated synchronously on every pick (before the parent re-renders). */
let latest: PickerResolved = resolved.value
const announce = ref('')

const selectedOf = (r: PickerResolved) => r.selected.filter((o): o is MlPickerOption => !!o)

function onSelect(column: number, index: number, from: PickerSource) {
  const before = latest
  const next = pickValues(source.value, before, column, index)
  latest = next
  hints = next.indexes
  model.value = next.values
  emit('change', next.values, selectedOf(next), column)
  // Keyboard users hear the spinbutton's own value; say it when other columns moved too.
  const cascaded = next.values.some((v, c) => c > column && v !== before.values[c]) || next.values.length !== before.values.length
  if (from !== 'keyboard' || cascaded) announce.value = loc.value.pickerView.selected(selectedOf(next).map((o) => o.label))
}

const columnEls = shallowRef<HTMLElement[]>([])
const setColumnEl = (c: number) => (el: unknown) => {
  if (el) columnEls.value[c] = el as HTMLElement
}
let controllers: PickerColumn[] = []
let shownColumns: MlPickerOption[][] = []

const sameList = (a: MlPickerOption[] | undefined, b: MlPickerOption[]) =>
  a === b || (!!a && a.length === b.length && a.every((o, i) => o.value === b[i].value && !!o.disabled === !!b[i].disabled))

function config(c: number) {
  const list = resolved.value.columns[c] ?? []
  return {
    itemHeight: geo.value.itemHeight,
    visibleCount: geo.value.count,
    labels: list.map((o) => o.label),
    isDisabled: (i: number) => !!list[i]?.disabled,
    disabled: props.disabled,
  }
}

/** After every render: one controller per column, told about new rows and values. */
function syncControllers() {
  const r = resolved.value
  const count = r.columns.length
  while (controllers.length > count) controllers.pop()!.destroy()
  for (let c = 0; c < count; c++) {
    const el = columnEls.value[c]
    if (!el) continue
    if (!controllers[c] || controllers[c].el !== el) {
      controllers[c]?.destroy()
      controllers[c] = new PickerColumn(el, config(c), r.indexes[c], (i, from) => onSelect(c, i, from))
      continue
    }
    const animate = sameList(shownColumns[c], r.columns[c])
    controllers[c].update(config(c))
    controllers[c].sync(r.indexes[c], animate)
  }
  columnEls.value.length = count
  shownColumns = r.columns
}

watch(
  resolved,
  (r) => {
    latest = r
    hints = r.indexes
    // Out-of-range / vanished values snap to a real row; tell the parent.
    if ((model.value?.length ?? 0) > 0 && !sameValues(r.values, model.value)) model.value = r.values
  },
  { immediate: true },
)
watch([resolved, () => props.disabled, geo], () => syncControllers(), { flush: 'post' })

onMounted(() => nextTick(syncControllers))
onBeforeUnmount(() => {
  for (const ctl of controllers) ctl.destroy()
  controllers = []
})

const showToolbar = computed(() => props.toolbar || !!props.title)

function confirm() {
  for (const ctl of controllers) ctl.finish()
  emit('confirm', [...latest.values], selectedOf(latest))
}

function itemStyle(i: number, c: number) {
  const hide = rowHidden(i, Math.max(0, resolved.value.indexes[c]), geo.value)
  return `transform:${rowTransform(i, geo.value)}${hide ? ';visibility:hidden' : ''}`
}

function itemClass(option: MlPickerOption, i: number, c: number) {
  let cls = 'ml-picker-view__item'
  if (i === resolved.value.indexes[c]) cls += ' ml-picker-view__item--selected'
  if (option.disabled) cls += ' ml-picker-view__item--disabled'
  return cls
}

defineExpose({
  /** Stop any motion, then emit `confirm` with the values in the band. */
  confirm,
  /** The options currently in the band. */
  getSelectedOptions: () => selectedOf(latest),
})
</script>

<template>
  <div :class="['ml-picker-view', { 'ml-picker-view--disabled': disabled }]" role="group" :aria-label="label ?? title ?? loc.pickerView.label">
    <div v-if="showToolbar || $slots.title" class="ml-picker-view__toolbar">
      <button type="button" class="ml-picker-view__action ml-picker-view__action--cancel" @click="emit('cancel')">
        {{ cancelText ?? loc.pickerView.cancel }}
      </button>
      <div class="ml-picker-view__title"><slot name="title">{{ title }}</slot></div>
      <button type="button" class="ml-picker-view__action ml-picker-view__action--confirm" :disabled="disabled" @click="confirm">
        {{ confirmText ?? loc.pickerView.confirm }}
      </button>
    </div>
    <div
      class="ml-picker-view__wheels"
      :style="{ '--_item': `${geo.itemHeight}px`, '--_rows': geo.count, '--_radius': `${geo.radius}px` }"
    >
      <div class="ml-picker-view__band" aria-hidden="true" />
      <div
        v-for="(list, c) in resolved.columns"
        :key="c"
        :ref="setColumnEl(c)"
        class="ml-picker-view__column"
        role="spinbutton"
        :tabindex="disabled ? -1 : 0"
        :aria-label="labels?.[c] ?? loc.pickerView.column(c + 1)"
        :aria-valuemin="list.length ? 1 : undefined"
        :aria-valuemax="list.length || undefined"
        :aria-valuenow="resolved.indexes[c] >= 0 ? resolved.indexes[c] + 1 : undefined"
        :aria-valuetext="list[resolved.indexes[c]]?.label"
        :aria-disabled="disabled || undefined"
      >
        <ul class="ml-picker-view__track" aria-hidden="true">
          <li v-for="(option, i) in list" :key="`${i}:${option.value}`" :class="itemClass(option, i, c)" :style="itemStyle(i, c)">
            <slot name="option" :option="option" :column="c" :index="i">{{ option.label }}</slot>
          </li>
        </ul>
      </div>
    </div>
    <span class="ml-visually-hidden" aria-live="polite">{{ announce }}</span>
  </div>
</template>
