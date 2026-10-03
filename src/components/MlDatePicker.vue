<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, useId, watch } from 'vue'
import MlCalendar from './MlCalendar.vue'
import MlField from './MlField.vue'
import MlIcon from './MlIcon.vue'
import { describedBy } from '../composables'
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
  }>(),
  {
    weekStartsOn: 0,
    format: () => ({ year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' }),
    placement: 'bottom-start',
  },
)
const { fieldError, fieldRequired } = useFormField(props)

const model = defineModel<Date | null>({ default: null })
const open = ref(false)
const root = ref<HTMLElement>()
const trigger = ref<HTMLButtonElement>()
const calendar = ref<InstanceType<typeof MlCalendar>>()
const autoId = useId()
const controlId = computed(() => props.id ?? `ml-datepicker-${autoId}`)
const panelId = `${controlId.value}-panel`

const display = computed(() =>
  model.value ? new Intl.DateTimeFormat(props.locale ?? loc.value.name, props.format).format(model.value) : '',
)

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
          <span v-else class="ml-datepicker__placeholder">{{ placeholder ?? loc.date.pick }}</span>
        </button>
        <button
          v-if="clearable && model && !disabled"
          type="button"
          class="ml-datepicker__clear"
          :aria-label="loc.date.clear"
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
          :aria-label="loc.date.pick"
          :class="['ml-datepicker__panel', `ml-datepicker__panel--${placement}`]"
          @keydown="onPanelKeydown"
        >
          <MlCalendar
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
        </div>
      </Transition>
    </div>
  </MlField>
</template>
