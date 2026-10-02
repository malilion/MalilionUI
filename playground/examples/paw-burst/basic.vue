<script setup lang="ts">
import { pawBurst } from '@malilion/ui'

function celebrate() {
  // Fire from the middle of the screen, in every direction.
  pawBurst(window.innerWidth / 2, window.innerHeight / 2, { count: 40, spread: 360, power: 260 })
}
</script>

<template>
  <MlPawBurst>
    <MlButton stamp>按讚 👍</MlButton>
  </MlPawBurst>
  <MlPawBurst :tones="['bean']" :count="24" origin="pointer">
    <MlButton variant="outline">粉紅肉球（從游標噴出）</MlButton>
  </MlPawBurst>
  <MlButton variant="tech" @click="celebrate">pawBurst() 全畫面慶祝</MlButton>
</template>
