<script setup lang="ts">
import { ref } from 'vue'
import { lionFullUrl, type MlCaptchaAttempt } from '@malilion/ui'

const status = ref('')

// Pretend server: checks the position and rejects drags that are too fast or too straight.
async function verify(a: MlCaptchaAttempt) {
  await new Promise((r) => setTimeout(r, 700))
  const human = a.duration > 250 && a.track.length > 3
  const ok = human && Math.abs(a.x - a.target.x) <= 5
  status.value = ok ? '伺服器：通過 ✓' : human ? '伺服器：位置不對' : '伺服器：看起來像機器人'
  return ok
}
</script>

<template>
  <div class="demo">
    <MlSliderCaptcha :src="lionFullUrl" tone="tech" :width="300" :height="170" :verify="verify" :max-attempts="3" />
    <span class="log">{{ status }}</span>
  </div>
</template>

<style scoped>
.demo { display: grid; gap: 10px; justify-items: start; }
.log { color: var(--ml-text-muted); font-size: 13px; }
</style>
