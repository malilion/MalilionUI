<script setup lang="ts">
import MlMascot from './MlMascot.vue'
import MlPaw from './MlPaw.vue'

withDefaults(
  defineProps<{
    title?: string
    description?: string
    /** "lion": the napping mascot. "paws": a trail of prints. */
    art?: 'lion' | 'paws' | 'none'
    size?: 'sm' | 'md'
  }>(),
  { title: '這裡還沒有東西', art: 'lion', size: 'md' },
)
</script>

<template>
  <div :class="['ml-empty', `ml-empty--${size}`]">
    <div v-if="art !== 'none'" class="ml-empty__art" aria-hidden="true">
      <slot name="art">
        <template v-if="art === 'lion'">
          <MlMascot pose="full" :size="size === 'sm' ? 84 : 120" title="" class="ml-empty__lion" />
          <span class="ml-empty__z"><i>z</i><i>z</i><i>z</i></span>
        </template>
        <span v-else class="ml-empty__paws">
          <MlPaw v-for="n in 4" :key="n" tone="current" />
        </span>
      </slot>
    </div>
    <p class="ml-empty__title">{{ title }}</p>
    <p v-if="description || $slots.description" class="ml-empty__desc">
      <slot name="description">{{ description }}</slot>
    </p>
    <div v-if="$slots.default" class="ml-empty__actions"><slot /></div>
  </div>
</template>
