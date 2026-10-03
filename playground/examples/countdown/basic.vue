<script setup lang="ts">
import { ref } from 'vue'
import { toast } from '@malilion/ui'

// Next New Year's Day.
const now = new Date()
const newYear = new Date(now.getFullYear() + 1, 0, 1)
const paused = ref(false)
const timer = ref<{ reset: () => void }>()
</script>

<template>
  <div class="stack">
    <div>
      <p class="ml-hud-label">距離 {{ newYear.getFullYear() }} 新年</p>
      <MlCountdown :to="newYear" />
    </div>
    <div class="row">
      <MlCountdown
        ref="timer"
        :duration="90_000"
        :units="['minutes', 'seconds']"
        :paused="paused"
        @finish="toast.success('時間到！')"
      />
      <MlButton size="sm" variant="outline" @click="paused = !paused">{{ paused ? '繼續' : '暫停' }}</MlButton>
      <MlButton size="sm" variant="ghost" @click="timer?.reset()">重來</MlButton>
    </div>
    <p class="text">
      限時優惠還剩
      <MlCountdown variant="text" :duration="3_600_000" :units="['hours', 'minutes', 'seconds']" />
    </p>
  </div>
</template>

<style scoped>
.stack {
  display: grid;
  gap: 24px;
}

.row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}

.text {
  margin: 0;
  color: var(--ml-text-muted);
}
</style>
