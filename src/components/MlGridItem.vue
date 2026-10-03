<script setup lang="ts">
defineProps<{
  /** Columns to span. */
  span?: number
  /** Start at this column (1-based). */
  offset?: number
  /** Rows to span. */
  rowSpan?: number
  tag?: string
}>()
</script>

<template>
  <component
    :is="tag ?? 'div'"
    class="ml-grid__item"
    :style="{
      gridColumn: span || offset ? `${offset ? offset : 'auto'} / span ${span ?? 1}` : undefined,
      gridRow: rowSpan ? `span ${rowSpan}` : undefined,
    }"
  >
    <slot />
  </component>
</template>
