<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { mascotImages } from '../mascot'
import type { MlAvatarSize, MlAvatarStatus } from '../types'
import { useLocale } from '../locale'

const loc = useLocale()

const props = withDefaults(
  defineProps<{
    src?: string
    /** Used for alt text and for initials when there is no image. */
    name?: string
    size?: MlAvatarSize
    ring?: 'gold' | 'steel' | 'tech'
    status?: MlAvatarStatus
    /** Use the Malilion mascot as the picture. */
    lion?: boolean
  }>(),
  { size: 'md', ring: 'gold' },
)

const failed = ref(false)
const picture = computed(() => props.src ?? (props.lion ? mascotImages.avatar : undefined))
const altText = computed(() => props.name ?? (props.lion ? loc.value.mascot : ''))
watch(picture, () => (failed.value = false))

const CJK = /[\u3400-\u9fff\uf900-\ufaff]/

const initials = computed(() => {
  const name = props.name?.trim()
  if (!name) return '?'
  // Chinese / Japanese names: the first character reads best in a small badge.
  if (CJK.test(name)) return name.slice(0, 1)
  const words = name.split(/\s+/)
  if (words.length === 1) {
    // Counters ("+4") and acronyms ("AI") are already initials; names ("Leo") are not.
    const isToken = /^[^\p{L}]/u.test(name) || (name.length <= 3 && name === name.toUpperCase())
    return isToken ? name.slice(0, 3) : name[0]
  }
  return words
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
})

const statusLabel = computed<Record<MlAvatarStatus, string>>(() => loc.value.status)
</script>

<template>
  <span
    :class="['ml-avatar', `ml-avatar--${size}`, `ml-avatar--${ring}`]"
    :role="picture && !failed ? undefined : 'img'"
    :aria-label="picture && !failed ? undefined : name"
  >
    <span class="ml-avatar__face">
      <img v-if="picture && !failed" class="ml-avatar__img" :src="picture" :alt="altText" @error="failed = true" />
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
