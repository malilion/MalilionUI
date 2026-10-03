<script setup lang="ts">
import { Comment, Fragment, computed, useSlots, type VNode } from 'vue'

const props = withDefaults(
  defineProps<{
    direction?: 'horizontal' | 'vertical'
    /** Gap: a preset or any CSS length / px number. */
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number | string
    align?: 'start' | 'center' | 'end' | 'baseline' | 'stretch'
    justify?: 'start' | 'center' | 'end' | 'between' | 'around'
    /** Wrap onto new lines (horizontal only). */
    wrap?: boolean
    /** Draw a separator between children: a hairline or a tiny paw. */
    divider?: 'line' | 'paw'
    /** Stretch to the container width. */
    fill?: boolean
    tag?: string
  }>(),
  { direction: 'horizontal', size: 'md', wrap: true, tag: 'div' },
)

const slots = useSlots()
const presets = ['xs', 'sm', 'md', 'lg', 'xl']
const gap = computed(() =>
  typeof props.size === 'number' ? `${props.size}px` : presets.includes(props.size) ? undefined : props.size,
)

/** Real children only (fragments flattened, comments dropped), so dividers sit between them. */
function children(nodes: VNode[] = []): VNode[] {
  return nodes.flatMap((n) => (n.type === Fragment ? children(n.children as VNode[]) : n.type === Comment ? [] : [n]))
}
const items = computed(() => children(slots.default?.()))
</script>

<template>
  <component
    :is="tag"
    :class="[
      'ml-space',
      `ml-space--${direction}`,
      presets.includes(String(size)) && `ml-space--${size}`,
      align && `ml-space--align-${align}`,
      justify && `ml-space--justify-${justify}`,
      { 'ml-space--wrap': wrap && direction === 'horizontal', 'ml-space--fill': fill },
    ]"
    :style="gap ? { '--ml-space-gap': gap } : undefined"
  >
    <template v-if="divider">
      <template v-for="(node, i) in items" :key="i">
        <span v-if="i" :class="['ml-space__divider', `ml-space__divider--${divider}`]" aria-hidden="true" />
        <component :is="node" />
      </template>
    </template>
    <slot v-else />
  </component>
</template>
