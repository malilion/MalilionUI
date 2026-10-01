<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import MlIcon from './MlIcon.vue'
import MlPaw from './MlPaw.vue'
import type { MlToastItem } from '../toast'

const props = defineProps<{ item: MlToastItem }>()
const emit = defineEmits<{ close: [] }>()

// The countdown pauses while the pointer or focus is on the toast, so nobody
// loses a message they're in the middle of reading.
const paused = ref(false)
let timer: ReturnType<typeof setTimeout> | undefined
let remaining = props.item.duration
let startedAt = 0

function start() {
  if (props.item.duration <= 0) return
  startedAt = Date.now()
  timer = setTimeout(() => emit('close'), remaining)
}

function pause() {
  if (props.item.duration <= 0 || paused.value) return
  paused.value = true
  clearTimeout(timer)
  remaining -= Date.now() - startedAt
}

function resume() {
  if (!paused.value) return
  paused.value = false
  start()
}

function runAction() {
  props.item.action?.onClick()
  emit('close')
}

onMounted(start)
onBeforeUnmount(() => clearTimeout(timer))
</script>

<template>
  <li
    :class="['ml-toast', `ml-toast--${item.tone}`, { 'ml-toast--paused': paused }]"
    :role="item.tone === 'danger' ? 'alert' : undefined"
    @mouseenter="pause"
    @mouseleave="resume"
    @focusin="pause"
    @focusout="resume"
  >
    <MlPaw class="ml-toast__watermark" tone="current" />
    <span class="ml-toast__icon">
      <MlPaw v-if="item.tone === 'paw'" tone="gold" />
      <MlIcon v-else :name="item.tone" />
    </span>
    <div class="ml-toast__content">
      <p v-if="item.title" class="ml-toast__title">{{ item.title }}</p>
      <p v-if="item.message" class="ml-toast__message">{{ item.message }}</p>
    </div>
    <button v-if="item.action" type="button" class="ml-toast__action" @click="runAction">
      {{ item.action.label }}
    </button>
    <button v-if="item.closable" type="button" class="ml-toast__close" aria-label="關閉通知" @click="emit('close')">
      <MlIcon name="close" />
    </button>
    <span
      v-if="item.duration > 0"
      class="ml-toast__timer"
      aria-hidden="true"
      :style="{ animationDuration: `${item.duration}ms` }"
    />
  </li>
</template>
