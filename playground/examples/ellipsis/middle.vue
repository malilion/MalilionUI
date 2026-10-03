<script setup lang="ts">
import { ref } from 'vue'

const width = ref(260)
const files = [
  'malilion-ui-release-notes-2026-10-final-v3.pdf',
  'lion-mane-gold-texture@2x.png',
  'sha256:9f2c4e1ab7d03c55e8f6a91b2d4470c3e5f1a8b9d6c2e7f04a1b3c5d7e9f0a2b',
]
</script>

<template>
  <div class="demo">
    <MlSlider v-model="width" :min="120" :max="440" label="容器寬度" />
    <ul class="files" :style="{ width: `${width}px` }">
      <li v-for="f in files" :key="f">
        <MlIcon name="file" class="icon" />
        <MlEllipsis :text="f" position="middle" class="name" />
      </li>
    </ul>
  </div>
</template>

<style scoped>
.demo {
  display: grid;
  gap: 16px;
  width: 100%;
  max-width: 460px;
}

.files {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 10px 12px;
  list-style: none;
  border-radius: var(--ml-radius);
  background: var(--ml-surface-2);
  box-shadow: inset 0 0 0 1px var(--ml-line);
}

.files li {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  color: var(--ml-text-muted);
}

.icon {
  flex: none;
  width: 16px;
  height: 16px;
}

.name {
  flex: 1;
  color: var(--ml-text);
  font-family: var(--ml-font-mono);
  font-size: var(--ml-text-xs);
}
</style>
