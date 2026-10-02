<script setup lang="ts">
import { computed, nextTick, ref, useId } from 'vue'
import MlButton from './MlButton.vue'
import MlCalendar from './MlCalendar.vue'
import MlField from './MlField.vue'
import MlIcon from './MlIcon.vue'
import MlTimeColumns from './MlTimeColumns.vue'
import { startOfDay } from './dates'
import type { TimeParts } from './time'
import { describedBy, useOutsidePointer } from '../composables'
import { useFormField } from '../form'

const props = withDefaults(
  defineProps<{
    label?: string
    hint?: string
    error?: string
    index?: string
    placeholder?: string
    /** Include a seconds column. */
    seconds?: boolean
    minuteStep?: number
    min?: Date
    max?: Date
    disabledDate?: (date: Date) => boolean
    markers?: Date[]
    locale?: string
    weekStartsOn?: 0 | 1
    /** Intl options used to display the chosen moment. */
    format?: Intl.DateTimeFormatOptions
    clearable?: boolean
    required?: boolean
    disabled?: boolean
    placement?: 'bottom-start' | 'bottom-end'
    id?: string
  }>(),
  {
    placeholder: '選擇日期與時間',
    minuteStep: 1,
    locale: 'zh-TW',
    weekStartsOn: 0,
    placement: 'bottom-start',
  },
)

const model = defineModel<Date | null>({ default: null })
const { fieldError, fieldRequired } = useFormField(props)

const autoId = useId()
const controlId = computed(() => props.id ?? `ml-datetimepicker-${autoId}`)
const panelId = computed(() => `${controlId.value}-panel`)
const root = ref<HTMLElement>()
const trigger = ref<HTMLButtonElement>()
const calendar = ref<InstanceType<typeof MlCalendar>>()
const open = ref(false)

const display = computed(() => {
  if (!model.value) return ''
  const format = props.format ?? {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
    second: props.seconds ? '2-digit' : undefined, hourCycle: 'h23',
  }
  return new Intl.DateTimeFormat(props.locale, format).format(model.value)
})

const parts = computed<TimeParts | null>(() =>
  model.value ? { h: model.value.getHours(), m: model.value.getMinutes(), s: model.value.getSeconds() } : null,
)

/** The time-of-day window allowed on the currently chosen day (from min / max). */
const minSec = computed(() => {
  if (!props.min || !model.value || startOfDay(props.min).getTime() !== startOfDay(model.value).getTime()) return 0
  return props.min.getHours() * 3600 + props.min.getMinutes() * 60 + props.min.getSeconds()
})
const maxSec = computed(() => {
  if (!props.max || !model.value || startOfDay(props.max).getTime() !== startOfDay(model.value).getTime()) return 86399
  return props.max.getHours() * 3600 + props.max.getMinutes() * 60 + props.max.getSeconds()
})

function clampToBounds(d: Date) {
  if (props.min && d < props.min) return new Date(props.min)
  if (props.max && d > props.max) return new Date(props.max)
  return d
}

function onPickDate(date: Date | null) {
  if (!date) return
  const t = parts.value ?? { h: 0, m: 0, s: 0 }
  model.value = clampToBounds(new Date(date.getFullYear(), date.getMonth(), date.getDate(), t.h, t.m, t.s))
}

function onPickTime(t: TimeParts) {
  const base = model.value ?? startOfDay(new Date())
  model.value = clampToBounds(new Date(base.getFullYear(), base.getMonth(), base.getDate(), t.h, t.m, props.seconds ? t.s : 0))
}

function now() {
  const d = new Date()
  d.setMinutes(Math.floor(d.getMinutes() / props.minuteStep) * props.minuteStep, props.seconds ? d.getSeconds() : 0, 0)
  model.value = clampToBounds(d)
}

async function show() {
  if (props.disabled) return
  open.value = true
  await nextTick()
  calendar.value?.focus()
}

function hide(returnFocus = true) {
  if (!open.value) return
  open.value = false
  if (returnFocus) trigger.value?.focus()
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

useOutsidePointer(root, () => open.value, () => hide(false))
</script>

<template>
  <MlField
    :control-id="controlId"
    :label="label"
    :hint="hint"
    :error="fieldError"
    :index="index"
    :required="fieldRequired"
  >
    <div ref="root" class="ml-datepicker ml-datetimepicker">
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
          <span v-else class="ml-datepicker__placeholder">{{ placeholder }}</span>
        </button>
        <button
          v-if="clearable && model && !disabled"
          type="button"
          class="ml-datepicker__clear"
          aria-label="清除日期時間"
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
          aria-label="選擇日期與時間"
          :class="['ml-datepicker__panel', `ml-datepicker__panel--${placement}`, 'ml-datetimepicker__panel']"
          @keydown="onPanelKeydown"
        >
          <div class="ml-datetimepicker__body">
            <MlCalendar
              ref="calendar"
              :model-value="model ? startOfDay(model) : null"
              :min="min"
              :max="max"
              :disabled-date="disabledDate"
              :markers="markers"
              :locale="locale"
              :week-starts-on="weekStartsOn"
              @update:model-value="onPickDate"
            />
            <div class="ml-datetimepicker__time">
              <p class="ml-datetimepicker__time-label">{{ parts ? '時間' : '先選日期或時間' }}</p>
              <MlTimeColumns
                :value="parts"
                :seconds="seconds"
                :minute-step="minuteStep"
                :min="minSec"
                :max="maxSec"
                @change="onPickTime"
              />
            </div>
          </div>
          <div class="ml-timepicker__footer">
            <MlButton size="sm" variant="ghost" @click="now">現在</MlButton>
            <MlButton size="sm" @click="hide()">確定</MlButton>
          </div>
        </div>
      </Transition>
    </div>
  </MlField>
</template>
