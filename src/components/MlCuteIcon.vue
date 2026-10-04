<script setup lang="ts">
import { computed } from 'vue'
import { cuteIcons, type CuteIconName, type MlCuteIconAnimation, type MlCuteIconVariant } from './cute-icons'

const props = withDefaults(
  defineProps<{
    name: CuteIconName
    /** px number or any CSS length. Defaults to 1em so it sits in text. */
    size?: number | string
    /** `color` stickers · `mono` tinted by the text colour · `line` outlines only. */
    variant?: MlCuteIconVariant
    /** A looping animation (still when the user prefers reduced motion). */
    animate?: MlCuteIconAnimation
    /** Only animate while hovered (or while its link / button is hovered or focused). */
    hover?: boolean
    /** Accessible name. Without it the icon is decoration. */
    title?: string
  }>(),
  { variant: 'color', hover: false },
)

const length = computed(() => (props.size === undefined ? undefined : typeof props.size === 'number' ? `${props.size}px` : props.size))
</script>

<template>
  <svg
    :class="['ml-cute', `ml-cute--${variant}`, animate && `ml-cute--${animate}`, { 'ml-cute--hover': animate && hover }]"
    :style="length ? { '--_cute': length } : undefined"
    viewBox="0 0 32 32"
    :role="title ? 'img' : undefined"
    :aria-label="title"
    :aria-hidden="title ? undefined : 'true'"
    focusable="false"
  >
    <path
      v-for="(layer, i) in cuteIcons[name]"
      :key="i"
      :class="['ml-cute__layer', `ml-cute__layer--${layer.kind}`, `ml-cute__layer--${layer.color}`]"
      :d="layer.d"
    />
  </svg>
</template>
