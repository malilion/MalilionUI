<script setup lang="ts">
import { computed, nextTick, ref, useId } from 'vue'
import MlButton from './MlButton.vue'
import MlField from './MlField.vue'
import MlIcon from './MlIcon.vue'
import MlTimeColumns from './MlTimeColumns.vue'
import { formatTime, parseTime, toSeconds, type TimeParts } from './time'
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
    placeholder?: string
    /** Include a seconds column; v-model becomes "HH:mm:ss". */
    seconds?: boolean
    minuteStep?: number
    secondStep?: number
    /** Earliest allowed time, "HH:mm" or "HH:mm:ss". */
    min?: string
    /** Latest allowed time, "HH:mm" or "HH:mm:ss". */
    max?: string
    clearable?: boolean
    required?: boolean
    disabled?: boolean
    placement?: 'bottom-start' | 'bottom-end'
    id?: string
  }>(),
  { minuteStep: 1, secondStep: 1, placement: 'bottom-start' },
)

/** "HH:mm" (or "HH:mm:ss" with `seconds`); null when empty. */
const model = defineModel<string | null>({ default: null })
const { fieldError, fieldRequired } = useFormField(props)

const autoId = useId()
const controlId = computed(() => props.id ?? `ml-timepicker-${autoId}`)
const panelId = computed(() => `${controlId.value}-panel`)
const root = ref<HTMLElement>()
const trigger = ref<HTMLButtonElement>()
const columns = ref<InstanceType<typeof MlTimeColumns>>()
const open = ref(false)

const parts = computed(() => parseTime(model.value))
const minSec = computed(() => { const t = parseTime(props.min); return t ? toSeconds(t) : 0 })
const maxSec = computed(() => { const t = parseTime(props.max); return t ? toSeconds(t) : 86399 })

function set(t: TimeParts) {
  model.value = formatTime(t, props.seconds)
}

function now() {
  const d = new Date()
  const step = (n: number, s: number) => Math.floor(n / s) * s
  const sec = Math.min(maxSec.value, Math.max(minSec.value, d.getHours() * 3600 + step(d.getMinutes(), props.minuteStep) * 60 + (props.seconds ? step(d.getSeconds(), props.secondStep) : 0)))
  set({ h: Math.floor(sec / 3600), m: Math.floor((sec % 3600) / 60), s: sec % 60 })
}

async function show() {
  if (props.disabled) return
  open.value = true
  await nextTick()
  columns.value?.focus()
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
  } else if (event.key === 'Enter') {
    event.preventDefault()
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
    <div ref="root" class="ml-datepicker ml-timepicker">
      <div :class="['ml-input', { 'ml-input--error': fieldError, 'ml-input--disabled': disabled }]">
        <span class="ml-input__affix"><MlIcon name="clock" /></span>
        <button
          :id="controlId"
          ref="trigger"
          type="button"
          class="ml-input__control ml-datepicker__trigger ml-timepicker__trigger"
          aria-haspopup="dialog"
          :aria-expanded="open"
          :aria-controls="open ? panelId : undefined"
          :aria-invalid="fieldError ? true : undefined"
          :aria-describedby="describedBy(controlId, hint, fieldError)"
          :disabled="disabled"
          @click="open ? hide() : show()"
        >
          <span v-if="model">{{ model }}</span>
          <span v-else class="ml-datepicker__placeholder">{{ placeholder ?? loc.date.pickTime }}</span>
        </button>
        <button
          v-if="clearable && model && !disabled"
          type="button"
          class="ml-datepicker__clear"
          :aria-label="loc.date.clearTime"
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
          :aria-label="loc.date.pickTime"
          :class="['ml-datepicker__panel', `ml-datepicker__panel--${placement}`, 'ml-timepicker__panel']"
          @keydown="onPanelKeydown"
        >
          <MlTimeColumns
            ref="columns"
            :value="parts"
            :seconds="seconds"
            :minute-step="minuteStep"
            :second-step="secondStep"
            :min="minSec"
            :max="maxSec"
            @change="set"
          />
          <div class="ml-timepicker__footer">
            <MlButton size="sm" variant="ghost" @click="now">{{ loc.common.now }}</MlButton>
            <MlButton size="sm" @click="hide()">{{ loc.common.confirm }}</MlButton>
          </div>
        </div>
      </Transition>
    </div>
  </MlField>
</template>
