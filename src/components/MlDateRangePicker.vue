<script setup lang="ts">
import { computed, nextTick, ref, useId } from 'vue'
import MlCalendar from './MlCalendar.vue'
import MlField from './MlField.vue'
import MlIcon from './MlIcon.vue'
import { describedBy, useOutsidePointer } from '../composables'
import { useFormField } from '../form'
import { useLocale } from '../locale'
import type { MlDateRange, MlRangePreset } from '../types'

const loc = useLocale()

const props = withDefaults(
  defineProps<{
    label?: string
    hint?: string
    error?: string
    index?: string
    startPlaceholder?: string
    endPlaceholder?: string
    min?: Date
    max?: Date
    disabledDate?: (date: Date) => boolean
    markers?: Date[]
    locale?: string
    weekStartsOn?: 0 | 1
    /** Intl options used to display each end of the range. */
    format?: Intl.DateTimeFormatOptions
    /** Quick picks beside the calendar. Pass [] to hide them. */
    presets?: MlRangePreset[]
    clearable?: boolean
    disabled?: boolean
    placement?: 'bottom-start' | 'bottom-end'
    id?: string
  }>(),
  {
    weekStartsOn: 0,
    format: () => ({ year: 'numeric', month: '2-digit', day: '2-digit' }),
    placement: 'bottom-start',
  },
)

const emit = defineEmits<{ change: [range: MlDateRange] }>()
const model = defineModel<MlDateRange>({ default: () => [null, null] })
const { fieldError, fieldRequired } = useFormField(props)
const presetList = computed(() => props.presets ?? defaultPresets(loc.value))

const open = ref(false)
const root = ref<HTMLElement>()
const trigger = ref<HTMLButtonElement>()
const calendar = ref<InstanceType<typeof MlCalendar>>()
/** The range being picked inside the panel; committed once both ends are set. */
const draft = ref<MlDateRange>([null, null])
const autoId = useId()
const controlId = computed(() => props.id ?? `ml-daterange-${autoId}`)
const panelId = `${controlId.value}-panel`

const fmt = (d: Date | null) => (d ? new Intl.DateTimeFormat(props.locale ?? loc.value.name, props.format).format(d) : '')
const hasValue = computed(() => !!(model.value[0] || model.value[1]))
const days = computed(() => {
  const [a, b] = model.value
  return a && b ? Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / 86_400_000) + 1 : 0
})

async function show() {
  if (props.disabled) return
  draft.value = [...model.value]
  open.value = true
  await nextTick()
  calendar.value?.focus()
}

function hide(returnFocus = true) {
  open.value = false
  if (returnFocus) trigger.value?.focus()
}

function commit(range: MlDateRange) {
  model.value = range
  emit('change', range)
  hide()
}

function onDraft(range: MlDateRange) {
  draft.value = range
  if (range[0] && range[1]) commit(range)
}

function applyPreset(preset: MlRangePreset) {
  commit(typeof preset.value === 'function' ? preset.value() : preset.value)
}

function clear() {
  model.value = [null, null]
  emit('change', model.value)
  trigger.value?.focus()
}

function onPanelKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.stopPropagation()
    hide()
  }
}

useOutsidePointer(root, () => open.value, () => hide(false))
</script>

<script lang="ts">
import { addDays, startOfDay } from './dates'
import type { MlLocale } from '../locale'

const today = () => startOfDay(new Date())
const defaultPresets = (t: MlLocale): MlRangePreset[] => [
  { label: t.date.today, value: () => [today(), today()] },
  { label: t.date.last7, value: () => [addDays(today(), -6), today()] },
  { label: t.date.last30, value: () => [addDays(today(), -29), today()] },
  {
    label: t.date.thisMonth,
    value: () => {
      const t = today()
      return [new Date(t.getFullYear(), t.getMonth(), 1), new Date(t.getFullYear(), t.getMonth() + 1, 0)]
    },
  },
  {
    label: t.date.lastMonth,
    value: () => {
      const t = today()
      return [new Date(t.getFullYear(), t.getMonth() - 1, 1), new Date(t.getFullYear(), t.getMonth(), 0)]
    },
  },
]
</script>

<template>
  <MlField :control-id="controlId" :label="label" :hint="hint" :error="fieldError" :index="index" :required="fieldRequired">
    <div ref="root" class="ml-datepicker ml-daterange">
      <div :class="['ml-input', { 'ml-input--error': fieldError, 'ml-input--disabled': disabled }]">
        <span class="ml-input__affix"><MlIcon name="calendar" /></span>
        <button
          :id="controlId"
          ref="trigger"
          type="button"
          class="ml-input__control ml-datepicker__trigger ml-daterange__trigger"
          aria-haspopup="dialog"
          :aria-expanded="open"
          :aria-controls="open ? panelId : undefined"
          :aria-invalid="fieldError ? true : undefined"
          :aria-describedby="describedBy(controlId, hint, fieldError)"
          :disabled="disabled"
          @click="open ? hide() : show()"
        >
          <span :class="{ 'ml-datepicker__placeholder': !model[0] }">{{ fmt(model[0]) || (startPlaceholder ?? loc.date.rangeStart) }}</span>
          <MlIcon name="arrowRight" class="ml-daterange__arrow" />
          <span :class="{ 'ml-datepicker__placeholder': !model[1] }">{{ fmt(model[1]) || (endPlaceholder ?? loc.date.rangeEnd) }}</span>
        </button>
        <span v-if="days" class="ml-daterange__days" aria-hidden="true">{{ loc.date.days(days) }}</span>
        <button
          v-if="clearable && hasValue && !disabled"
          type="button"
          class="ml-datepicker__clear"
          :aria-label="loc.date.clearRange"
          @click="clear"
        >
          <MlIcon name="close" />
        </button>
      </div>
      <Transition name="ml-dropdown">
        <div
          v-if="open"
          :id="panelId"
          role="dialog"
          :aria-label="loc.date.pickRange"
          :class="['ml-datepicker__panel', 'ml-daterange__panel', `ml-datepicker__panel--${placement}`]"
          @keydown="onPanelKeydown"
        >
          <ul v-if="presetList.length" class="ml-daterange__presets" :aria-label="loc.date.presets">
            <li v-for="preset in presetList" :key="preset.label">
              <button type="button" class="ml-daterange__preset" @click="applyPreset(preset)">{{ preset.label }}</button>
            </li>
          </ul>
          <div class="ml-daterange__cal">
            <MlCalendar
              ref="calendar"
              mode="range"
              :range="draft"
              :min="min"
              :max="max"
              :disabled-date="disabledDate"
              :markers="markers"
              :locale="locale"
              :week-starts-on="weekStartsOn"
              @update:range="onDraft"
            />
            <p class="ml-daterange__status" aria-live="polite">
              {{ draft[0] && !draft[1] ? loc.date.pickEnd(fmt(draft[0])) : loc.date.pickStart }}
            </p>
          </div>
        </div>
      </Transition>
    </div>
  </MlField>
</template>
