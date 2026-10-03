<script setup lang="ts">
import { onMounted, ref } from 'vue'
import MlIcon from './MlIcon.vue'
import MlPaw from './MlPaw.vue'
import { useLocale } from '../locale'
import type { IconName } from './icons'

const loc = useLocale()

const props = withDefaults(
  defineProps<{
    tone?: 'info' | 'success' | 'warning' | 'danger' | 'gold' | 'paw'
    title?: string
    /** Plain-text message; use the default slot for rich content. */
    message?: string
    icon?: IconName | 'none'
    closable?: boolean
    /** Stick to the top of the page while scrolling. */
    sticky?: boolean
    /** Remember a dismissal in localStorage under this key, so it stays closed. */
    storageKey?: string
  }>(),
  { tone: 'info' },
)

const emit = defineEmits<{ close: [] }>()
const open = defineModel<boolean>('open', { default: true })
const visible = ref(true)

const icons: Record<string, IconName> = { info: 'info', success: 'success', warning: 'warning', danger: 'danger', gold: 'bell' }

onMounted(() => {
  if (!props.storageKey) return
  try {
    if (localStorage.getItem(props.storageKey) === 'dismissed') visible.value = false
  } catch {
    // Storage blocked (private mode, sandboxed iframe): just show it.
  }
})

function close() {
  visible.value = false
  open.value = false
  emit('close')
  if (!props.storageKey) return
  try {
    localStorage.setItem(props.storageKey, 'dismissed')
  } catch {
    // Ignore: the banner is closed for this page view either way.
  }
}
</script>

<template>
  <Transition name="ml-banner">
    <div
      v-if="open && visible"
      :class="['ml-banner', `ml-banner--${tone}`, { 'ml-banner--sticky': sticky }]"
      :role="tone === 'danger' || tone === 'warning' ? 'alert' : 'status'"
    >
      <span v-if="icon !== 'none'" class="ml-banner__icon" aria-hidden="true">
        <MlPaw v-if="tone === 'paw' && !icon" tone="current" />
        <MlIcon v-else :name="icon ?? icons[tone] ?? 'info'" />
      </span>
      <p class="ml-banner__text">
        <strong v-if="title" class="ml-banner__title">{{ title }}</strong>
        <slot>{{ message }}</slot>
      </p>
      <div v-if="$slots.action" class="ml-banner__action"><slot name="action" /></div>
      <button v-if="closable" type="button" class="ml-banner__close" :aria-label="loc.banner.close" @click="close">
        <MlIcon name="close" />
      </button>
    </div>
  </Transition>
</template>
