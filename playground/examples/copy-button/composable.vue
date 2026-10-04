<script setup lang="ts">
import { useClipboard } from '@malilion/ui'

const { copy, copied, error } = useClipboard({ timeout: 2000 })
const invite = 'https://malilion.github.io/MalilionUI/?invite=pride'
</script>

<template>
  <div class="row">
    <MlInput :model-value="invite" readonly size="sm" class="grow" aria-label="邀請連結" />
    <MlButton :variant="copied ? 'tech' : 'primary'" size="sm" stamp @click="copy(invite)">
      {{ copied ? '連結已複製！' : '複製邀請連結' }}
    </MlButton>
  </div>
  <p v-if="error" class="ml-hud-label">複製失敗：{{ error.message }}</p>
</template>

<style scoped>
.row {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
}

.grow {
  flex: 1;
}
</style>
