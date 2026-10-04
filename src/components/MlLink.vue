<script setup lang="ts">
import { computed } from 'vue'
import { EXTERNAL_ICON, isExternal } from './typography'
import { safeHref } from '../url'
import { useLocale } from '../locale'

const loc = useLocale()

const props = withDefaults(
  defineProps<{
    href?: string
    target?: string
    rel?: string
    /** Open in a new tab with rel="noopener noreferrer", an arrow and a screen-reader note. */
    external?: boolean
    tone?: 'gold' | 'tech' | 'inherit'
    underline?: 'hover' | 'always' | 'none'
    /** Keeps the text but drops the href, so it can't be followed. */
    disabled?: boolean
  }>(),
  { tone: 'gold', underline: 'hover' },
)

const outside = computed(() => isExternal(props.external, props.target))
const relValue = computed(() => props.rel ?? (outside.value ? 'noopener noreferrer' : undefined))
</script>

<template>
  <a
    :class="['ml-link', `ml-link--${tone}`, `ml-link--underline-${underline}`, { 'ml-link--disabled': disabled }]"
    :href="disabled ? undefined : safeHref(href)"
    :target="disabled ? undefined : outside ? '_blank' : target"
    :rel="disabled ? undefined : relValue"
    :aria-disabled="disabled || undefined"
    :role="disabled ? 'link' : undefined"
  >
    <slot />
    <template v-if="outside">
      <svg class="ml-link__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path :d="EXTERNAL_ICON" />
      </svg>
      <span class="ml-visually-hidden">{{ loc.link.external }}</span>
    </template>
  </a>
</template>
