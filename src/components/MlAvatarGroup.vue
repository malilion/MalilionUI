<script setup lang="ts">
import { computed } from 'vue'
import MlAvatar from './MlAvatar.vue'
import { hiddenNames, splitAvatars } from './avatar-group'
import { useLocale } from '../locale'
import type { MlAvatarGroupItem, MlAvatarRing, MlAvatarSize } from '../types'

const loc = useLocale()

const props = withDefaults(
  defineProps<{
    /** The people to show. Without items, the default slot's avatars are stacked as-is. */
    items?: MlAvatarGroupItem[]
    /** Most avatars to draw before the "+N" chip. */
    max?: number
    /** Real headcount when only some people are loaded (e.g. 128 members, 5 avatars). */
    total?: number
    size?: MlAvatarSize
    /** Ring for avatars that don't set their own. */
    ring?: MlAvatarRing
    /** How far the avatars overlap. */
    spacing?: 'tight' | 'normal' | 'loose'
    /** The "+N" chip becomes a button that reveals everyone passed in. */
    expandable?: boolean
    /** Accessible name of the group. Default "成員". */
    label?: string
  }>(),
  { items: () => [], size: 'md', ring: 'gold', spacing: 'normal' },
)

const expanded = defineModel<boolean>('expanded', { default: false })

const split = computed(() => splitAvatars(props.items, props.max, props.total, expanded.value))
const separator = computed(() => (loc.value.name.toLowerCase().startsWith('zh') ? '、' : ', '))
const tooltip = computed(() => hiddenNames(split.value, separator.value))
/** Expanding only helps when some of the hidden people were actually passed in. */
const canExpand = computed(() => props.expandable && split.value.hidden.length > 0)

function toggle() {
  expanded.value = !expanded.value
}
</script>

<template>
  <div
    role="group"
    :aria-label="label ?? loc.avatarGroup.label"
    :class="['ml-avatar-group', `ml-avatar-group--${spacing}`, { 'ml-avatar-group--expanded': expanded }]"
  >
    <template v-if="items.length">
      <MlAvatar
        v-for="(person, i) in split.shown"
        :key="i"
        :name="person.name"
        :src="person.src"
        :status="person.status"
        :lion="person.lion"
        :ring="person.ring ?? ring"
        :size="size"
        :title="person.name"
      />
      <button
        v-if="canExpand"
        type="button"
        :class="['ml-avatar', `ml-avatar--${size}`, 'ml-avatar--steel', 'ml-avatar-group__more']"
        :aria-expanded="expanded"
        :aria-label="loc.avatarGroup.showAll(split.hidden.length)"
        :title="tooltip || undefined"
        @click="toggle"
      >
        <span class="ml-avatar__face"><span class="ml-avatar__initials" aria-hidden="true">+{{ split.more }}</span></span>
      </button>
      <span
        v-else-if="split.more > 0"
        role="img"
        :class="['ml-avatar', `ml-avatar--${size}`, 'ml-avatar--steel', 'ml-avatar-group__more']"
        :aria-label="loc.avatarGroup.more(split.more)"
        :title="tooltip || undefined"
      >
        <span class="ml-avatar__face"><span class="ml-avatar__initials" aria-hidden="true">+{{ split.more }}</span></span>
      </span>
      <button
        v-if="expandable && expanded"
        type="button"
        :class="['ml-avatar', `ml-avatar--${size}`, 'ml-avatar--steel', 'ml-avatar-group__more', 'ml-avatar-group__less']"
        :aria-label="loc.avatarGroup.collapse"
        :title="loc.avatarGroup.collapse"
        @click="toggle"
      >
        <span class="ml-avatar__face"><span class="ml-avatar__initials" aria-hidden="true">−</span></span>
      </button>
    </template>
    <slot v-else />
  </div>
</template>
