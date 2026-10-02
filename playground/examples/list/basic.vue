<script setup lang="ts">
import { useToast } from '@malilion/ui'

const toast = useToast()
</script>

<template>
  <div class="screen">
    <MlList title="Today">
      <MlListItem title="Malilion Bot" subtitle="Your design is amazing!" meta="10:24" :badge="2" clickable @select="toast('打開對話')">
        <template #leading><MlAvatar lion size="sm" status="online" /></template>
      </MlListItem>
      <MlListItem title="Figma Team" subtitle="New comments on your file" meta="09:12" clickable>
        <template #leading><MlAvatar name="Figma Team" size="sm" ring="tech" /></template>
      </MlListItem>
    </MlList>
    <MlList title="Settings" variant="inset">
      <MlListItem title="通知" clickable chevron>
        <template #leading><MlIcon name="bell" /></template>
      </MlListItem>
      <MlListItem title="主題" clickable chevron>
        <template #leading><MlIcon name="settings" /></template>
        <template #trailing><MlBadge tone="steel">Dark</MlBadge></template>
      </MlListItem>
    </MlList>
  </div>
</template>

<style scoped>
.screen {
  display: grid;
  gap: 18px;
  width: 360px;
  max-width: 100%;
  padding: 16px 0;
  border-radius: 16px;
  background: var(--ml-bg);
  box-shadow: inset 0 0 0 1px var(--ml-line);
}
</style>
