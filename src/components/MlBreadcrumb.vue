<script setup lang="ts">
import MlIcon from './MlIcon.vue'
import type { MlBreadcrumbItem } from '../types'
import { useLocale } from '../locale'

const loc = useLocale()

defineProps<{
  items: MlBreadcrumbItem[]
  /** Accessible name for the trail. */
  label?: string
}>()
</script>

<template>
  <nav class="ml-breadcrumb" :aria-label="label ?? loc.nav.breadcrumb">
    <ol>
      <li v-for="(item, i) in items" :key="`${i}-${item.label}`" class="ml-breadcrumb__item">
        <a v-if="item.href && i < items.length - 1" :href="item.href" class="ml-breadcrumb__link">
          <MlIcon v-if="item.icon" :name="item.icon" />
          {{ item.label }}
        </a>
        <span
          v-else
          :class="['ml-breadcrumb__text', { 'ml-breadcrumb__text--current': i === items.length - 1 }]"
          :aria-current="i === items.length - 1 ? 'page' : undefined"
        >
          <MlIcon v-if="item.icon" :name="item.icon" />
          {{ item.label }}
        </span>
        <MlIcon v-if="i < items.length - 1" name="chevronRight" class="ml-breadcrumb__sep" />
      </li>
    </ol>
  </nav>
</template>
