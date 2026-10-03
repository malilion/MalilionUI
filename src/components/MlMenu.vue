<script setup lang="ts">
import { computed, provide, ref } from 'vue'
import MlMenuList from './MlMenuList.vue'
import { menuKey, type MenuContext } from './menu'
import { useOutsidePointer } from '../composables'
import type { MlMenuItem } from '../types'

const props = withDefaults(
  defineProps<{
    items: MlMenuItem[]
    /** vertical: a sidebar with inline submenus. horizontal: a top bar with drop-down submenus. */
    mode?: 'vertical' | 'horizontal'
    /** Vertical only: icon rail; submenus fly out to the side. */
    collapsed?: boolean
    /** Only one submenu open at a time (vertical). */
    accordion?: boolean
    /** Accessible name for the navigation landmark. */
    label?: string
  }>(),
  { mode: 'vertical', label: '主選單' },
)

const emit = defineEmits<{ select: [item: MlMenuItem] }>()
const model = defineModel<string>()
const openKeys = defineModel<string[]>('openKeys', { default: () => [] })

const root = ref<HTMLElement>()
const inline = computed(() => props.mode === 'vertical' && !props.collapsed)

/** Keys of every ancestor of `key`, outermost first. */
function pathTo(key: string, items = props.items, trail: string[] = []): string[] | null {
  for (const item of items) {
    if (item.key === key) return trail
    if (item.children) {
      const found = pathTo(key, item.children, item.group ? trail : [...trail, item.key])
      if (found) return found
    }
  }
  return null
}

const activePath = computed(() => (model.value ? pathTo(model.value) ?? [] : []))

const context: MenuContext = {
  active: () => model.value,
  activePath: () => activePath.value,
  inline: () => inline.value,
  horizontal: () => props.mode === 'horizontal',
  isOpen: (key) => openKeys.value.includes(key),
  toggle(item) {
    if (openKeys.value.includes(item.key)) {
      openKeys.value = openKeys.value.filter((k) => k !== item.key)
    } else if (props.accordion) {
      // Keep the parents of this submenu open, close its siblings.
      openKeys.value = [...(pathTo(item.key) ?? []), item.key]
    } else {
      openKeys.value = [...openKeys.value, item.key]
    }
  },
  close(key) {
    openKeys.value = openKeys.value.filter((k) => k !== key)
  },
  select(item) {
    if (item.disabled) return
    model.value = item.key
    emit('select', item)
    // Pop-up submenus close once something inside them is chosen.
    if (!inline.value) openKeys.value = []
  },
}
provide(menuKey, context)

// Clicking elsewhere folds away any pop-up submenu.
useOutsidePointer(root, () => !inline.value && openKeys.value.length > 0, () => (openKeys.value = []))

// Arrow keys move between the visible items; Home/End jump to the ends.
function onKeydown(event: KeyboardEvent) {
  const target = event.target as HTMLElement
  const popup = target.closest('.ml-menu__popup')
  // Inside a pop-up submenu up/down walk that submenu; otherwise follow the bar's direction.
  const horizontal = props.mode === 'horizontal' && !popup
  const fwd = horizontal ? 'ArrowRight' : 'ArrowDown'
  const back = horizontal ? 'ArrowLeft' : 'ArrowUp'
  if (![fwd, back, 'Home', 'End'].includes(event.key)) return
  const scope = (popup as HTMLElement | null) ?? root.value
  if (!scope) return
  const items = [...scope.querySelectorAll<HTMLElement>('.ml-menu__link:not([aria-disabled="true"])')].filter(
    (el) => el.offsetParent !== null && el.closest('.ml-menu__popup') === popup,
  )
  const index = items.indexOf(target)
  let to = -1
  if (event.key === fwd) to = (index + 1) % items.length
  else if (event.key === back) to = (index - 1 + items.length) % items.length
  else if (event.key === 'Home') to = 0
  else if (event.key === 'End') to = items.length - 1
  if (to === -1) return
  event.preventDefault()
  items[to]?.focus()
}
</script>

<template>
  <nav
    ref="root"
    :class="[
      'ml-menu',
      `ml-menu--${mode}`,
      { 'ml-menu--collapsed': mode === 'vertical' && collapsed },
    ]"
    :aria-label="label"
    @keydown="onKeydown"
  >
    <MlMenuList :items="items" :depth="0" />
  </nav>
</template>
