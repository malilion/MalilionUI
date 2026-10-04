<script setup lang="ts">
const token = 'ml_live_9f3c2a7e41b8'
</script>

<template>
  <div class="row">
    <MlCopyButton value="npm i @malilion/ui" />
    <MlCopyButton value="npm i @malilion/ui" variant="button" />
    <MlCopyButton :value="token" variant="inline" />
    <span class="ml-hud-label">
      安裝指令
      <MlCopyButton value="npm i @malilion/ui" variant="inline" size="sm">npm i @malilion/ui</MlCopyButton>
    </span>
  </div>
</template>

<style scoped>
.row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16px;
}
</style>
