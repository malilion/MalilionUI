<script setup lang="ts">
import MlIcon from './MlIcon.vue'
import { safeHref } from '../url'

const props = defineProps<{
  title: string
  subtitle?: string
  /** Small text on the right, e.g. a time. */
  meta?: string
  /** Count bubble on the right. */
  badge?: number | string
  /** Makes the row a link. */
  href?: string
  /** Makes the row a button (emits "select"). */
  clickable?: boolean
  active?: boolean
  chevron?: boolean
}>()

const emit = defineEmits<{ select: [] }>()
const tag = props.href ? 'a' : props.clickable ? 'button' : 'div'
</script>

<template>
  <li class="ml-list-item">
    <component
      :is="tag"
      :href="safeHref(href)"
      :type="tag === 'button' ? 'button' : undefined"
      :aria-current="active ? 'page' : undefined"
      :class="['ml-list-item__row', { 'ml-list-item__row--interactive': tag !== 'div', 'ml-list-item__row--active': active }]"
      @click="tag === 'button' && emit('select')"
    >
      <span v-if="$slots.leading" class="ml-list-item__leading"><slot name="leading" /></span>
      <span class="ml-list-item__text">
        <span class="ml-list-item__title">{{ title }}</span>
        <span v-if="subtitle" class="ml-list-item__subtitle">{{ subtitle }}</span>
      </span>
      <span v-if="meta || badge !== undefined || $slots.trailing || chevron" class="ml-list-item__trailing">
        <span v-if="meta" class="ml-list-item__meta">{{ meta }}</span>
        <span v-if="badge !== undefined" class="ml-list-item__badge">{{ badge }}</span>
        <slot name="trailing" />
        <MlIcon v-if="chevron" name="chevronRight" class="ml-list-item__chevron" />
      </span>
    </component>
  </li>
</template>
