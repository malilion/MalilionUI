<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'
import { useOutsidePointer } from '../composables'
import type { MlPlacement } from '../types'

const props = withDefaults(
  defineProps<{
    placement?: MlPlacement
    /** "click" toggles on click; "hover" opens on hover and keyboard focus. */
    trigger?: 'click' | 'hover'
    title?: string
    /** Panel width, e.g. 280 or "18rem". Defaults to fit the content (max 320px). */
    width?: number | string
    disabled?: boolean
    /** Hover delay in ms. */
    delay?: number
    /** id of an element inside the content that describes the dialog. */
    describedby?: string
  }>(),
  { placement: 'bottom', trigger: 'click', delay: 120 },
)

const open = defineModel<boolean>('open', { default: false })

const panelId = `ml-popover-${useId()}`
const titleId = `${panelId}-title`
const root = ref<HTMLElement>()
const triggerWrap = ref<HTMLElement>()
const panel = ref<HTMLElement>()
let timer: ReturnType<typeof setTimeout> | undefined

function triggerEl() {
  return triggerWrap.value?.firstElementChild as HTMLElement | null | undefined
}

function show() {
  if (!props.disabled) open.value = true
}

function hide(returnFocus = false) {
  if (!open.value) return
  open.value = false
  if (returnFocus) triggerEl()?.focus()
}

function toggle() {
  if (open.value) hide()
  else show()
}

function onTriggerClick() {
  if (props.trigger === 'click') toggle()
}

function onEnter() {
  if (props.trigger !== 'hover') return
  clearTimeout(timer)
  timer = setTimeout(show, props.delay)
}

function onLeave() {
  if (props.trigger !== 'hover') return
  clearTimeout(timer)
  timer = setTimeout(() => hide(), props.delay)
}

function onFocusIn() {
  if (props.trigger === 'hover') {
    clearTimeout(timer)
    show()
  }
}

function onFocusOut(event: FocusEvent) {
  if (props.trigger === 'hover' && !root.value?.contains(event.relatedTarget as Node | null)) hide()
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && open.value) {
    event.stopPropagation()
    hide(true)
  }
}

// The trigger is slotted content, so wire its ARIA state directly.
function syncTrigger() {
  const el = triggerEl()
  if (!el) return
  el.setAttribute('aria-expanded', String(open.value))
  el.setAttribute('aria-haspopup', 'dialog')
  if (open.value) el.setAttribute('aria-controls', panelId)
  else el.removeAttribute('aria-controls')
}

onMounted(syncTrigger)
watch(open, () => nextTick(syncTrigger))
useOutsidePointer(root, () => open.value && props.trigger === 'click', () => hide())
onBeforeUnmount(() => clearTimeout(timer))

defineExpose({ show, hide, toggle, panel })
</script>

<template>
  <span
    ref="root"
    :class="['ml-popover', { 'ml-popover--open': open }]"
    @mouseenter="onEnter"
    @mouseleave="onLeave"
    @focusin="onFocusIn"
    @focusout="onFocusOut"
    @keydown="onKeydown"
  >
    <span ref="triggerWrap" class="ml-popover__trigger" @click="onTriggerClick">
      <slot :open="open" :toggle="toggle" />
    </span>
    <Transition name="ml-popover">
      <div
        v-if="open"
        :id="panelId"
        ref="panel"
        role="dialog"
        :aria-labelledby="title || $slots.title ? titleId : undefined"
        :aria-describedby="describedby"
        :class="['ml-popover__panel', `ml-popover__panel--${placement}`]"
        :style="width ? { width: typeof width === 'number' ? `${width}px` : width } : undefined"
        tabindex="-1"
      >
        <p v-if="title || $slots.title" :id="titleId" class="ml-popover__title">
          <slot name="title">{{ title }}</slot>
        </p>
        <div class="ml-popover__body">
          <slot name="content" :close="() => hide(true)" />
        </div>
      </div>
    </Transition>
  </span>
</template>
