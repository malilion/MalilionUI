<script setup lang="ts">
import { ref } from 'vue'
import video from '../../media/demo.mp4?url'

const player = ref<{ seek: (s: number) => void; play: () => void }>()
const log = ref<string[]>([])
const time = ref(0)
const note = (s: string) => (log.value = [s, ...log.value].slice(0, 4))
</script>

<template>
  <div class="row">
    <MlVideoPlayer
      ref="player"
      :src="video"
      aspect-ratio="4 / 3"
      :playback-rates="[1, 1.5, 2, 3]"
      muted
      loop
      @play="note('play')"
      @pause="note('pause')"
      @timeupdate="time = $event"
    />
    <div class="side">
      <MlButton size="sm" variant="ghost" @click="player?.seek(6); player?.play()">跳到 0:06 並播放</MlButton>
      <p class="mono">{{ time.toFixed(1) }} s</p>
      <p v-for="(l, i) in log" :key="i" class="mono dim">{{ l }}</p>
    </div>
  </div>
</template>

<style scoped>
.row {
  display: grid;
  grid-template-columns: minmax(0, 420px) 1fr;
  gap: 20px;
  align-items: start;
}
.side {
  display: grid;
  gap: 6px;
  justify-items: start;
}
.mono {
  margin: 0;
  font-family: var(--ml-font-mono);
  font-size: 0.8125rem;
}
.dim {
  color: var(--ml-text-dim);
}
@media (max-width: 640px) {
  .row {
    grid-template-columns: 1fr;
  }
}
</style>
