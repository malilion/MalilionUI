<script setup lang="ts">
import { computed, nextTick, ref, useId, watch } from 'vue'
import MlField from './MlField.vue'
import MlIcon from './MlIcon.vue'
import MlPaw from './MlPaw.vue'
import { describedBy, useOutsidePointer, useSplitAttrs } from '../composables'
import { useFormField } from '../form'
import type { MlSelectOption, MlSize } from '../types'

type Value = string | number

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    options: MlSelectOption[]
    label?: string
    hint?: string
    error?: string
    index?: string
    placeholder?: string
    size?: MlSize
    required?: boolean
    disabled?: boolean
    id?: string
    /** Type to filter the options. */
    searchable?: boolean
    /** v-model becomes an array; chosen options show as tags. */
    multiple?: boolean
    /** Show a × that empties the selection. */
    clearable?: boolean
    /** Custom match test for searchable mode. Default: label contains the query (case-insensitive). */
    filter?: (option: MlSelectOption, query: string) => boolean
    /** Shown in the list when the search matches nothing. */
    noMatchText?: string
    /** Renders hidden inputs so the value is posted with a native <form>. */
    name?: string
  }>(),
  { size: 'md', placeholder: '請選擇', noMatchText: '找不到符合的選項' },
)

const emit = defineEmits<{ change: [value: Value | Value[] | null] }>()
const model = defineModel<Value | Value[] | null>({ default: null })

const { fieldError, fieldRequired } = useFormField(props)
const { rootAttrs, controlAttrs } = useSplitAttrs()
const autoId = useId()
const controlId = computed(() => props.id ?? `ml-combobox-${autoId}`)
const listId = computed(() => `${controlId.value}-list`)
const optionId = (i: number) => `${controlId.value}-opt-${i}`

const root = ref<HTMLElement>()
const control = ref<HTMLElement>()
const listEl = ref<HTMLElement>()
const open = ref(false)
const query = ref('')
/** Index into `visible` of the highlighted option (aria-activedescendant). */
const active = ref(-1)

const selectedValues = computed<Value[]>(() => {
  const v = model.value
  if (Array.isArray(v)) return v
  return v === null || v === undefined ? [] : [v]
})
const isSelected = (option: MlSelectOption) => selectedValues.value.includes(option.value)
const selectedOptions = computed(() =>
  selectedValues.value
    .map((v) => props.options.find((o) => o.value === v))
    .filter((o): o is MlSelectOption => !!o),
)
const singleLabel = computed(() => (props.multiple ? '' : selectedOptions.value[0]?.label ?? ''))
const hasValue = computed(() => selectedValues.value.length > 0)

const visible = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!props.searchable || !q) return props.options
  const test = props.filter ?? ((o: MlSelectOption, s: string) => o.label.toLowerCase().includes(s))
  return props.options.filter((o) => test(o, q))
})

/** Split a label around the query so the match can be highlighted. */
function parts(label: string) {
  const q = query.value.trim()
  const at = q ? label.toLowerCase().indexOf(q.toLowerCase()) : -1
  if (at < 0) return [{ text: label, hit: false }]
  return [
    { text: label.slice(0, at), hit: false },
    { text: label.slice(at, at + q.length), hit: true },
    { text: label.slice(at + q.length), hit: false },
  ].filter((p) => p.text)
}

function step(from: number, delta: 1 | -1) {
  const list = visible.value
  for (let i = 1; i <= list.length; i++) {
    const next = (from + delta * i + list.length * 2) % list.length
    if (!list[next].disabled) return next
  }
  return -1
}

function firstEnabled(from: 'start' | 'end') {
  return from === 'start' ? step(-1, 1) : step(0, -1)
}

function show() {
  if (props.disabled || open.value) return
  open.value = true
  const selected = visible.value.findIndex((o) => isSelected(o) && !o.disabled)
  active.value = selected !== -1 ? selected : firstEnabled('start')
}

function hide() {
  open.value = false
  query.value = ''
  active.value = -1
}

function choose(option: MlSelectOption) {
  if (option.disabled) return
  let next: Value | Value[] | null
  if (props.multiple) {
    next = isSelected(option)
      ? selectedValues.value.filter((v) => v !== option.value)
      : [...selectedValues.value, option.value]
    query.value = ''
    // Keep the highlighted row on the option just toggled, even if the list re-filtered.
    nextTick(() => (active.value = Math.max(0, visible.value.indexOf(option))))
  } else {
    next = option.value
    hide()
  }
  model.value = next
  emit('change', next)
  control.value?.focus()
}

function removeValue(value: Value) {
  if (props.disabled) return
  const next = selectedValues.value.filter((v) => v !== value)
  model.value = next
  emit('change', next)
  control.value?.focus()
}

function clear() {
  const next = props.multiple ? [] : null
  model.value = next
  emit('change', next)
  query.value = ''
  control.value?.focus()
}

function onBoxClick(event: MouseEvent) {
  if (props.disabled) return
  if ((event.target as HTMLElement).closest('.ml-combobox__tag-remove, .ml-combobox__clear')) return
  control.value?.focus()
  if (open.value && !props.searchable) hide()
  else show()
}

function onInput(event: Event) {
  query.value = (event.target as HTMLInputElement).value
  if (!open.value) show()
  active.value = firstEnabled('start')
}

let typeahead = ''
let typeaheadTimer: ReturnType<typeof setTimeout> | undefined

function onKeydown(event: KeyboardEvent) {
  const key = event.key
  if (key === 'ArrowDown' || key === 'ArrowUp') {
    event.preventDefault()
    if (!open.value) return show()
    active.value = step(active.value, key === 'ArrowDown' ? 1 : -1)
  } else if ((key === 'Home' || key === 'End') && open.value && !props.searchable) {
    event.preventDefault()
    active.value = firstEnabled(key === 'Home' ? 'start' : 'end')
  } else if (key === 'Enter' || (key === ' ' && !props.searchable)) {
    // Never let Enter submit the surrounding form while the list is in use.
    if (open.value || key === ' ') event.preventDefault()
    if (!open.value) {
      if (key === ' ') show()
      return
    }
    const option = visible.value[active.value]
    if (option) choose(option)
  } else if (key === 'Escape') {
    if (open.value) {
      // Close just the list, not a modal or drawer around it.
      event.preventDefault()
      event.stopPropagation()
      hide()
    }
  } else if (key === 'Tab') {
    if (open.value) hide()
  } else if (key === 'Backspace' && props.multiple && props.searchable && !query.value && hasValue.value) {
    removeValue(selectedValues.value[selectedValues.value.length - 1])
  } else if (!props.searchable && key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
    // Typeahead on the closed or open list.
    clearTimeout(typeaheadTimer)
    typeahead += key.toLowerCase()
    typeaheadTimer = setTimeout(() => (typeahead = ''), 600)
    if (!open.value) show()
    const list = visible.value
    const start = typeahead.length === 1 ? active.value + 1 : active.value
    for (let i = 0; i < list.length; i++) {
      const idx = (start + i) % list.length
      if (!list[idx].disabled && list[idx].label.toLowerCase().startsWith(typeahead)) {
        active.value = idx
        break
      }
    }
  }
}

watch(active, async (i) => {
  if (i < 0 || !open.value) return
  await nextTick()
  const el = listEl.value?.children[i] as HTMLElement | undefined
  el?.scrollIntoView?.({ block: 'nearest' })
})

useOutsidePointer(root, () => open.value, hide)

const activeDescendant = computed(() => (open.value && active.value >= 0 ? optionId(active.value) : undefined))
const controlAria = computed(() => ({
  role: 'combobox',
  'aria-expanded': open.value,
  'aria-controls': listId.value,
  'aria-haspopup': 'listbox' as const,
  'aria-activedescendant': activeDescendant.value,
  'aria-invalid': fieldError.value ? true : undefined,
  'aria-required': fieldRequired.value || undefined,
  'aria-describedby': describedBy(controlId.value, props.hint, fieldError.value),
}))
</script>

<template>
  <MlField
    v-bind="rootAttrs()"
    :control-id="controlId"
    :label="label"
    :hint="hint"
    :error="fieldError"
    :index="index"
    :required="fieldRequired"
  >
    <template v-if="$slots.label" #label><slot name="label" /></template>
    <div
      ref="root"
      :class="[
        'ml-combobox',
        {
          'ml-combobox--open': open,
          'ml-combobox--multiple': multiple,
          'ml-combobox--searchable': searchable,
        },
      ]"
    >
      <div
        :class="[
          'ml-input',
          `ml-input--${size}`,
          'ml-combobox__box',
          { 'ml-input--error': fieldError, 'ml-input--disabled': disabled },
        ]"
        @click="onBoxClick"
      >
        <span v-if="$slots.prefix" class="ml-input__affix"><slot name="prefix" /></span>
        <div class="ml-combobox__value">
          <template v-if="multiple">
            <span v-for="option in selectedOptions" :key="option.value" class="ml-combobox__tag">
              <slot name="tag" :option="option">{{ option.label }}</slot>
              <button
                v-if="!disabled"
                type="button"
                class="ml-combobox__tag-remove"
                tabindex="-1"
                :aria-label="`移除 ${option.label}`"
                @click.stop="removeValue(option.value)"
              >
                <MlIcon name="close" />
              </button>
            </span>
          </template>
          <input
            v-if="searchable"
            :id="controlId"
            ref="control"
            v-bind="{ ...controlAttrs(), ...controlAria }"
            class="ml-input__control ml-combobox__search"
            type="text"
            autocomplete="off"
            aria-autocomplete="list"
            :value="open || multiple ? query : singleLabel"
            :placeholder="multiple && hasValue ? '' : open && singleLabel ? singleLabel : placeholder"
            :disabled="disabled"
            @input="onInput"
            @keydown="onKeydown"
          />
          <div
            v-else
            :id="controlId"
            ref="control"
            v-bind="{ ...controlAttrs(), ...controlAria }"
            class="ml-input__control ml-combobox__display"
            :tabindex="disabled ? -1 : 0"
            :aria-labelledby="label || $slots.label ? `${controlId}-label` : undefined"
            :aria-disabled="disabled || undefined"
            @keydown="onKeydown"
          >
            <span v-if="!multiple && singleLabel" class="ml-combobox__single">
              <slot name="selected" :option="selectedOptions[0]">{{ singleLabel }}</slot>
            </span>
            <span v-else-if="!hasValue" class="ml-combobox__placeholder">{{ placeholder }}</span>
          </div>
        </div>
        <button
          v-if="clearable && hasValue && !disabled"
          type="button"
          class="ml-combobox__clear"
          tabindex="-1"
          aria-label="清除"
          @click.stop="clear"
        >
          <MlIcon name="close" />
        </button>
        <MlIcon name="chevronDown" class="ml-combobox__chevron" />
      </div>

      <Transition name="ml-dropdown">
        <ul
          v-show="open"
          :id="listId"
          ref="listEl"
          role="listbox"
          class="ml-dropdown__menu ml-combobox__menu"
          :aria-multiselectable="multiple || undefined"
          :aria-labelledby="label || $slots.label ? `${controlId}-label` : undefined"
          tabindex="-1"
        >
          <li
            v-for="(option, i) in visible"
            :id="optionId(i)"
            :key="option.value"
            role="option"
            :aria-selected="isSelected(option)"
            :aria-disabled="option.disabled || undefined"
            :class="[
              'ml-dropdown__item',
              'ml-combobox__option',
              {
                'ml-combobox__option--active': i === active,
                'ml-dropdown__item--checked': isSelected(option),
              },
            ]"
            @mousedown.prevent
            @click="choose(option)"
            @mousemove="!option.disabled && (active = i)"
          >
            <span v-if="multiple" class="ml-combobox__check" aria-hidden="true">
              <MlIcon v-if="isSelected(option)" name="check" />
            </span>
            <span class="ml-dropdown__label">
              <slot name="option" :option="option" :selected="isSelected(option)">
                <template v-for="(p, k) in parts(option.label)" :key="k">
                  <mark v-if="p.hit" class="ml-combobox__hit">{{ p.text }}</mark>
                  <template v-else>{{ p.text }}</template>
                </template>
              </slot>
            </span>
            <MlPaw v-if="!multiple && isSelected(option)" tone="current" class="ml-dropdown__paw" />
          </li>
          <li v-if="!visible.length" class="ml-combobox__empty" role="presentation">
            <MlPaw tone="steel" class="ml-combobox__empty-paw" />{{ noMatchText }}
          </li>
        </ul>
      </Transition>

      <template v-if="name">
        <input v-for="v in selectedValues" :key="v" type="hidden" :name="name" :value="v" />
      </template>
    </div>
  </MlField>
</template>
