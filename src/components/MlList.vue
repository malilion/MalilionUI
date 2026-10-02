<script setup lang="ts">
withDefaults(
  defineProps<{
    /** "plain" full-bleed rows, "inset" a grouped card. */
    variant?: 'plain' | 'inset'
    /** Heading shown above the group. */
    title?: string
  }>(),
  { variant: 'plain' },
)
</script>

<template>
  <section :class="['ml-list', `ml-list--${variant}`]">
    <p v-if="title" class="ml-list__title">{{ title }}</p>
    <ul class="ml-list__items" role="list">
      <slot />
    </ul>
  </section>
</template>
