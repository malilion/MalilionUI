<script setup lang="ts">
import type { MlDescriptionItem } from '../types'

withDefaults(
  defineProps<{
    items: MlDescriptionItem[]
    title?: string
    /** Columns on wide screens; collapses to one on phones. */
    columns?: number
    /** plate: a bordered spec sheet. plain: label/value pairs with no frame. */
    variant?: 'plate' | 'plain'
    /** Labels beside values instead of above them. */
    horizontal?: boolean
  }>(),
  { columns: 3, variant: 'plate' },
)
</script>

<template>
  <section :class="['ml-desc', `ml-desc--${variant}`, { 'ml-desc--horizontal': horizontal }]">
    <header v-if="title || $slots.title || $slots.extra" class="ml-desc__head">
      <h3 class="ml-desc__title"><slot name="title">{{ title }}</slot></h3>
      <div v-if="$slots.extra" class="ml-desc__extra"><slot name="extra" /></div>
    </header>
    <dl class="ml-desc__grid" :style="{ '--_cols': columns }">
      <div
        v-for="(item, i) in items"
        :key="`${item.label}-${i}`"
        class="ml-desc__cell"
        :style="item.span ? { '--_span': Math.min(item.span, columns) } : undefined"
      >
        <dt class="ml-desc__label">{{ item.label }}</dt>
        <dd :class="['ml-desc__value', { 'ml-desc__value--mono': item.mono }]">
          <slot :name="`item-${i}`" :item="item">
            <slot name="value" :item="item" :index="i">{{ item.value ?? '—' }}</slot>
          </slot>
        </dd>
      </div>
    </dl>
  </section>
</template>
