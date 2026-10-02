<script setup lang="ts">
import { computed } from 'vue'
import MlIcon from './MlIcon.vue'
import MlPaw from './MlPaw.vue'
import type { MlTimelineItem } from '../types'

const props = withDefaults(
  defineProps<{
    items: MlTimelineItem[]
    /** Newest first: flips the order the items are drawn in. */
    reverse?: boolean
    /** Adds a pulsing "in progress" node at the end, with this text. */
    pending?: string
    /** "left" stacks everything on one side; "alternate" zig-zags on wide screens. */
    mode?: 'left' | 'alternate'
  }>(),
  { mode: 'left' },
)

const ordered = computed(() =>
  props.items.map((item, index) => ({ item, index })).sort((a, b) => (props.reverse ? b.index - a.index : a.index - b.index)),
)
</script>

<template>
  <ol :class="['ml-timeline', `ml-timeline--${mode}`]">
    <li
      v-for="({ item, index }, i) in ordered"
      :key="index"
      :class="['ml-timeline__item', `ml-timeline__item--${item.tone ?? 'gold'}`]"
      :style="{ '--_i': i }"
    >
      <span class="ml-timeline__node" aria-hidden="true">
        <MlPaw v-if="item.paw" tone="current" class="ml-timeline__paw" />
        <MlIcon v-else-if="item.icon" :name="item.icon" class="ml-timeline__icon" />
        <span v-else class="ml-timeline__dot" />
      </span>
      <div class="ml-timeline__content">
        <time v-if="item.time" class="ml-timeline__time">{{ item.time }}</time>
        <p class="ml-timeline__title">{{ item.title }}</p>
        <div v-if="item.desc || $slots[`item-${index}`]" class="ml-timeline__desc">
          <slot :name="`item-${index}`" :item="item">{{ item.desc }}</slot>
        </div>
      </div>
    </li>
    <li v-if="pending" class="ml-timeline__item ml-timeline__item--pending" :style="{ '--_i': ordered.length }">
      <span class="ml-timeline__node" aria-hidden="true"><span class="ml-timeline__dot" /></span>
      <div class="ml-timeline__content">
        <p class="ml-timeline__title">{{ pending }}</p>
      </div>
    </li>
  </ol>
</template>
