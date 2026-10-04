<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { icons } from './icons'
import {
  BACKSPACE_PATH,
  KEYBOARD_HOLD,
  KEYBOARD_REPEAT,
  keyboardAppend,
  keyboardDelete,
  keyboardLayout,
  shuffledDigits,
  type MlNumberKeyboardTheme,
  type NumberKeyboardKey,
} from './number-keyboard'
import { useLocale } from '../locale'

const loc = useLocale()

const props = withDefaults(
  defineProps<{
    /** default: 3 × 4 with ⌫ bottom-right. custom: a side column with ⌫ and a big Done key. */
    theme?: MlNumberKeyboardTheme
    /** "." for amounts, "X" for 身分證, "00"… The custom theme takes up to two. */
    extraKey?: string | string[]
    /** Most characters v-model may hold. */
    maxlength?: number
    /** Shuffle the digits each time the keyboard opens (PIN pads). */
    random?: boolean
    title?: string
    /** Text of the Done key. Default "完成". */
    closeText?: string
    /** Pinned to the bottom of the screen and opened with v-model:show. */
    fixed?: boolean
    /** A fixed keyboard closes when you tap elsewhere or press Esc. */
    hideOnClickOutside?: boolean
    /** Accessible name. Default "數字鍵盤". */
    label?: string
  }>(),
  { theme: 'default', maxlength: Infinity, hideOnClickOutside: true },
)
const emit = defineEmits<{ input: [key: string]; delete: []; close: [] }>()
const model = defineModel<string>({ default: '' })
const show = defineModel<boolean>('show', { default: false })

const root = ref<HTMLElement>()
const order = ref<number[]>()
const open = computed(() => !props.fixed || show.value)
const keys = computed(() => keyboardLayout(props.theme, props.extraKey, props.fixed, order.value))

function reshuffle() {
  order.value = props.random ? shuffledDigits() : undefined
}
// Shuffled only on the client, so server and first client render agree.
onMounted(reshuffle)
watch(() => props.random, reshuffle)
watch(show, (v) => v && reshuffle())

function press(key: NumberKeyboardKey) {
  if (key.type === 'digit' || key.type === 'extra') {
    emit('input', key.text)
    model.value = keyboardAppend(model.value, key.text, props.maxlength)
  } else if (key.type === 'delete') remove()
  else if (key.type === 'collapse') close()
}

function remove() {
  emit('delete')
  model.value = keyboardDelete(model.value)
}

function close() {
  emit('close')
  if (props.fixed) show.value = false
}

/* Long-press ⌫ keeps deleting. The click that ends a long press is swallowed. */
let holdTimer: ReturnType<typeof setTimeout> | undefined
let repeatTimer: ReturnType<typeof setInterval> | undefined
let repeated = false
function startRepeat() {
  stopRepeat()
  repeated = false
  holdTimer = setTimeout(() => {
    repeatTimer = setInterval(() => {
      repeated = true
      remove()
    }, KEYBOARD_REPEAT)
  }, KEYBOARD_HOLD)
}
function stopRepeat() {
  clearTimeout(holdTimer)
  clearInterval(repeatTimer)
}
function onDeleteClick() {
  if (repeated) repeated = false
  else remove()
}

function onDocPointer(event: PointerEvent) {
  if (root.value && !root.value.contains(event.target as Node)) close()
}
function onDocKey(event: KeyboardEvent) {
  if (event.key === 'Escape') close()
}
function listen(on: boolean) {
  document.removeEventListener('pointerdown', onDocPointer)
  document.removeEventListener('keydown', onDocKey)
  if (on) {
    document.addEventListener('pointerdown', onDocPointer)
    document.addEventListener('keydown', onDocKey)
  }
}
watch(
  () => props.fixed && props.hideOnClickOutside && show.value,
  (on) => listen(on),
  { flush: 'post' },
)
onMounted(() => listen(props.fixed && props.hideOnClickOutside && show.value))
onBeforeUnmount(() => {
  listen(false)
  stopRepeat()
})
</script>

<template>
  <div
    ref="root"
    role="group"
    :aria-label="label ?? loc.numberKeyboard.label"
    :aria-hidden="open ? undefined : 'true'"
    :inert="!open || undefined"
    :class="['ml-numkey', `ml-numkey--${theme}`, { 'ml-numkey--fixed': fixed, 'ml-numkey--open': fixed && open }]"
  >
    <div v-if="title || (fixed && theme === 'default')" class="ml-numkey__head">
      <span class="ml-numkey__title">{{ title }}</span>
      <button v-if="fixed && theme === 'default'" type="button" class="ml-numkey__done" @click="close">{{ closeText ?? loc.numberKeyboard.close }}</button>
    </div>
    <div class="ml-numkey__body">
      <div class="ml-numkey__keys">
        <template v-for="(key, i) in keys" :key="i">
          <span v-if="key.type === 'blank'" class="ml-numkey__key ml-numkey__key--blank" aria-hidden="true" />
          <button
            v-else-if="key.type === 'delete'"
            type="button"
            class="ml-numkey__key ml-numkey__key--delete"
            :aria-label="loc.numberKeyboard.delete"
            @mousedown.prevent
            @pointerdown="startRepeat"
            @pointerup="stopRepeat"
            @pointerleave="stopRepeat"
            @pointercancel="stopRepeat"
            @click="onDeleteClick"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round">
              <path :d="BACKSPACE_PATH" />
            </svg>
          </button>
          <button
            v-else-if="key.type === 'collapse'"
            type="button"
            class="ml-numkey__key ml-numkey__key--collapse"
            :aria-label="loc.numberKeyboard.collapse"
            @mousedown.prevent
            @click="close"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square">
              <path :d="icons.chevronDown" />
            </svg>
          </button>
          <button
            v-else
            type="button"
            :class="['ml-numkey__key', `ml-numkey__key--${key.type}`, key.span && `ml-numkey__key--span${key.span}`]"
            @mousedown.prevent
            @click="press(key)"
          >
            {{ key.text }}
          </button>
        </template>
      </div>
      <div v-if="theme === 'custom'" class="ml-numkey__side">
        <button
          type="button"
          class="ml-numkey__key ml-numkey__key--delete"
          :aria-label="loc.numberKeyboard.delete"
          @mousedown.prevent
          @pointerdown="startRepeat"
          @pointerup="stopRepeat"
          @pointerleave="stopRepeat"
          @pointercancel="stopRepeat"
          @click="onDeleteClick"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round">
            <path :d="BACKSPACE_PATH" />
          </svg>
        </button>
        <button type="button" class="ml-numkey__key ml-numkey__key--close" @mousedown.prevent @click="close">
          {{ closeText ?? loc.numberKeyboard.close }}
        </button>
      </div>
    </div>
  </div>
</template>
