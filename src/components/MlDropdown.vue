<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, useId, watch } from 'vue'
import MlButton from './MlButton.vue'
import MlIcon from './MlIcon.vue'
import MlPaw from './MlPaw.vue'
import type { MlButtonVariant, MlDropdownItem, MlSize } from '../types'

const props = withDefaults(
  defineProps<{
    items: MlDropdownItem[]
    /** Text for the built-in trigger button. Ignored with a #trigger slot. */
    label?: string
    placement?: 'bottom-start' | 'bottom-end'
    variant?: MlButtonVariant
    size?: MlSize
    disabled?: boolean
    /** Single-choice menu: v-model holds the chosen value, marked with a paw. */
    selectable?: boolean
  }>(),
  { placement: 'bottom-start', variant: 'outline', size: 'md' },
)

const emit = defineEmits<{ select: [item: MlDropdownItem] }>()
const model = defineModel<string | number>()

const open = ref(false)
const root = ref<HTMLElement>()
const itemEls = ref<HTMLElement[]>([])
const menuId = `ml-dropdown-${useId()}`

const enabledIndexes = computed(() =>
  props.items.flatMap((item, index) => (item.disabled ? [] : [index])),
)

function trigger(): HTMLElement | null {
  return root.value?.querySelector<HTMLElement>('[aria-haspopup="menu"]') ?? null
}

function focusItem(index: number | undefined) {
  if (index === undefined) return
  itemEls.value[index]?.focus()
}

async function show(focus: 'first' | 'last' | 'selected' = 'selected') {
  if (props.disabled || open.value) return
  open.value = true
  await nextTick()
  const enabled = enabledIndexes.value
  const selected = props.items.findIndex((item) => item.value === model.value && !item.disabled)
  if (focus === 'last') focusItem(enabled.at(-1))
  else if (focus === 'selected' && props.selectable && selected !== -1) focusItem(selected)
  else focusItem(enabled[0])
}

function hide(returnFocus = true) {
  if (!open.value) return
  open.value = false
  if (returnFocus) trigger()?.focus()
}

function toggle() {
  if (open.value) hide()
  else show()
}

function choose(item: MlDropdownItem) {
  if (item.disabled) return
  if (props.selectable) model.value = item.value
  emit('select', item)
  hide()
}

function onTriggerKeydown(event: KeyboardEvent) {
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    show('first')
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    show('last')
  }
}

function onMenuKeydown(event: KeyboardEvent) {
  const enabled = enabledIndexes.value
  const current = itemEls.value.findIndex((el) => el === document.activeElement)
  const position = enabled.indexOf(current)

  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      focusItem(enabled[(position + 1) % enabled.length])
      break
    case 'ArrowUp':
      event.preventDefault()
      focusItem(enabled[(position - 1 + enabled.length) % enabled.length])
      break
    case 'Home':
      event.preventDefault()
      focusItem(enabled[0])
      break
    case 'End':
      event.preventDefault()
      focusItem(enabled.at(-1))
      break
    case 'Enter':
    case ' ':
      event.preventDefault()
      if (current !== -1) choose(props.items[current])
      break
    case 'Escape':
      event.preventDefault()
      hide()
      break
    case 'Tab':
      hide(false)
      break
    default:
      // Typeahead: jump to the next item starting with that character.
      if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
        const char = event.key.toLowerCase()
        const order = [...enabled.slice(position + 1), ...enabled.slice(0, position + 1)]
        focusItem(order.find((index) => props.items[index].label.toLowerCase().startsWith(char)))
      }
  }
}

function onDocumentPointerDown(event: PointerEvent) {
  if (root.value && !root.value.contains(event.target as Node)) hide(false)
}

watch(open, (isOpen) => {
  if (isOpen) document.addEventListener('pointerdown', onDocumentPointerDown)
  else document.removeEventListener('pointerdown', onDocumentPointerDown)
})

onBeforeUnmount(() => document.removeEventListener('pointerdown', onDocumentPointerDown))

const triggerProps = computed(() => ({
  'aria-haspopup': 'menu' as const,
  'aria-expanded': open.value,
  'aria-controls': open.value ? menuId : undefined,
  onClick: toggle,
  onKeydown: onTriggerKeydown,
}))

const selectedLabel = computed(() =>
  props.selectable ? props.items.find((item) => item.value === model.value)?.label : undefined,
)
</script>

<template>
  <div ref="root" :class="['ml-dropdown', { 'ml-dropdown--open': open }]">
    <slot name="trigger" :attrs="triggerProps" :open="open" :toggle="toggle">
      <MlButton v-bind="triggerProps" :variant="variant" :size="size" :disabled="disabled">
        {{ selectedLabel ?? label }}
        <template #suffix><MlIcon name="chevronDown" class="ml-dropdown__chevron" /></template>
      </MlButton>
    </slot>
    <Transition name="ml-dropdown">
      <ul
        v-if="open"
        :id="menuId"
        role="menu"
        :class="['ml-dropdown__menu', `ml-dropdown__menu--${placement}`]"
        :aria-label="label"
        @keydown="onMenuKeydown"
      >
        <template v-for="(item, index) in items" :key="item.value">
          <li v-if="item.divider" role="separator" class="ml-dropdown__divider" />
          <li
            :ref="(el) => (itemEls[index] = el as HTMLElement)"
            :role="selectable ? 'menuitemradio' : 'menuitem'"
            :aria-checked="selectable ? item.value === model : undefined"
            :aria-disabled="item.disabled || undefined"
            tabindex="-1"
            :class="[
              'ml-dropdown__item',
              {
                'ml-dropdown__item--danger': item.danger,
                'ml-dropdown__item--checked': selectable && item.value === model,
              },
            ]"
            @click="choose(item)"
            @mousemove="!item.disabled && ($event.currentTarget as HTMLElement).focus()"
          >
            <MlIcon v-if="item.icon" :name="item.icon" class="ml-dropdown__icon" />
            <span class="ml-dropdown__label">{{ item.label }}</span>
            <span v-if="item.hint" class="ml-dropdown__hint">{{ item.hint }}</span>
            <MlPaw v-if="selectable && item.value === model" tone="current" class="ml-dropdown__paw" />
          </li>
        </template>
      </ul>
    </Transition>
  </div>
</template>
