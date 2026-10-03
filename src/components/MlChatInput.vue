<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import MlIcon from './MlIcon.vue'
import { useLocale } from '../locale'

const loc = useLocale()

const props = withDefaults(
  defineProps<{
    placeholder?: string
    /** Waiting for a reply: sending is blocked and the button shows a stop icon. */
    loading?: boolean
    disabled?: boolean
    /** Grow up to this many lines before scrolling. */
    maxRows?: number
    maxLength?: number
  }>(),
  { maxRows: 6 },
)

const emit = defineEmits<{ send: [text: string]; stop: [] }>()
const model = defineModel<string>({ default: '' })
const area = ref<HTMLTextAreaElement>()
const canSend = computed(() => !!model.value.trim() && !props.loading && !props.disabled)

function resize() {
  const el = area.value
  if (!el) return
  el.style.height = 'auto'
  const line = parseFloat(getComputedStyle(el).lineHeight) || 22
  el.style.height = `${Math.min(el.scrollHeight, line * props.maxRows + 20)}px`
}

watch(model, () => nextTick(resize))

function send() {
  if (!canSend.value) return
  emit('send', model.value.trim())
  model.value = ''
}

function onKeydown(event: KeyboardEvent) {
  // Enter sends, Shift+Enter is a newline; never send mid-IME composition (注音、拼音).
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
    event.preventDefault()
    send()
  }
}

defineExpose({ focus: () => area.value?.focus() })
</script>

<template>
  <div :class="['ml-chat-input', { 'ml-chat-input--disabled': disabled }]">
    <slot name="prefix" />
    <textarea
      ref="area"
      v-model="model"
      class="ml-chat-input__area"
      rows="1"
      :placeholder="placeholder ?? loc.chat.placeholder"
      :disabled="disabled"
      :maxlength="maxLength"
      :aria-label="placeholder ?? loc.chat.placeholder"
      @keydown="onKeydown"
    />
    <button
      v-if="loading"
      type="button"
      class="ml-chat-input__btn ml-chat-input__btn--stop"
      :aria-label="loc.chat.stop"
      @click="emit('stop')"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="7" width="10" height="10" rx="1.5" fill="currentColor" /></svg>
    </button>
    <button
      v-else
      type="button"
      class="ml-chat-input__btn"
      :disabled="!canSend"
      :aria-label="loc.chat.send"
      @click="send"
    >
      <MlIcon name="arrowUp" />
    </button>
  </div>
</template>
