<script setup lang="ts">
import { inject, nextTick, onBeforeUnmount } from 'vue'
import MlIcon from './MlIcon.vue'
import { menuKey } from './menu'
import type { MlMenuItem } from '../types'
import { safeHref } from '../url'

const props = defineProps<{
  items: MlMenuItem[]
  depth: number
}>()

const menu = inject(menuKey)!

const isActive = (item: MlMenuItem) => menu.active() === item.key
const inPath = (item: MlMenuItem) => menu.activePath().includes(item.key)
const hasChildren = (item: MlMenuItem) => !!item.children?.length && !item.group
/** Top-bar items drop their submenu down; everything else flies out sideways. */
const rootPopup = () => menu.horizontal() && props.depth === 0

// Pop-up submenus (horizontal bar, collapsed rail) open on hover with a small
// grace period so the pointer can travel diagonally into them.
const timers = new Map<string, ReturnType<typeof setTimeout>>()

function onEnter(item: MlMenuItem) {
  if (menu.inline() || !hasChildren(item) || item.disabled) return
  clearTimeout(timers.get(item.key))
  if (!menu.isOpen(item.key)) menu.toggle(item)
}

function onLeave(item: MlMenuItem) {
  if (menu.inline() || !hasChildren(item)) return
  timers.set(item.key, setTimeout(() => menu.close(item.key), 160))
}

onBeforeUnmount(() => timers.forEach(clearTimeout))

async function onHeaderKeydown(event: KeyboardEvent, item: MlMenuItem) {
  if (menu.inline()) return
  // Open a pop-up submenu from the keyboard and land on its first item.
  const opens = rootPopup() ? ['ArrowDown', 'Enter', ' '] : ['ArrowRight', 'Enter', ' ']
  if (!opens.includes(event.key)) return
  event.preventDefault()
  event.stopPropagation()
  // currentTarget is gone after the await, so grab the row first.
  const li = (event.currentTarget as HTMLElement).closest('li')
  if (!menu.isOpen(item.key)) menu.toggle(item)
  await nextTick()
  li?.querySelector<HTMLElement>(':scope > .ml-menu__popup .ml-menu__link:not([aria-disabled="true"])')?.focus()
}

function onPopupKeydown(event: KeyboardEvent, item: MlMenuItem) {
  if (event.key !== 'Escape' && (rootPopup() || event.key !== 'ArrowLeft')) return
  event.preventDefault()
  event.stopPropagation()
  menu.close(item.key)
  const li = (event.currentTarget as HTMLElement).closest('li')
  li?.querySelector<HTMLElement>(':scope > .ml-menu__link')?.focus()
}

function onClick(event: MouseEvent, item: MlMenuItem) {
  if (item.disabled) {
    event.preventDefault()
    return
  }
  if (hasChildren(item)) menu.toggle(item)
  else menu.select(item)
}
</script>

<template>
  <ul :class="['ml-menu__list', `ml-menu__list--depth-${depth}`]">
    <template v-for="item in items" :key="item.key">
      <li v-if="item.group" class="ml-menu__group">
        <p class="ml-menu__group-title">{{ item.label }}</p>
        <MlMenuList v-if="item.children" :items="item.children" :depth="depth" />
      </li>
      <li
        v-else
        :class="[
          'ml-menu__item',
          {
            'ml-menu__item--open': hasChildren(item) && menu.isOpen(item.key),
            'ml-menu__item--in-path': inPath(item),
          },
        ]"
        @mouseenter="onEnter(item)"
        @mouseleave="onLeave(item)"
      >
        <component
          :is="item.href && !hasChildren(item) ? 'a' : 'button'"
          :type="item.href && !hasChildren(item) ? undefined : 'button'"
          :href="item.disabled ? undefined : safeHref(item.href)"
          :class="[
            'ml-menu__link',
            {
              'ml-menu__link--active': isActive(item),
              'ml-menu__link--parent': hasChildren(item),
            },
          ]"
          :style="menu.inline() && depth ? { '--_depth': depth } : undefined"
          :aria-current="isActive(item) ? 'page' : undefined"
          :aria-expanded="hasChildren(item) ? menu.isOpen(item.key) : undefined"
          :aria-disabled="item.disabled || undefined"
          :title="!menu.inline() && depth === 0 ? item.label : undefined"
          @click="onClick($event, item)"
          @keydown="hasChildren(item) && onHeaderKeydown($event, item)"
        >
          <MlIcon v-if="item.icon" :name="item.icon" class="ml-menu__icon" />
          <span class="ml-menu__label">{{ item.label }}</span>
          <span v-if="item.badge !== undefined" class="ml-menu__badge">{{ item.badge }}</span>
          <MlIcon v-if="hasChildren(item)" name="chevronDown" class="ml-menu__chevron" />
        </component>

        <!-- Inline submenu: expands under its header with a height transition -->
        <div v-if="hasChildren(item) && menu.inline()" class="ml-menu__sub" :inert="!menu.isOpen(item.key) || undefined">
          <div class="ml-menu__sub-inner">
            <MlMenuList :items="item.children!" :depth="depth + 1" />
          </div>
        </div>
        <!-- Pop-up submenu: drops below a top-bar item, flies out beside anything else -->
        <Transition v-else-if="hasChildren(item)" name="ml-dropdown">
          <div
            v-if="menu.isOpen(item.key)"
            :class="['ml-menu__popup', rootPopup() ? 'ml-menu__popup--root' : 'ml-menu__popup--side']"
            @keydown="onPopupKeydown($event, item)"
          >
            <!-- On the icon rail the header text is hidden, so repeat it here -->
            <p v-if="!menu.horizontal() && depth === 0" class="ml-menu__popup-title">{{ item.label }}</p>
            <MlMenuList :items="item.children!" :depth="depth + 1" />
          </div>
        </Transition>
      </li>
    </template>
  </ul>
</template>
