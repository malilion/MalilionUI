<script setup lang="ts">
import { ref } from 'vue'
import { useToast } from '@malilion/ui'

const toast = useToast()
const tab = ref('home')
const items = [
  { value: 'home', label: 'Home', icon: 'home' as const },
  { value: 'explore', label: 'Explore', icon: 'compass' as const },
  { value: 'inbox', label: 'Inbox', icon: 'message' as const, badge: 3 },
  { value: 'me', label: 'Me', icon: 'user' as const },
]
</script>

<template>
  <div class="screen">
    <p class="ml-hud-label">目前：{{ tab }}</p>
    <MlTabBar v-model="tab" :items="items" action-label="新增" @action="toast('嗷嗚～新增一個項目')" />
  </div>
</template>

<style scoped>
.screen {
  display: grid;
  align-content: end;
  gap: 40px;
  width: 360px;
  max-width: 100%;
  overflow: hidden;
  border-radius: 16px;
  background: var(--ml-bg);
  box-shadow: inset 0 0 0 1px var(--ml-line);
}

.screen .ml-hud-label {
  margin: 20px 0 0;
  text-align: center;
}
</style>
