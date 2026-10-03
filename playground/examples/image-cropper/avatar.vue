<script setup lang="ts">
import { computed, ref } from 'vue'
import { lionAvatarUrl, useToast } from '@malilion/ui'

type Cropper = { toDataURL: (type?: string, quality?: number, output?: { width?: number; height?: number; circle?: boolean }) => string }

const toast = useToast()
const files = ref<File[]>([])
const cropper = ref<Cropper>()
const avatar = ref<string>(lionAvatarUrl)
const source = computed(() => files.value[0] ?? lionAvatarUrl)

function apply() {
  // 256 × 256 PNG; the round look comes from MlAvatar, so the file stays square.
  const url = cropper.value?.toDataURL('image/png', undefined, { width: 256, height: 256 })
  if (!url) return toast.warning('這張圖片無法匯出（跨網域圖片需要 cross-origin）')
  avatar.value = url
  toast.success('頭像已更新')
}
</script>

<template>
  <div class="flow">
    <section class="step">
      <span class="ml-hud-label">01 · 選擇圖片</span>
      <MlUpload v-model="files" accept="image/*" :multiple="false" title="拖曳照片到這裡" hint="PNG、JPG、WebP；手機照片會自動轉正" />
    </section>
    <section class="step crop">
      <span class="ml-hud-label">02 · 裁切</span>
      <MlImageCropper ref="cropper" :src="source" shape="circle" :height="280" alt="要裁切的照片" />
    </section>
    <section class="step result">
      <span class="ml-hud-label">03 · 套用</span>
      <MlAvatar :src="avatar" name="我的頭像" size="xl" />
      <MlAvatar :src="avatar" name="我的頭像" size="md" status="online" />
      <MlButton @click="apply">套用為頭像</MlButton>
    </section>
  </div>
</template>

<style scoped>
.flow {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  width: 100%;
}

.step {
  display: grid;
  flex: 1 1 220px;
  align-content: start;
  gap: 10px;
  min-width: 0;
}

.crop {
  flex: 2 1 320px;
}

.result {
  justify-items: start;
}
</style>
