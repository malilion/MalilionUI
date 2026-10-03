<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    /** Fixed column count. Ignored when `minItemWidth` is set. */
    cols?: number
    /** Fit as many columns as possible, each at least this wide (e.g. "220px"). */
    minItemWidth?: string
    /** Gap: a preset or any CSS length / px number. */
    gap?: 'sm' | 'md' | 'lg' | number | string
    /** Stack into one column when the grid itself is narrower than 560px. */
    stack?: boolean
    tag?: string
  }>(),
  { cols: 12, gap: 'md', stack: true, tag: 'div' },
)

const presets: Record<string, string> = { sm: '10px', md: '16px', lg: '24px' }
const style = computed(() => ({
  '--ml-grid-cols': props.minItemWidth ? undefined : props.cols,
  '--ml-grid-min': props.minItemWidth,
  '--ml-grid-gap': typeof props.gap === 'number' ? `${props.gap}px` : presets[props.gap] ?? props.gap,
}))
</script>

<template>
  <!-- The wrapper is the size container, so the grid reacts to its own width, not the window's -->
  <div :class="['ml-grid-wrap', { 'ml-grid-wrap--stack': stack }]">
    <component :is="tag" :class="['ml-grid', { 'ml-grid--auto': minItemWidth }]" :style="style">
      <slot />
    </component>
  </div>
</template>
