<script setup lang="ts">
const placements = ['top', 'bottom', 'left', 'right'] as const
</script>

<template>
  <MlPopover v-for="p in placements" :key="p" :placement="p">
    <MlButton variant="steel" size="sm">{{ p }}</MlButton>
    <template #content>金色邊永遠朝向觸發元素。</template>
  </MlPopover>
</template>
