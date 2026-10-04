<script setup lang="ts">
import audio from '../../media/demo-audio.m4a?url'
import { lionAvatarUrl } from '@malilion/ui'
</script>

<template>
  <div class="stack">
    <MlAudioPlayer :src="audio" title="獅吼合成器 No.1" artist="碼力獅樂團" />
    <MlAudioPlayer :src="audio" title="Podcast · 第 12 集" artist="前端獅子會" :cover="lionAvatarUrl" :skip="15" :playback-rates="[1, 1.25, 1.5, 2]" />
  </div>
</template>

<style scoped>
.stack {
  display: grid;
  gap: 16px;
  max-width: 560px;
}
</style>
