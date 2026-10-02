<script setup lang="ts">
import { lionAvatarUrl, lionFullUrl } from '@malilion/ui'
import { ref } from 'vue'

const index = ref(0)
const photos = [
  { src: lionFullUrl, alt: '碼力獅全身' },
  { src: lionAvatarUrl, alt: '碼力獅頭像' },
]
</script>

<template>
  <div class="box">
    <MlCarousel v-model:index="index" :items="photos" :loop="false" :height="260" label="碼力獅相簿">
      <template #default="{ item }">
        <img :src="item.src" :alt="item.alt" class="photo" />
      </template>
    </MlCarousel>
    <p class="ml-hud-label">index = {{ index }} · loop 關閉時到底就停住；可以左右滑動</p>
  </div>
</template>

<style scoped>
.box {
  display: grid;
  gap: 10px;
  max-width: 420px;
}

.photo {
  object-fit: contain !important;
  background: radial-gradient(circle at 50% 40%, rgb(240 173 47 / 0.18), transparent 70%);
}
</style>
