<script setup lang="ts">
import { computed, nextTick, ref, useId } from 'vue'
import MlAvatar from './MlAvatar.vue'
import MlField from './MlField.vue'
import { describedBy, useOutsidePointer } from '../composables'
import { useFormField } from '../form'
import { useLocale } from '../locale'
import type { MlMentionOption } from '../types'

const loc = useLocale()

const props = withDefaults(
  defineProps<{
    options: MlMentionOption[]
    /** Characters that open the list. */
    triggers?: string[]
    label?: string
    hint?: string
    error?: string
    index?: string
    placeholder?: string
    rows?: number
    disabled?: boolean
    /** Most suggestions shown. */
    limit?: number
    id?: string
  }>(),
  { triggers: () => ['@'], rows: 3, limit: 8 },
)

const emit = defineEmits<{ search: [query: string, trigger: string]; select: [option: MlMentionOption, trigger: string] }>()
const model = defineModel<string>({ default: '' })
const { fieldError } = useFormField(props)

const autoId = useId()
const controlId = computed(() => props.id ?? `ml-mention-${autoId}`)
const listId = `${controlId.value}-list`
const root = ref<HTMLElement>()
const area = ref<HTMLTextAreaElement>()
const open = ref(false)
const active = ref(0)
/** The trigger being typed: where it starts and what follows it. */
const token = ref<{ start: number; trigger: string; query: string } | null>(null)

const matches = computed(() => {
  const q = token.value?.query.toLowerCase() ?? ''
  return props.options
    .filter((o) => !o.disabled && (o.label.toLowerCase().includes(q) || String(o.value).toLowerCase().includes(q)))
    .slice(0, props.limit)
})

/** Look backwards from the caret for a trigger that starts a word. */
function findToken() {
  const el = area.value
  if (!el) return null
  const caret = el.selectionStart ?? 0
  // Read the textarea itself: v-model only catches up after the parent re-renders.
  const before = el.value.slice(0, caret)
  for (let i = before.length - 1; i >= 0; i--) {
    const ch = before[i]
    if (/\s/.test(ch)) return null
    if (props.triggers.includes(ch) && (i === 0 || /\s/.test(before[i - 1]))) {
      return { start: i, trigger: ch, query: before.slice(i + 1) }
    }
  }
  return null
}

function sync() {
  const t = findToken()
  token.value = t
  open.value = !!t
  active.value = 0
  if (t) emit('search', t.query, t.trigger)
}

async function choose(option: MlMentionOption) {
  const t = token.value
  const el = area.value
  if (!t || !el) return
  const caret = el.selectionStart ?? 0
  const insert = `${t.trigger}${option.label} `
  const text = el.value
  model.value = text.slice(0, t.start) + insert + text.slice(caret)
  open.value = false
  token.value = null
  emit('select', option, t.trigger)
  await nextTick()
  const at = t.start + insert.length
  el.focus()
  el.setSelectionRange(at, at)
}

function onKeydown(event: KeyboardEvent) {
  if (!open.value || event.isComposing) return
  const n = matches.value.length
  if (event.key === 'ArrowDown' && n) {
    event.preventDefault()
    active.value = (active.value + 1) % n
  } else if (event.key === 'ArrowUp' && n) {
    event.preventDefault()
    active.value = (active.value - 1 + n) % n
  } else if ((event.key === 'Enter' || event.key === 'Tab') && n) {
    event.preventDefault()
    choose(matches.value[active.value])
  } else if (event.key === 'Escape') {
    event.preventDefault()
    event.stopPropagation()
    open.value = false
  }
}

useOutsidePointer(root, () => open.value, () => (open.value = false))
</script>

<template>
  <MlField :control-id="controlId" :label="label" :hint="hint" :error="fieldError" :index="index">
    <div ref="root" class="ml-mention">
      <div :class="['ml-input', 'ml-input--textarea', { 'ml-input--error': fieldError, 'ml-input--disabled': disabled }]">
        <textarea
          :id="controlId"
          ref="area"
          v-model="model"
          class="ml-input__control"
          :rows="rows"
          :placeholder="placeholder ?? loc.mention.placeholder(triggers[0])"
          :disabled="disabled"
          role="combobox"
          aria-autocomplete="list"
          :aria-expanded="open"
          :aria-controls="listId"
          :aria-activedescendant="open && matches.length ? `${listId}-${active}` : undefined"
          :aria-invalid="fieldError ? true : undefined"
          :aria-describedby="describedBy(controlId, hint, fieldError)"
          @input="sync"
          @click="sync"
          @keyup="(e) => ['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key) && sync()"
          @keydown="onKeydown"
        />
      </div>
      <Transition name="ml-dropdown">
        <ul v-show="open" :id="listId" role="listbox" class="ml-dropdown__menu ml-mention__menu">
          <li
            v-for="(o, i) in matches"
            :id="`${listId}-${i}`"
            :key="o.value"
            role="option"
            :aria-selected="i === active"
            :class="['ml-dropdown__item', 'ml-combobox__option', { 'ml-combobox__option--active': i === active }]"
            @mousedown.prevent
            @click="choose(o)"
            @mousemove="active = i"
          >
            <MlAvatar size="sm" :src="o.avatar" :name="o.label" class="ml-mention__avatar" />
            <span class="ml-dropdown__label">{{ o.label }}</span>
            <span v-if="o.hint" class="ml-dropdown__hint">{{ o.hint }}</span>
          </li>
          <li v-if="!matches.length" class="ml-combobox__empty" role="presentation">{{ loc.common.noMatch }}</li>
        </ul>
      </Transition>
    </div>
  </MlField>
</template>
