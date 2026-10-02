<script setup lang="ts">
import { computed } from 'vue'
import MlIcon from './MlIcon.vue'
import MlPaw from './MlPaw.vue'
import type { MlTabBarItem } from '../types'

const props = defineProps<{
  items: MlTabBarItem[]
  /** Raised paw button in the middle; emits "action". Give it a label. */
  actionLabel?: string
  label?: string
}>()

const emit = defineEmits<{ action: [] }>()
const model = defineModel<string>()

const half = computed(() => Math.ceil(props.items.length / 2))
const left = computed(() => (props.actionLabel ? props.items.slice(0, half.value) : props.items))
const right = computed(() => (props.actionLabel ? props.items.slice(half.value) : []))
</script>

<template>
  <nav class="ml-tabbar" :aria-label="label ?? '主要導覽'">
    <template v-for="group in [left, right]" :key="group === left ? 'l' : 'r'">
      <button
        v-for="item in group"
        :key="item.value"
        type="button"
        :class="['ml-tabbar__item', { 'ml-tabbar__item--active': model === item.value }]"
        :aria-current="model === item.value ? 'page' : undefined"
        @click="model = item.value"
      >
        <span class="ml-tabbar__icon">
          <MlIcon :name="item.icon" />
          <span v-if="item.badge !== undefined" class="ml-tabbar__badge">{{ item.badge }}</span>
        </span>
        <span class="ml-tabbar__label">{{ item.label }}</span>
      </button>
      <button
        v-if="actionLabel && group === left"
        type="button"
        class="ml-tabbar__action"
        :aria-label="actionLabel"
        @click="emit('action')"
      >
        <MlPaw tone="current" />
      </button>
    </template>
  </nav>
</template>
