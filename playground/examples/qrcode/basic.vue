<script setup lang="ts">
import { ref } from 'vue'

const text = ref('https://malilion.github.io/MalilionUI/')
const qr = ref<{ toDataURL: (scale?: number) => Promise<string> }>()

async function download() {
  const url = await qr.value?.toDataURL(3)
  if (!url) return
  const a = document.createElement('a')
  a.href = url
  a.download = 'malilion-qr.png'
  a.click()
}
</script>

<template>
  <div class="wrap">
    <div class="codes">
      <MlQRCode ref="qr" :value="text" logo="paw">掃我 · 腳印</MlQRCode>
      <MlQRCode :value="text" logo="lion" :size="160">獅子頭像</MlQRCode>
      <MlQRCode :value="text" shape="square" :size="140" level="L" color="#0a0c11" eye-color="#0a0c11">傳統方塊</MlQRCode>
    </div>
    <div class="controls">
      <MlInput v-model="text" label="內容" />
      <MlButton variant="outline" @click="download">下載 PNG</MlButton>
    </div>
  </div>
</template>

<style scoped>
.wrap {
  display: grid;
  gap: 20px;
  width: 100%;
}

.codes {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 28px;
}

.controls {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 12px;
}

.controls > :first-child {
  flex: 1 1 260px;
}
</style>
