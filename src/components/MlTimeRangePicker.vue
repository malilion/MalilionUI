<script setup lang="ts">
import { computed, nextTick, ref, useId } from 'vue'
import MlButton from './MlButton.vue'
import MlField from './MlField.vue'
import MlIcon from './MlIcon.vue'
import MlTimeColumns from './MlTimeColumns.vue'
import { formatTime, parseTime, type TimeParts } from './time'
import {
  endFloor,
  formatTimeRangeDuration,
  fromSeconds,
  isOvernight,
  setTimeRangeEnd,
  timeBounds,
  timeRangeSeconds,
  type MlTimeRange,
  type MlTimeRangePreset,
} from './time-range'
import { describedBy, useOutsidePointer } from '../composables'
import { useFormField } from '../form'
import { useLocale } from '../locale'

const loc = useLocale()

const props = withDefaults(
  defineProps<{
    label?: string
    hint?: string
    error?: string
    index?: string
    startPlaceholder?: string
    endPlaceholder?: string
    /** Include seconds columns; both ends become "HH:mm:ss". */
    seconds?: boolean
    minuteStep?: number
    secondStep?: number
    /** Earliest allowed time for either end, "HH:mm" or "HH:mm:ss". */
    min?: string
    /** Latest allowed time for either end, "HH:mm" or "HH:mm:ss". */
    max?: string
    /** Let the end be earlier than the start, meaning the next day (夜班 22:00 – 06:00). */
    allowOvernight?: boolean
    /** Quick picks beside the wheels. */
    presets?: MlTimeRangePreset[]
    clearable?: boolean
    required?: boolean
    disabled?: boolean
    placement?: 'bottom-start' | 'bottom-end'
    id?: string
  }>(),
  { minuteStep: 1, secondStep: 1, placement: 'bottom-start' },
)

const emit = defineEmits<{ change: [range: MlTimeRange] }>()
/** [start, end] as "HH:mm" (or "HH:mm:ss" with `seconds`); null for an unset end. */
const model = defineModel<MlTimeRange>({ default: () => [null, null] })
const { fieldError, fieldRequired } = useFormField(props)

const autoId = useId()
const controlId = computed(() => props.id ?? `ml-timerange-${autoId}`)
const panelId = computed(() => `${controlId.value}-panel`)
const root = ref<HTMLElement>()
const trigger = ref<HTMLButtonElement>()
const startColumns = ref<InstanceType<typeof MlTimeColumns>>()
const open = ref(false)
/** Which end 現在 fills: the group that last had focus. */
const active = ref<0 | 1>(0)

const t = computed(() => loc.value.timeRange)
const bounds = computed(() => timeBounds(props.min, props.max))
const parts = computed(() => [parseTime(model.value[0]), parseTime(model.value[1])] as const)
const floor = computed(() => endFloor(model.value[0], props))
const overnight = computed(() => isOvernight(model.value, props.allowOvernight))
const duration = computed(() => {
  const sec = timeRangeSeconds(model.value, props.allowOvernight)
  return sec === null ? '' : formatTimeRangeDuration(sec, loc.value)
})
const hasValue = computed(() => !!(model.value[0] || model.value[1]))
const status = computed(() => duration.value || (model.value[0] ? t.value.pickEnd : t.value.pickStart))

function update(range: MlTimeRange) {
  model.value = range
  emit('change', range)
}

function set(which: 0 | 1, time: TimeParts) {
  update(setTimeRangeEnd(model.value, which, formatTime(time, props.seconds), props.allowOvernight))
}

function now() {
  const d = new Date()
  const step = (n: number, s: number) => Math.floor(n / s) * s
  const lo = active.value === 1 ? floor.value : bounds.value[0]
  const hi = bounds.value[1]
  if (lo > hi) return
  const sec = d.getHours() * 3600 + step(d.getMinutes(), props.minuteStep) * 60 + (props.seconds ? step(d.getSeconds(), props.secondStep) : 0)
  set(active.value, fromSeconds(Math.min(hi, Math.max(lo, sec))))
}

function applyPreset(preset: MlTimeRangePreset) {
  update(typeof preset.value === 'function' ? preset.value() : [preset.value[0], preset.value[1]])
  hide()
}

async function show() {
  if (props.disabled) return
  active.value = 0
  open.value = true
  await nextTick()
  startColumns.value?.focus()
}

function hide(returnFocus = true) {
  if (!open.value) return
  open.value = false
  if (returnFocus) trigger.value?.focus()
}

function clear() {
  update([null, null])
  trigger.value?.focus()
}

function onPanelKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.stopPropagation()
    hide()
  } else if (event.key === 'Enter' && (event.target as HTMLElement).getAttribute('role') === 'listbox') {
    event.preventDefault()
    hide()
  }
}

useOutsidePointer(root, () => open.value, () => hide(false))
</script>

<template>
  <MlField :control-id="controlId" :label="label" :hint="hint" :error="fieldError" :index="index" :required="fieldRequired">
    <div ref="root" class="ml-datepicker ml-timerange">
      <div :class="['ml-input', { 'ml-input--error': fieldError, 'ml-input--disabled': disabled }]">
        <span class="ml-input__affix"><MlIcon name="clock" /></span>
        <button
          :id="controlId"
          ref="trigger"
          type="button"
          class="ml-input__control ml-datepicker__trigger ml-daterange__trigger ml-timerange__trigger"
          aria-haspopup="dialog"
          :aria-expanded="open"
          :aria-controls="open ? panelId : undefined"
          :aria-invalid="fieldError ? true : undefined"
          :aria-describedby="describedBy(controlId, hint, fieldError)"
          :disabled="disabled"
          @click="open ? hide() : show()"
        >
          <span :class="{ 'ml-datepicker__placeholder': !model[0] }">{{ model[0] || (startPlaceholder ?? t.start) }}</span>
          <MlIcon name="arrowRight" class="ml-daterange__arrow" />
          <span :class="{ 'ml-datepicker__placeholder': !model[1] }">{{ model[1] || (endPlaceholder ?? t.end) }}<span v-if="overnight" class="ml-timerange__next-day">{{ t.nextDay }}</span></span>
        </button>
        <span v-if="duration" class="ml-daterange__days ml-timerange__duration" aria-hidden="true">{{ duration }}</span>
        <button v-if="clearable && hasValue && !disabled" type="button" class="ml-datepicker__clear" :aria-label="t.clear" @click="clear">
          <MlIcon name="close" />
        </button>
      </div>
      <Transition name="ml-dropdown">
        <div
          v-if="open"
          :id="panelId"
          role="dialog"
          :aria-label="t.pick"
          :class="['ml-datepicker__panel', `ml-datepicker__panel--${placement}`, 'ml-timepicker__panel', 'ml-timerange__panel']"
          @keydown="onPanelKeydown"
        >
          <ul v-if="presets?.length" class="ml-daterange__presets ml-timerange__presets" :aria-label="loc.date.presets">
            <li v-for="preset in presets" :key="preset.label">
              <button type="button" class="ml-daterange__preset" @click="applyPreset(preset)">{{ preset.label }}</button>
            </li>
          </ul>
          <div class="ml-timerange__body">
            <div class="ml-timerange__groups">
              <div class="ml-timerange__group" role="group" :aria-label="t.start" @focusin="active = 0">
                <p class="ml-timerange__label" aria-hidden="true">{{ t.start }}</p>
                <MlTimeColumns
                  ref="startColumns"
                  :value="parts[0]"
                  :seconds="seconds"
                  :minute-step="minuteStep"
                  :second-step="secondStep"
                  :min="bounds[0]"
                  :max="bounds[1]"
                  @change="set(0, $event)"
                />
              </div>
              <MlIcon name="arrowRight" class="ml-timerange__arrow" />
              <div class="ml-timerange__group" role="group" :aria-label="overnight ? t.end + t.nextDay : t.end" @focusin="active = 1">
                <p class="ml-timerange__label" aria-hidden="true">{{ t.end }}<span v-if="overnight" class="ml-timerange__next-day">{{ t.nextDay }}</span></p>
                <MlTimeColumns
                  :value="parts[1]"
                  :seconds="seconds"
                  :minute-step="minuteStep"
                  :second-step="secondStep"
                  :min="floor"
                  :max="bounds[1]"
                  @change="set(1, $event)"
                />
              </div>
            </div>
            <p class="ml-timerange__status" aria-live="polite">{{ status }}</p>
            <div class="ml-timepicker__footer">
              <MlButton size="sm" variant="ghost" @click="now">{{ loc.common.now }}</MlButton>
              <MlButton size="sm" @click="hide()">{{ loc.common.confirm }}</MlButton>
            </div>
          </div>
        </div>
      </Transition>
    </div>
  </MlField>
</template>
