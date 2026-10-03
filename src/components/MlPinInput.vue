<script setup lang="ts">
import { computed, ref, useId, watch } from 'vue'
import MlField from './MlField.vue'
import { describedBy } from '../composables'
import { useFormField } from '../form'
import type { MlSize } from '../types'

const props = withDefaults(
  defineProps<{
    /** Number of boxes. */
    length?: number
    /** numeric: digits only (numeric keypad on phones). alphanumeric: letters and digits. */
    type?: 'numeric' | 'alphanumeric'
    /** Show dots instead of the characters. */
    mask?: boolean
    label?: string
    hint?: string
    error?: string
    index?: string
    size?: MlSize
    disabled?: boolean
    /** Put the cursor in the first box on mount. */
    autofocus?: boolean
    /** Draw a gap after this many boxes, e.g. 3 for "123 456". */
    groupSize?: number
    id?: string
    /** Renders a hidden input so the code is posted with a native <form>. */
    name?: string
  }>(),
  { length: 6, type: 'numeric', size: 'md' },
)

const emit = defineEmits<{ complete: [code: string] }>()
const model = defineModel<string>({ default: '' })
const { fieldError } = useFormField(props)

const autoId = useId()
const controlId = computed(() => props.id ?? `ml-pin-${autoId}`)
const boxes = ref<HTMLInputElement[]>([])
const pattern = computed(() => (props.type === 'numeric' ? /[0-9]/ : /[0-9a-z]/i))

// A local copy so focus moves can read the new code right away, before the
// parent's v-model round-trip has re-rendered us.
const code = ref(model.value)
watch(model, (v) => (code.value = v))
const chars = computed(() => Array.from({ length: props.length }, (_, i) => code.value[i] ?? ''))

function setChars(next: string[]) {
  const value = next.join('').slice(0, props.length)
  code.value = value
  model.value = value
  if (value.length === props.length && !next.slice(0, props.length).includes('')) emit('complete', value)
}

function focusBox(i: number) {
  const el = boxes.value[Math.max(0, Math.min(props.length - 1, i))]
  el?.focus()
  el?.select()
}

function clean(text: string) {
  return [...text].filter((c) => pattern.value.test(c)).map((c) => (props.type === 'alphanumeric' ? c.toUpperCase() : c))
}

function onInput(event: Event, i: number) {
  const el = event.target as HTMLInputElement
  const typed = clean(el.value)
  if (!typed.length) {
    el.value = chars.value[i]
    return
  }
  // Typing over a filled box, or autofill dropping the whole code into the first
  // box (which has no maxlength for exactly that reason).
  const next = [...chars.value]
  typed.forEach((c, k) => {
    if (i + k < props.length) next[i + k] = c
  })
  // Keep the value contiguous: no holes before the last filled box.
  const firstHole = next.indexOf('')
  setChars(firstHole === -1 ? next : next.slice(0, firstHole))
  el.value = next[i]
  focusBox(Math.min(i + typed.length, props.length - 1))
}

function onKeydown(event: KeyboardEvent, i: number) {
  if (event.key === 'Backspace') {
    event.preventDefault()
    const next = [...chars.value]
    if (next[i]) {
      next.splice(i, 1)
      setChars(next)
    } else if (i > 0) {
      next.splice(i - 1, 1)
      setChars(next)
      focusBox(i - 1)
    }
  } else if (event.key === 'ArrowLeft') {
    event.preventDefault()
    focusBox(i - 1)
  } else if (event.key === 'ArrowRight') {
    event.preventDefault()
    focusBox(i + 1)
  } else if (event.key === 'Home' || event.key === 'End') {
    event.preventDefault()
    focusBox(event.key === 'Home' ? 0 : code.value.length)
  }
}

function onPaste(event: ClipboardEvent, i: number) {
  event.preventDefault()
  const typed = clean(event.clipboardData?.getData('text') ?? '')
  if (!typed.length) return
  const next = [...chars.value].slice(0, i)
  setChars([...next, ...typed])
  focusBox(Math.min(i + typed.length, props.length - 1))
}

// Never leave a gap: clicking an empty box past the end jumps back to the first empty one.
function onFocus(i: number) {
  const end = code.value.length
  if (i > end) focusBox(end)
  else boxes.value[i]?.select()
}

watch(
  () => props.autofocus,
  (on) => on && setTimeout(() => focusBox(0)),
  { immediate: true },
)

/** Clear the code and put the cursor back in the first box. */
function reset() {
  code.value = ''
  model.value = ''
  focusBox(0)
}

defineExpose({ focus: () => focusBox(code.value.length), reset })
</script>

<template>
  <MlField :control-id="controlId" :label="label" :hint="hint" :error="fieldError" :index="index">
    <div
      :class="['ml-pin', `ml-pin--${size}`, { 'ml-pin--error': fieldError, 'ml-pin--disabled': disabled }]"
      role="group"
      :aria-labelledby="label ? `${controlId}-label` : undefined"
      :aria-describedby="describedBy(controlId, hint, fieldError)"
    >
      <template v-for="(c, i) in chars" :key="i">
        <span v-if="groupSize && i && i % groupSize === 0" class="ml-pin__sep" aria-hidden="true" />
        <input
          :id="i === 0 ? controlId : undefined"
          :ref="(el) => (boxes[i] = el as HTMLInputElement)"
          :class="['ml-pin__box', { 'ml-pin__box--filled': c }]"
          :type="mask ? 'password' : 'text'"
          :inputmode="type === 'numeric' ? 'numeric' : 'text'"
          :autocomplete="i === 0 ? 'one-time-code' : 'off'"
          :value="c"
          :disabled="disabled"
          :aria-label="`第 ${i + 1} 碼，共 ${length} 碼`"
          :aria-invalid="fieldError ? true : undefined"
          :maxlength="i === 0 ? undefined : 1"
          @input="onInput($event, i)"
          @keydown="onKeydown($event, i)"
          @paste="onPaste($event, i)"
          @focus="onFocus(i)"
        />
      </template>
      <input v-if="name" type="hidden" :name="name" :value="code" />
    </div>
  </MlField>
</template>
