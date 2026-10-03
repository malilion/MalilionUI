<script setup lang="ts">
import { computed, ref, useId } from 'vue'
import MlField from './MlField.vue'
import MlIcon from './MlIcon.vue'
import { describedBy, useSplitAttrs } from '../composables'
import { useFormField } from '../form'
import type { MlSize } from '../types'
import { useLocale } from '../locale'

const loc = useLocale()

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    label?: string
    hint?: string
    error?: string
    index?: string
    placeholder?: string
    size?: MlSize
    required?: boolean
    disabled?: boolean
    id?: string
    /** Most tags allowed; the input hides once reached. */
    max?: number
    /** Keys (besides Enter) that turn the typed text into a tag. */
    separators?: string[]
    /** Allow the same tag twice. */
    allowDuplicates?: boolean
    /** Return false (or an error string) to reject a tag. */
    validate?: (tag: string) => boolean | string
    /** Show a × that removes every tag. */
    clearable?: boolean
    /** Renders hidden inputs so the tags are posted with a native <form>. */
    name?: string
  }>(),
  { size: 'md', separators: () => [','] },
)

const emit = defineEmits<{ add: [tag: string]; remove: [tag: string]; reject: [tag: string, reason: string] }>()
const model = defineModel<string[]>({ default: () => [] })

const { fieldError, fieldRequired } = useFormField(props)
const { rootAttrs, controlAttrs } = useSplitAttrs()
const autoId = useId()
const controlId = computed(() => props.id ?? `ml-taginput-${autoId}`)

const input = ref<HTMLInputElement>()
const draft = ref('')
const rejection = ref('')
/** Tag about to be removed by a second Backspace. */
const armed = ref(-1)
const full = computed(() => props.max !== undefined && model.value.length >= props.max)
const shownError = computed(() => fieldError.value || rejection.value || undefined)

/**
 * Add several tags in one go (a paste can hold many). Builds the new list
 * locally because v-model only catches up after the parent re-renders.
 * Returns whether the last one was accepted.
 */
function add(...raws: string[]) {
  const next = [...model.value]
  let reason = ''
  let lastOk = false
  for (const raw of raws) {
    const tag = raw.trim()
    if (!tag) continue
    let why = ''
    if (props.max !== undefined && next.length >= props.max) why = loc.value.tagInput.max(props.max)
    else if (!props.allowDuplicates && next.includes(tag)) why = loc.value.tagInput.duplicate(tag)
    else {
      const result = props.validate?.(tag) ?? true
      if (result !== true) why = typeof result === 'string' ? result : loc.value.tagInput.invalid(tag)
    }
    lastOk = !why
    if (why) {
      reason = why
      emit('reject', tag, why)
    } else {
      next.push(tag)
      emit('add', tag)
    }
  }
  rejection.value = reason
  if (next.length !== model.value.length) model.value = next
  return lastOk
}

function commitDraft() {
  if (add(draft.value)) draft.value = ''
}

function remove(index: number) {
  if (props.disabled) return
  const tag = model.value[index]
  model.value = model.value.filter((_, i) => i !== index)
  emit('remove', tag)
  armed.value = -1
  input.value?.focus()
}

function clear() {
  model.value = []
  rejection.value = ''
  input.value?.focus()
}

function onKeydown(event: KeyboardEvent) {
  if (event.isComposing) return // let 注音 / 拼音 finish composing first
  if (event.key === 'Enter' || props.separators.includes(event.key)) {
    if (event.key === 'Enter' && !draft.value.trim()) return
    event.preventDefault()
    commitDraft()
  } else if (event.key === 'Backspace' && !draft.value && model.value.length) {
    // First Backspace highlights the last tag, the second removes it.
    if (armed.value === model.value.length - 1) remove(armed.value)
    else armed.value = model.value.length - 1
  } else {
    armed.value = -1
  }
}

function onInput(event: Event) {
  const value = (event.target as HTMLInputElement).value
  rejection.value = ''
  // Pasted "a, b, c" becomes three tags.
  const seps = props.separators.filter((s) => s.length === 1)
  if (seps.some((s) => value.includes(s))) {
    const parts = value.split(new RegExp(`[${seps.map((s) => s.replace(/[\\\]^-]/g, '\\$&')).join('')}]`))
    draft.value = (parts.pop() ?? '').trimStart()
    add(...parts)
  } else {
    draft.value = value
  }
}
</script>

<template>
  <MlField
    v-bind="rootAttrs()"
    :control-id="controlId"
    :label="label"
    :hint="hint"
    :error="shownError"
    :index="index"
    :required="fieldRequired"
  >
    <div
      :class="[
        'ml-input',
        `ml-input--${size}`,
        'ml-taginput',
        { 'ml-input--error': shownError, 'ml-input--disabled': disabled },
      ]"
      @click="input?.focus()"
    >
      <span v-if="$slots.prefix" class="ml-input__affix"><slot name="prefix" /></span>
      <ul class="ml-taginput__list" :aria-label="loc.tagInput.added(label)">
        <li
          v-for="(tag, i) in model"
          :key="`${tag}-${i}`"
          :class="['ml-combobox__tag', 'ml-taginput__tag', { 'ml-taginput__tag--armed': i === armed }]"
        >
          <slot name="tag" :tag="tag" :index="i">{{ tag }}</slot>
          <button
            v-if="!disabled"
            type="button"
            class="ml-combobox__tag-remove"
            :aria-label="loc.common.remove(tag)"
            @click.stop="remove(i)"
          >
            <MlIcon name="close" />
          </button>
        </li>
        <li class="ml-taginput__entry">
          <input
            v-show="!full"
            :id="controlId"
            ref="input"
            v-bind="controlAttrs()"
            class="ml-input__control ml-taginput__control"
            type="text"
            autocomplete="off"
            enterkeyhint="enter"
            :value="draft"
            :placeholder="model.length ? '' : placeholder ?? loc.tagInput.placeholder"
            :disabled="disabled"
            :aria-invalid="shownError ? true : undefined"
            :aria-describedby="describedBy(controlId, hint, shownError)"
            @input="onInput"
            @keydown="onKeydown"
            @blur="commitDraft(); armed = -1"
          />
        </li>
      </ul>
      <span v-if="max !== undefined" class="ml-taginput__count" aria-hidden="true">{{ model.length }}/{{ max }}</span>
      <button
        v-if="clearable && model.length && !disabled"
        type="button"
        class="ml-datepicker__clear"
        :aria-label="loc.tagInput.clearAll"
        @click.stop="clear"
      >
        <MlIcon name="close" />
      </button>
      <template v-if="name">
        <input v-for="(tag, i) in model" :key="i" type="hidden" :name="name" :value="tag" />
      </template>
    </div>
  </MlField>
</template>
