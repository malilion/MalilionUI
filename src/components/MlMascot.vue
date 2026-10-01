<script setup lang="ts">
import { computed } from 'vue'
import { mascotImages } from '../mascot'

const props = withDefaults(
  defineProps<{
    /** Height in px. */
    size?: number
    /** "avatar": head and shoulders. "full": the whole lion. */
    pose?: 'avatar' | 'full'
    /** Metal frame around the avatar pose. */
    frame?: 'none' | 'ring' | 'hex'
    glow?: boolean
    /** Alt text. Pass an empty string when the lion is decoration. */
    title?: string
  }>(),
  { size: 96, pose: 'avatar', frame: 'none', title: '碼力獅' },
)

const src = computed(() => (props.pose === 'full' ? mascotImages.full : mascotImages.avatar))
</script>

<template>
  <span
    :class="[
      'ml-mascot',
      `ml-mascot--${pose}`,
      `ml-mascot--frame-${pose === 'full' ? 'none' : frame}`,
      { 'ml-mascot--glow': glow },
    ]"
    :style="{ '--_size': `${size}px` }"
  >
    <img class="ml-mascot__img" :src="src" :alt="title" draggable="false" decoding="async" />
  </span>
</template>
