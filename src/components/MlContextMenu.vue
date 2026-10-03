<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, useId } from 'vue'
import MlIcon from './MlIcon.vue'
import type { MlDropdownItem } from '../types'

const props = withDefaults(
  defineProps<{
    items: MlDropdownItem[]
    disabled?: boolean
    /** Accessible name for the menu. */
    label?: string
  }>(),
  { label: '右鍵選單' },
)

const emit = defineEmits<{ select: [item: MlDropdownItem]; open: [event: MouseEvent | KeyboardEvent] }>()

const open = ref(false)
const pos = ref({ x: 0, y: 0 })
const menu = ref<HTMLElement>()
const itemEls = ref<HTMLElement[]>([])
const menuId = `ml-ctx-${useId()}`
let returnFocusTo: HTMLElement | null = null

const enabled = computed(() => props.items.flatMap((item, i) => (item.disabled ? [] : [i])))

async function show(x: number, y: number) {
  returnFocusTo = document.activeElement as HTMLElement | null
  pos.value = { x, y }
  open.value = true
  await nextTick()
  // Keep the whole menu on screen: flip left / up when it would overflow.
  const el = menu.value
  if (el) {
    const { width, height } = el.getBoundingClientRect()
    pos.value = {
      x: x + width > window.innerWidth - 8 ? Math.max(8, x - width) : x,
      y: y + height > window.innerHeight - 8 ? Math.max(8, y - height) : y,
    }
  }
  itemEls.value[enabled.value[0]]?.focus()
  document.addEventListener('pointerdown', onOutside, true)
  window.addEventListener('scroll', closeQuiet, true)
  window.addEventListener('resize', closeQuiet)
}

function close(returnFocus = false) {
  if (!open.value) return
  open.value = false
  document.removeEventListener('pointerdown', onOutside, true)
  window.removeEventListener('scroll', closeQuiet, true)
  window.removeEventListener('resize', closeQuiet)
  if (returnFocus) returnFocusTo?.focus?.()
}

function closeQuiet() {
  close(false)
}

function onOutside(event: PointerEvent) {
  if (!menu.value?.contains(event.target as Node)) close(false)
}

function onContextMenu(event: MouseEvent) {
  if (props.disabled) return
  event.preventDefault()
  emit('open', event)
  show(event.clientX, event.clientY)
}

// Shift+F10 or the Menu key opens it at the focused element, for keyboard users.
function onTargetKeydown(event: KeyboardEvent) {
  if (props.disabled) return
  if (event.key === 'ContextMenu' || (event.key === 'F10' && event.shiftKey)) {
    event.preventDefault()
    const rect = (event.target as HTMLElement).getBoundingClientRect()
    emit('open', event)
    show(rect.left + 12, rect.top + Math.min(rect.height, 32))
  }
}

function choose(item: MlDropdownItem) {
  if (item.disabled) return
  close(true)
  emit('select', item)
}

function onMenuKeydown(event: KeyboardEvent) {
  const list = enabled.value
  const current = itemEls.value.findIndex((el) => el === document.activeElement)
  const at = list.indexOf(current)
  const focus = (i: number | undefined) => i !== undefined && itemEls.value[i]?.focus()
  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      focus(list[(at + 1) % list.length])
      break
    case 'ArrowUp':
      event.preventDefault()
      focus(list[(at - 1 + list.length) % list.length])
      break
    case 'Home':
      event.preventDefault()
      focus(list[0])
      break
    case 'End':
      event.preventDefault()
      focus(list.at(-1))
      break
    case 'Enter':
    case ' ':
      event.preventDefault()
      if (current !== -1) choose(props.items[current])
      break
    case 'Escape':
    case 'Tab':
      event.preventDefault()
      close(true)
  }
}

onBeforeUnmount(() => close(false))

defineExpose({ open: show, close: () => close(false) })
</script>

<template>
  <div class="ml-ctx" @contextmenu="onContextMenu" @keydown="onTargetKeydown">
    <slot :open="open" />
  </div>
  <Teleport to="body">
    <Transition name="ml-dropdown">
      <ul
        v-if="open"
        :id="menuId"
        ref="menu"
        role="menu"
        :aria-label="label"
        class="ml-dropdown__menu ml-ctx__menu"
        :style="{ left: `${pos.x}px`, top: `${pos.y}px` }"
        @keydown="onMenuKeydown"
        @contextmenu.prevent
      >
        <template v-for="(item, index) in items" :key="item.value">
          <li v-if="item.divider" role="separator" class="ml-dropdown__divider" />
          <li
            :ref="(el) => (itemEls[index] = el as HTMLElement)"
            role="menuitem"
            tabindex="-1"
            :aria-disabled="item.disabled || undefined"
            :class="['ml-dropdown__item', { 'ml-dropdown__item--danger': item.danger }]"
            @click="choose(item)"
            @mousemove="!item.disabled && ($event.currentTarget as HTMLElement).focus()"
          >
            <MlIcon v-if="item.icon" :name="item.icon" class="ml-dropdown__icon" />
            <span class="ml-dropdown__label">{{ item.label }}</span>
            <span v-if="item.hint" class="ml-dropdown__hint">{{ item.hint }}</span>
          </li>
        </template>
      </ul>
    </Transition>
  </Teleport>
</template>
