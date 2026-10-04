<script setup lang="ts">
import { ref } from 'vue'

const text = ref('MALILION-2026')
const code = ref<{ toDataURL: (scale?: number) => Promise<string> }>()

async function download() {
  const url = await code.value?.toDataURL(3)
  if (!url) return
  const a = document.createElement('a')
  a.href = url
  a.download = 'malilion-barcode.png'
  a.click()
}
</script>

<template>
  <div class="wrap">
    <MlBarcode ref="code" :value="text">Code 128</MlBarcode>
    <div class="controls">
      <MlInput v-model="text" label="內容（英數與符號）" />
      <MlButton variant="outline" @click="download">下載 PNG</MlButton>
    </div>
  </div>
</template>

<style scoped>
.wrap {
  display: grid;
  justify-items: start;
  gap: 20px;
  width: 100%;
}

.controls {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 12px;
  width: 100%;
}

.controls > :first-child {
  flex: 1 1 260px;
}
</style>
