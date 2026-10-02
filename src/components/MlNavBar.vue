<script setup lang="ts">
import MlIcon from './MlIcon.vue'

defineProps<{
  title?: string
  subtitle?: string
  /** Show a back button (emits "back"). */
  back?: boolean
  /** Big left-aligned title under the bar, iOS style. */
  large?: boolean
}>()

const emit = defineEmits<{ back: [] }>()
</script>

<template>
  <header :class="['ml-navbar', { 'ml-navbar--large': large }]">
    <div class="ml-navbar__bar">
      <div class="ml-navbar__side">
        <button v-if="back" type="button" class="ml-navbar__icon-btn" aria-label="返回" @click="emit('back')">
          <MlIcon name="chevronLeft" />
        </button>
        <slot name="left" />
      </div>
      <div v-if="!large" class="ml-navbar__center">
        <slot name="title">
          <span class="ml-navbar__title">{{ title }}</span>
          <span v-if="subtitle" class="ml-navbar__subtitle">{{ subtitle }}</span>
        </slot>
      </div>
      <div class="ml-navbar__side ml-navbar__side--end"><slot name="right" /></div>
    </div>
    <div v-if="large" class="ml-navbar__large">
      <slot name="title">
        <h2 class="ml-navbar__large-title">{{ title }}</h2>
        <p v-if="subtitle" class="ml-navbar__large-sub">{{ subtitle }}</p>
      </slot>
    </div>
  </header>
</template>
