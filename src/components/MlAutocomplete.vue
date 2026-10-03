<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, useId, watch } from 'vue'
import MlField from './MlField.vue'
import MlIcon from './MlIcon.vue'
import { describedBy, useOutsidePointer, useSplitAttrs } from '../composables'
import { useFormField } from '../form'
import type { MlAutocompleteItem, MlSize } from '../types'
import { useLocale } from '../locale'

const loc = useLocale()

interface Suggestion {
  value: string
  label: string
  hint?: string
}

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    /** Static suggestions, filtered by what's typed. */
    suggestions?: MlAutocompleteItem[]
    /** Async source; called (debounced) with the query. Overrides `suggestions`. */
    fetchSuggestions?: (query: string) => Promise<MlAutocompleteItem[]> | MlAutocompleteItem[]
    /** Debounce for `fetchSuggestions`, in ms. */
    debounce?: number
    /** Characters needed before suggestions show. 0 shows them on focus. */
    minChars?: number
    /** Most suggestions to show at once. */
    limit?: number
    label?: string
    hint?: string
    error?: string
    index?: string
    placeholder?: string
    size?: MlSize
    required?: boolean
    disabled?: boolean
    clearable?: boolean
    id?: string
    /** Shown when a fetch returns nothing. Empty string hides the row. */
    noMatchText?: string
  }>(),
  { suggestions: () => [], debounce: 200, minChars: 1, limit: 8, size: 'md' },
)

const emit = defineEmits<{ select: [item: Suggestion] }>()
const model = defineModel<string>({ default: '' })

const { fieldError, fieldRequired } = useFormField(props)
const { rootAttrs, controlAttrs } = useSplitAttrs()
const autoId = useId()
const controlId = computed(() => props.id ?? `ml-autocomplete-${autoId}`)
const listId = computed(() => `${controlId.value}-list`)
const optionId = (i: number) => `${controlId.value}-opt-${i}`

const root = ref<HTMLElement>()
const input = ref<HTMLInputElement>()
const listEl = ref<HTMLElement>()
const open = ref(false)
const active = ref(-1)
const loading = ref(false)
const fetched = ref<Suggestion[] | null>(null)

const normalize = (item: MlAutocompleteItem): Suggestion =>
  typeof item === 'string' ? { value: item, label: item } : { value: item.value, label: item.label ?? item.value, hint: item.hint }

const items = computed<Suggestion[]>(() => {
  if (props.fetchSuggestions) return (fetched.value ?? []).slice(0, props.limit)
  const q = model.value.trim().toLowerCase()
  const all = props.suggestions.map(normalize)
  const hits = q ? all.filter((s) => s.label.toLowerCase().includes(q) && s.label.toLowerCase() !== q) : all
  return hits.slice(0, props.limit)
})

const enoughChars = computed(() => model.value.trim().length >= props.minChars)
const showEmpty = computed(
  () => !!props.fetchSuggestions && props.noMatchText !== '' && !loading.value && fetched.value !== null && !items.value.length,
)
const expanded = computed(() => open.value && enoughChars.value && (items.value.length > 0 || loading.value || showEmpty.value))

function parts(label: string) {
  const q = model.value.trim()
  const at = q ? label.toLowerCase().indexOf(q.toLowerCase()) : -1
  if (at < 0) return [{ text: label, hit: false }]
  return [
    { text: label.slice(0, at), hit: false },
    { text: label.slice(at, at + q.length), hit: true },
    { text: label.slice(at + q.length), hit: false },
  ].filter((p) => p.text)
}

let timer: ReturnType<typeof setTimeout> | undefined
let request = 0

function load() {
  if (!props.fetchSuggestions) return
  clearTimeout(timer)
  if (!enoughChars.value) {
    fetched.value = null
    loading.value = false
    return
  }
  loading.value = true
  const id = ++request
  const query = model.value
  timer = setTimeout(async () => {
    try {
      const result = await props.fetchSuggestions!(query)
      if (id === request) fetched.value = result.map(normalize)
    } catch {
      if (id === request) fetched.value = []
    } finally {
      if (id === request) loading.value = false
    }
  }, props.debounce)
}

function onInput(event: Event) {
  model.value = (event.target as HTMLInputElement).value
  open.value = true
  active.value = -1
  load()
}

function onFocus() {
  if (props.disabled) return
  open.value = true
  if (props.fetchSuggestions && fetched.value === null) load()
}

function close() {
  open.value = false
  active.value = -1
}

function choose(item: Suggestion) {
  model.value = item.value
  emit('select', item)
  close()
  input.value?.focus()
}

function clear() {
  model.value = ''
  fetched.value = null
  input.value?.focus()
}

function move(delta: 1 | -1) {
  const n = items.value.length
  if (!n) return
  active.value = active.value < 0 ? (delta > 0 ? 0 : n - 1) : (active.value + delta + n) % n
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault()
    if (!open.value) {
      open.value = true
      load()
      return
    }
    move(event.key === 'ArrowDown' ? 1 : -1)
  } else if (event.key === 'Enter') {
    // Only intercept Enter when a suggestion is highlighted; otherwise let the form submit.
    if (expanded.value && active.value >= 0 && items.value[active.value]) {
      event.preventDefault()
      choose(items.value[active.value])
    } else close()
  } else if (event.key === 'Escape') {
    if (expanded.value) {
      event.preventDefault()
      event.stopPropagation()
      close()
    }
  } else if (event.key === 'Tab') {
    close()
  }
}

watch(active, async (i) => {
  if (i < 0) return
  await nextTick()
  const el = listEl.value?.children[i] as HTMLElement | undefined
  el?.scrollIntoView?.({ block: 'nearest' })
})

useOutsidePointer(root, () => open.value, close)
onBeforeUnmount(() => clearTimeout(timer))
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
    <div ref="root" :class="['ml-autocomplete', { 'ml-autocomplete--open': expanded }]">
      <div
        :class="[
          'ml-input',
          `ml-input--${size}`,
          { 'ml-input--error': fieldError, 'ml-input--disabled': disabled },
        ]"
      >
        <span v-if="$slots.prefix" class="ml-input__affix"><slot name="prefix" /></span>
        <input
          :id="controlId"
          ref="input"
          v-bind="controlAttrs()"
          class="ml-input__control"
          type="text"
          role="combobox"
          autocomplete="off"
          aria-autocomplete="list"
          aria-haspopup="listbox"
          :aria-expanded="expanded"
          :aria-controls="listId"
          :aria-activedescendant="expanded && active >= 0 ? optionId(active) : undefined"
          :aria-busy="loading || undefined"
          :aria-invalid="fieldError ? true : undefined"
          :aria-describedby="describedBy(controlId, hint, fieldError)"
          :value="model"
          :placeholder="placeholder"
          :required="fieldRequired"
          :disabled="disabled"
          @input="onInput"
          @focus="onFocus"
          @keydown="onKeydown"
        />
        <span v-if="loading" class="ml-autocomplete__spinner" aria-hidden="true" />
        <button
          v-else-if="clearable && model && !disabled"
          type="button"
          class="ml-combobox__clear ml-autocomplete__clear"
          tabindex="-1"
          :aria-label="loc.common.clear"
          @click="clear"
        >
          <MlIcon name="close" />
        </button>
        <span v-if="$slots.suffix" class="ml-input__affix"><slot name="suffix" /></span>
      </div>

      <Transition name="ml-dropdown">
        <ul
          v-show="expanded"
          :id="listId"
          ref="listEl"
          role="listbox"
          class="ml-dropdown__menu ml-combobox__menu"
          :aria-labelledby="label || $slots.label ? `${controlId}-label` : undefined"
        >
          <li
            v-for="(item, i) in items"
            :id="optionId(i)"
            :key="`${i}-${item.value}`"
            role="option"
            :aria-selected="i === active"
            :class="['ml-dropdown__item', 'ml-combobox__option', { 'ml-combobox__option--active': i === active }]"
            @mousedown.prevent
            @click="choose(item)"
            @mousemove="active = i"
          >
            <span class="ml-dropdown__label">
              <slot name="item" :item="item">
                <template v-for="(p, k) in parts(item.label)" :key="k">
                  <mark v-if="p.hit" class="ml-combobox__hit">{{ p.text }}</mark>
                  <template v-else>{{ p.text }}</template>
                </template>
              </slot>
            </span>
            <span v-if="item.hint" class="ml-dropdown__hint">{{ item.hint }}</span>
          </li>
          <li v-if="loading && !items.length" class="ml-combobox__empty" role="presentation">
            <span class="ml-autocomplete__spinner" aria-hidden="true" />{{ loc.autocomplete.searching }}
          </li>
          <li v-else-if="showEmpty" class="ml-combobox__empty" role="presentation">{{ noMatchText ?? loc.autocomplete.empty }}</li>
        </ul>
      </Transition>
    </div>
  </MlField>
</template>
