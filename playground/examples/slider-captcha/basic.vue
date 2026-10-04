<script setup lang="ts">
import { ref } from 'vue'
import type { MlCaptchaAttempt } from '@malilion/ui'

const log = ref('')
const captcha = ref<{ reset: () => void; refresh: () => void }>()

function ok(a: MlCaptchaAttempt) {
  log.value = `通過！用時 ${(a.duration / 1000).toFixed(2)} 秒，軌跡 ${a.track.length} 點`
}
</script>

<template>
  <div class="demo">
    <MlSliderCaptcha ref="captcha" @success="ok" @fail="log = '差一點，再試一次'" @refresh="log = ''" />
    <div class="row">
      <MlButton size="sm" variant="outline" @click="captcha?.refresh()">換一張</MlButton>
      <span class="log">{{ log }}</span>
    </div>
  </div>
</template>

<style scoped>
.demo { display: grid; gap: 12px; }
.row { display: flex; gap: 12px; align-items: center; }
.log { color: var(--ml-text-muted); font-size: 13px; }
</style>
