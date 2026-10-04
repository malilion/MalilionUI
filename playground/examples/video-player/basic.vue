<script setup lang="ts">
import video from '../../media/demo.mp4?url'
import zh from '../../media/demo.zh-TW.vtt?url'
import en from '../../media/demo.en.vtt?url'

const tracks = [
  { src: zh, srclang: 'zh-TW', label: '中文', default: true },
  { src: en, srclang: 'en', label: 'English' },
]
</script>

<template>
  <div class="wrap">
    <MlVideoPlayer :src="video" :tracks="tracks" title="碼力獅 · 曼德博碎形" />
  </div>
</template>

<style scoped>
.wrap {
  max-width: 720px;
}
</style>
