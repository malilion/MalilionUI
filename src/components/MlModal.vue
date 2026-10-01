<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'
import MlIcon from './MlIcon.vue'
import { useScrollLock } from '../composables'

const props = withDefaults(
  defineProps<{
    title?: string
    eyebrow?: string
    /** Panel max width, e.g. 640 or "40rem". */
    width?: number | string
    closeOnBackdrop?: boolean
    closeOnEsc?: boolean
    hideClose?: boolean
    /** Render in place instead of teleporting to <body>. */
    inline?: boolean
  }>(),
  { closeOnBackdrop: true, closeOnEsc: true },
)

const emit = defineEmits<{ close: [] }>()
const open = defineModel<boolean>('open', { default: false })

const titleId = `ml-modal-${useId()}`
const panel = ref<HTMLElement>()
let returnFocusTo: HTMLElement | null = null

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), ' +
  'textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

const scrollLock = useScrollLock()

async function onOpen() {
  returnFocusTo = document.activeElement as HTMLElement | null
  scrollLock.lock()
  await nextTick()
  // Focus the dialog itself rather than its first button, so a destructive
  // action is never one stray Enter away.
  panel.value?.focus()
}

function onClose() {
  scrollLock.unlock()
  returnFocusTo?.focus?.()
  returnFocusTo = null
}

function close() {
  open.value = false
  emit('close')
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && props.closeOnEsc) {
    event.stopPropagation()
    close()
    return
  }
  if (event.key !== 'Tab' || !panel.value) return
  const focusable = [...panel.value.querySelectorAll<HTMLElement>(FOCUSABLE)]
  if (focusable.length === 0) {
    event.preventDefault()
    return
  }
  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  const active = document.activeElement
  if (event.shiftKey && (active === first || active === panel.value)) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && active === last) {
    event.preventDefault()
    first.focus()
  }
}

watch(open, (value) => (value ? onOpen() : onClose()))
onMounted(() => {
  if (open.value) onOpen()
})
onBeforeUnmount(scrollLock.unlock)
</script>

<template>
  <Teleport to="body" :disabled="inline">
    <Transition name="ml-modal" :duration="{ enter: 480, leave: 220 }">
      <div v-if="open" class="ml-modal" @keydown="onKeydown">
        <div class="ml-modal__backdrop" @click="closeOnBackdrop && close()" />
        <div
          ref="panel"
          class="ml-modal__panel"
          role="dialog"
          aria-modal="true"
          tabindex="-1"
          :aria-labelledby="title || $slots.title ? titleId : undefined"
          :style="width ? { '--_width': typeof width === 'number' ? `${width}px` : width } : undefined"
        >
          <header v-if="title || eyebrow || $slots.title || !hideClose" class="ml-modal__header">
            <div class="ml-modal__heading">
              <p v-if="eyebrow" class="ml-modal__eyebrow">{{ eyebrow }}</p>
              <h2 v-if="title || $slots.title" :id="titleId" class="ml-modal__title">
                <slot name="title">{{ title }}</slot>
              </h2>
            </div>
            <button
              v-if="!hideClose"
              type="button"
              class="ml-modal__close"
              aria-label="關閉"
              @click="close"
            >
              <MlIcon name="close" />
            </button>
          </header>
          <div class="ml-modal__body">
            <slot />
          </div>
          <footer v-if="$slots.footer" class="ml-modal__footer">
            <slot name="footer" :close="close" />
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
