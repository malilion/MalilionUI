<script setup lang="ts">
import { computed, ref } from 'vue'
import MlIcon from './MlIcon.vue'
import type { MlAlertTone } from '../types'

const props = withDefaults(
  defineProps<{
    tone?: MlAlertTone
    title?: string
    closable?: boolean
  }>(),
  { tone: 'info' },
)

const emit = defineEmits<{ close: [] }>()
const visible = ref(true)

// Warnings and errors interrupt; info and success wait their turn.
const role = computed(() => (props.tone === 'danger' || props.tone === 'warning' ? 'alert' : 'status'))

function close() {
  visible.value = false
  emit('close')
}
</script>

<template>
  <div v-if="visible" :class="['ml-alert', `ml-alert--${tone}`]" :role="role">
    <span class="ml-alert__icon">
      <slot name="icon"><MlIcon :name="tone" /></slot>
    </span>
    <div class="ml-alert__content">
      <p v-if="title" class="ml-alert__title">{{ title }}</p>
      <div v-if="$slots.default" class="ml-alert__body"><slot /></div>
    </div>
    <button v-if="closable" type="button" class="ml-alert__close" aria-label="關閉" @click="close">
      <MlIcon name="close" />
    </button>
  </div>
</template>
