<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import MlBottomSheet from './MlBottomSheet.vue'
import MlIcon from './MlIcon.vue'
import { useLocale } from '../locale'
import type { MlActionSheetAction } from '../types'

const loc = useLocale()

const props = withDefaults(
  defineProps<{
    actions?: MlActionSheetAction[]
    title?: string
    description?: string
    /** Cancel button text; false hides the button. */
    cancelText?: string | false
    /** Close after an action is picked. */
    closeOnSelect?: boolean
    /** Render in place instead of on <body>. */
    inline?: boolean
    /** Accessible name of the menu when there is no title. */
    label?: string
  }>(),
  { actions: () => [], cancelText: undefined, closeOnSelect: true },
)

const emit = defineEmits<{
  select: [action: MlActionSheetAction, index: number]
  /** Closed without picking anything (cancel button, Esc, backdrop, drag down). */
  cancel: []
  close: []
}>()
const open = defineModel<boolean>('open', { default: false })

const list = ref<HTMLElement>()
/** Roving tab stop: the first enabled action until the user moves. */
const active = ref(0)
const firstEnabled = computed(() => Math.max(0, props.actions.findIndex((a) => !a.disabled)))
let picked = false

watch(open, (value) => {
  if (value) {
    picked = false
    active.value = firstEnabled.value
  }
})

function setOpen(value: boolean) {
  if (!value && open.value && !picked) emit('cancel')
  open.value = value
}

function choose(action: MlActionSheetAction, index: number) {
  if (action.disabled) return
  emit('select', action, index)
  if (props.closeOnSelect) {
    picked = true
    open.value = false
    emit('close')
  }
}

function cancel() {
  setOpen(false)
  emit('close')
}

function items() {
  return [...(list.value?.querySelectorAll<HTMLButtonElement>('.ml-action-sheet__item') ?? [])]
}

function onKeydown(event: KeyboardEvent) {
  if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
  const buttons = items()
  const enabled = buttons.map((b, i) => (b.disabled ? -1 : i)).filter((i) => i !== -1)
  if (!enabled.length) return
  event.preventDefault()
  const current = buttons.indexOf(document.activeElement as HTMLButtonElement)
  const pos = enabled.indexOf(current)
  let next: number
  if (event.key === 'Home') next = enabled[0]
  else if (event.key === 'End') next = enabled[enabled.length - 1]
  else if (pos === -1) next = event.key === 'ArrowDown' ? enabled[0] : enabled[enabled.length - 1]
  else next = enabled[(pos + (event.key === 'ArrowDown' ? 1 : -1) + enabled.length) % enabled.length]
  active.value = next
  buttons[next]?.focus()
}
</script>

<template>
  <MlBottomSheet
    :open="open"
    class="ml-action-sheet"
    :title="title"
    :description="description"
    :inline="inline"
    :label="label ?? loc.sheet.actions"
    @update:open="setOpen"
    @close="emit('close')"
    @keydown="onKeydown"
  >
    <ul ref="list" class="ml-action-sheet__list" role="menu" :aria-label="title || label || loc.sheet.actions">
      <li v-for="(action, i) in actions" :key="i" role="none">
        <button
          type="button"
          role="menuitem"
          :class="['ml-action-sheet__item', `ml-action-sheet__item--${action.tone ?? 'default'}`]"
          :disabled="action.disabled"
          :tabindex="i === active ? 0 : -1"
          @click="choose(action, i)"
        >
          <MlIcon v-if="action.icon" :name="action.icon" class="ml-action-sheet__icon" />
          <span class="ml-action-sheet__text">
            <span class="ml-action-sheet__label">{{ action.label }}</span>
            <span v-if="action.description" class="ml-action-sheet__desc">{{ action.description }}</span>
          </span>
        </button>
      </li>
    </ul>
    <template v-if="cancelText !== false" #footer>
      <button type="button" class="ml-action-sheet__cancel" @click="cancel">{{ cancelText ?? loc.common.cancel }}</button>
    </template>
  </MlBottomSheet>
</template>
