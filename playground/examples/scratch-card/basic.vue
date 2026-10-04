<script setup lang="ts">
import { ref } from 'vue'

const revealed = ref(false)
const progress = ref(0)
</script>

<template>
  <div class="demo">
    <MlScratchCard v-model:revealed="revealed" @progress="progress = $event">
      <div class="prize">
        <MlCuteIcon name="bubbleTea" :size="52" animate="bounce" />
        <strong>珍奶買一送一</strong>
        <small>兌換碼 LION-2026</small>
      </div>
    </MlScratchCard>
    <div class="row">
      <span class="log">{{ revealed ? '已刮開 🎉' : `已刮 ${Math.round(progress * 100)}%（刮超過一半自動揭曉）` }}</span>
      <MlButton v-if="revealed" size="sm" variant="outline" @click="revealed = false">再來一張</MlButton>
    </div>
  </div>
</template>

<style scoped>
.demo { display: grid; gap: 12px; }
.prize { display: grid; justify-items: center; gap: 4px; }
.prize strong { font-size: 20px; color: var(--ml-accent-text); }
.prize small { color: var(--ml-text-muted); font-family: var(--ml-font-mono); }
.row { display: flex; gap: 12px; align-items: center; }
.log { color: var(--ml-text-muted); font-size: 13px; }
</style>
