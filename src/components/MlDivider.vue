<script setup lang="ts">
defineProps<{
  label?: string
  /** Three gold claw slashes in the middle. */
  claw?: boolean
}>()
</script>

<template>
  <div :class="['ml-divider', { 'ml-divider--plain': !label && !claw }]" role="separator">
    <span v-if="label">{{ label }}</span>
    <span v-else-if="claw" class="ml-divider__claw" aria-hidden="true"><i /><i /><i /></span>
  </div>
</template>
