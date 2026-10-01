<script setup lang="ts">
import { useId } from 'vue'
import MlIcon from './MlIcon.vue'
import MlPaw from './MlPaw.vue'
import type { MlAccordionItem } from '../types'

const props = defineProps<{
  items: MlAccordionItem[]
  /** Allow several panels open at once. */
  multiple?: boolean
}>()

/** Values of the open panels. */
const open = defineModel<string[]>({ default: () => [] })
const baseId = `ml-accordion-${useId()}`

function isOpen(value: string) {
  return open.value.includes(value)
}

function toggle(item: MlAccordionItem) {
  if (item.disabled) return
  if (isOpen(item.value)) open.value = open.value.filter((v) => v !== item.value)
  else open.value = props.multiple ? [...open.value, item.value] : [item.value]
}
</script>

<template>
  <div class="ml-accordion">
    <div
      v-for="item in items"
      :key="item.value"
      :class="['ml-accordion__item', { 'ml-accordion__item--open': isOpen(item.value) }]"
    >
      <h3 class="ml-accordion__heading">
        <button
          :id="`${baseId}-${item.value}-btn`"
          type="button"
          class="ml-accordion__trigger"
          :aria-expanded="isOpen(item.value)"
          :aria-controls="`${baseId}-${item.value}-panel`"
          :disabled="item.disabled"
          @click="toggle(item)"
        >
          <MlPaw tone="current" class="ml-accordion__paw" />
          <span class="ml-accordion__title">{{ item.title }}</span>
          <MlIcon name="chevronDown" class="ml-accordion__chevron" />
        </button>
      </h3>
      <div
        :id="`${baseId}-${item.value}-panel`"
        role="region"
        class="ml-accordion__panel"
        :aria-labelledby="`${baseId}-${item.value}-btn`"
        :inert="!isOpen(item.value)"
      >
        <div class="ml-accordion__clip">
          <div class="ml-accordion__content">
            <slot :name="item.value" :item="item">{{ item.content }}</slot>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
