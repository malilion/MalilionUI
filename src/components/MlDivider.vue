<script setup lang="ts">
import MlPaw from './MlPaw.vue'

defineProps<{
  label?: string
  /** Three gold claw slashes in the middle. */
  claw?: boolean
  /** A short trail of paw prints in the middle. */
  paw?: boolean
}>()
</script>

<template>
  <div :class="['ml-divider', { 'ml-divider--plain': !label && !claw && !paw }]" role="separator">
    <span v-if="label">{{ label }}</span>
    <span v-else-if="paw" class="ml-divider__paws" aria-hidden="true">
      <MlPaw v-for="n in 3" :key="n" tone="current" />
    </span>
    <span v-else-if="claw" class="ml-divider__claw" aria-hidden="true"><i /><i /><i /></span>
  </div>
</template>
