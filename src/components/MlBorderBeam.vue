<script setup lang="ts">
withDefaults(
  defineProps<{
    tone?: 'gold' | 'tech' | 'bean' | 'danger'
    /** Seconds per lap. */
    duration?: number
    /** Beam thickness, px. */
    size?: number
    /** Run the beam the other way round. */
    reverse?: boolean
    /** Stop the beam (it stays as a static glint). */
    paused?: boolean
    tag?: string
  }>(),
  { tone: 'gold', duration: 4, size: 2, tag: 'div' },
)
</script>

<template>
  <component
    :is="tag"
    :class="[
      'ml-beam',
      `ml-beam--${tone}`,
      { 'ml-beam--reverse': reverse, 'ml-beam--paused': paused },
    ]"
    :style="{ '--_dur': `${duration}s`, '--_size': `${size}px` }"
  >
    <span class="ml-beam__ring" aria-hidden="true" />
    <slot />
  </component>
</template>
