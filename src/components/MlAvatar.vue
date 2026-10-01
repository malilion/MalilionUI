<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { MlAvatarSize, MlAvatarStatus } from '../types'

const props = withDefaults(
  defineProps<{
    src?: string
    /** Used for alt text and for initials when there is no image. */
    name?: string
    size?: MlAvatarSize
    ring?: 'gold' | 'steel' | 'tech'
    status?: MlAvatarStatus
  }>(),
  { size: 'md', ring: 'gold' },
)

const failed = ref(false)
watch(() => props.src, () => (failed.value = false))

const CJK = /[\u3400-\u9fff\uf900-\ufaff]/

const initials = computed(() => {
  const name = props.name?.trim()
  if (!name) return '?'
  // Chinese / Japanese names: the first character reads best in a small badge.
  if (CJK.test(name)) return name.slice(0, 1)
  const words = name.split(/\s+/)
  // Short tokens like "+4" or "AI" are already initials.
  if (words.length === 1 && name.length <= 3) return name
  return words
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
})

const statusLabel: Record<MlAvatarStatus, string> = {
  online: '在線',
  busy: '忙碌',
  away: '離開',
  offline: '離線',
}
</script>

<template>
  <span
    :class="['ml-avatar', `ml-avatar--${size}`, `ml-avatar--${ring}`]"
    :role="src && !failed ? undefined : 'img'"
    :aria-label="src && !failed ? undefined : name"
  >
    <span class="ml-avatar__face">
      <img v-if="src && !failed" class="ml-avatar__img" :src="src" :alt="name ?? ''" @error="failed = true" />
      <span v-else class="ml-avatar__initials" aria-hidden="true">{{ initials }}</span>
    </span>
    <span
      v-if="status"
      :class="['ml-avatar__status', `ml-avatar__status--${status}`]"
      :title="statusLabel[status]"
    >
      <span class="ml-visually-hidden">{{ statusLabel[status] }}</span>
    </span>
  </span>
</template>
