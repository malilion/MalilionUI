<script setup lang="ts">
import { computed, ref } from 'vue'
import { lionFullUrl, type MlCropData } from '@malilion/ui'

const ratio = ref('free')
const ratios = [
  { value: 'free', label: '自由' },
  { value: '1', label: '1 : 1' },
  { value: '4/3', label: '4 : 3' },
  { value: '16/9', label: '16 : 9' },
]
const aspect = computed(() => {
  if (ratio.value === 'free') return undefined
  const [w, h = '1'] = ratio.value.split('/')
  return Number(w) / Number(h)
})
const crop = ref<MlCropData | null>(null)
</script>

<template>
  <div class="wrap">
    <MlSegmented v-model="ratio" :options="ratios" size="sm" />
    <MlImageCropper :src="lionFullUrl" :aspect-ratio="aspect" alt="碼力獅全身" @change="crop = $event">
      <template #preview="{ styles, src }">
        <span class="ml-hud-label">即時預覽</span>
        <div class="ml-cropper__preview" :style="styles(140).frame">
          <img :src="src" alt="" class="ml-cropper__preview-img" :style="styles(140).image" />
        </div>
        <div class="ml-cropper__preview" :style="styles(64).frame">
          <img :src="src" alt="" class="ml-cropper__preview-img" :style="styles(64).image" />
        </div>
      </template>
    </MlImageCropper>
    <code class="data">{{ crop ? JSON.stringify(crop) : '—' }}</code>
  </div>
</template>

<style scoped>
.wrap {
  display: grid;
  gap: 12px;
  width: 100%;
}

.data {
  color: var(--ml-text-muted);
  font-family: var(--ml-font-mono);
  font-size: var(--ml-text-xs);
  overflow-wrap: anywhere;
}
</style>
