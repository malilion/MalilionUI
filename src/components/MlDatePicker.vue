<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, useId, watch } from 'vue'
import MlCalendar from './MlCalendar.vue'
import MlField from './MlField.vue'
import MlIcon from './MlIcon.vue'
import MlPeriodPanel from './MlPeriodPanel.vue'
import { formatPeriod } from './dates'
import { describedBy } from '../composables'
import { useFormField } from '../form'
import { useLocale } from '../locale'
import type { MlDatePickerType } from '../types'

const loc = useLocale()

const props = withDefaults(
  defineProps<{
    label?: string
    hint?: string
    error?: string
    index?: string
    placeholder?: string
    min?: Date
    max?: Date
    disabledDate?: (date: Date) => boolean
    markers?: Date[]
    locale?: string
    weekStartsOn?: 0 | 1
    /** Intl options used to display the chosen date. */
    format?: Intl.DateTimeFormatOptions
    clearable?: boolean
    disabled?: boolean
    placement?: 'bottom-start' | 'bottom-end'
    id?: string
    /**
     * What to pick. For 'month' / 'quarter' / 'year' the value is the first day
     * of the chosen period (2026 Q4 → 2026-10-01).
     */
    type?: MlDatePickerType
  }>(),
  {
    weekStartsOn: 0,
    placement: 'bottom-start',
    type: 'date',
  },
)
const DATE_FORMAT: Intl.DateTimeFormatOptions = { year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' }
const { fieldError, fieldRequired } = useFormField(props)

const model = defineModel<Date | null>({ default: null })
const open = ref(false)
const root = ref<HTMLElement>()
const trigger = ref<HTMLButtonElement>()
const calendar = ref<{ focus(): void }>()
const autoId = useId()
const controlId = computed(() => props.id ?? `ml-datepicker-${autoId}`)
const panelId = `${controlId.value}-panel`

const display = computed(() => {
  if (!model.value) return ''
  // Periods use the locale's wording unless an explicit Intl format is given (quarters always do).
  if (props.type === 'date' || (props.format && props.type !== 'quarter'))
    return new Intl.DateTimeFormat(props.locale ?? loc.value.name, props.format ?? DATE_FORMAT).format(model.value)
  return formatPeriod(model.value, props.type, loc.value.date.period)
})
const pickLabel = computed(() => (props.type === 'date' ? loc.value.date.pick : loc.value.date.period.pick[props.type]))
const clearLabel = computed(() => (props.type === 'date' ? loc.value.date.clear : loc.value.date.period.clear[props.type]))

async function show() {
  if (props.disabled) return
  open.value = true
  await nextTick()
  calendar.value?.focus()
}

function hide(returnFocus = true) {
  open.value = false
  if (returnFocus) trigger.value?.focus()
}

function onPick(date: Date | null) {
  model.value = date
  hide()
}

function clear() {
  model.value = null
  trigger.value?.focus()
}

function onPanelKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.stopPropagation()
    hide()
  }
}

function onDocumentPointerDown(event: PointerEvent) {
  if (root.value && !root.value.contains(event.target as Node)) hide(false)
}

watch(open, (isOpen) => {
  if (isOpen) document.addEventListener('pointerdown', onDocumentPointerDown)
  else document.removeEventListener('pointerdown', onDocumentPointerDown)
})
onBeforeUnmount(() => document.removeEventListener('pointerdown', onDocumentPointerDown))
</script>

<template>
  <MlField :control-id="controlId" :label="label" :hint="hint" :error="fieldError" :index="index" :required="fieldRequired">
    <div ref="root" class="ml-datepicker">
      <div :class="['ml-input', { 'ml-input--error': fieldError, 'ml-input--disabled': disabled }]">
        <span class="ml-input__affix"><MlIcon name="calendar" /></span>
        <button
          :id="controlId"
          ref="trigger"
          type="button"
          class="ml-input__control ml-datepicker__trigger"
          aria-haspopup="dialog"
          :aria-expanded="open"
          :aria-controls="open ? panelId : undefined"
          :aria-invalid="fieldError ? true : undefined"
          :aria-describedby="describedBy(controlId, hint, fieldError)"
          :disabled="disabled"
          @click="open ? hide() : show()"
        >
          <span v-if="display">{{ display }}</span>
          <span v-else class="ml-datepicker__placeholder">{{ placeholder ?? pickLabel }}</span>
        </button>
        <button
          v-if="clearable && model && !disabled"
          type="button"
          class="ml-datepicker__clear"
          :aria-label="clearLabel"
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
          :aria-label="pickLabel"
          :class="['ml-datepicker__panel', `ml-datepicker__panel--${placement}`]"
          @keydown="onPanelKeydown"
        >
          <MlCalendar
            v-if="type === 'date'"
            ref="calendar"
            :model-value="model"
            :min="min"
            :max="max"
            :disabled-date="disabledDate"
            :markers="markers"
            :locale="locale"
            :week-starts-on="weekStartsOn"
            @update:model-value="onPick"
          />
          <MlPeriodPanel
            v-else
            ref="calendar"
            :type="type"
            :model-value="model"
            :min="min"
            :max="max"
            :disabled-date="disabledDate"
            :locale="locale"
            @update:model-value="onPick"
          />
        </div>
      </Transition>
    </div>
  </MlField>
</template>
