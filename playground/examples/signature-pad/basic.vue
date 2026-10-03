<script setup lang="ts">
import { ref } from 'vue'

const signature = ref<string | null>(null)
const disabled = ref(false)
const pad = ref<{ toSVG: () => string; undo: () => void; clear: () => void }>()

function save(href: string, name: string) {
  const a = document.createElement('a')
  a.href = href
  a.download = name
  a.click()
}

function downloadSvg() {
  const svg = pad.value?.toSVG()
  if (svg) save(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`, 'signature.svg')
}
</script>

<template>
  <div class="wrap">
    <MlSignaturePad ref="pad" v-model="signature" :disabled="disabled" paw />
    <div class="row">
      <MlSwitch v-model="disabled" label="停用" />
      <span class="spacer" />
      <MlButton variant="outline" size="sm" :disabled="!signature" @click="save(signature!, 'signature.png')">下載 PNG</MlButton>
      <MlButton variant="outline" size="sm" :disabled="!signature" @click="downloadSvg">下載 SVG</MlButton>
    </div>
    <p class="ml-hud-label">v-model：{{ signature ? `${signature.slice(0, 32)}…（${Math.round(signature.length / 1024)} KB）` : 'null' }}</p>
  </div>
</template>

<style scoped>
.wrap {
  display: grid;
  gap: 12px;
  width: 100%;
  max-width: 560px;
}

.row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.spacer {
  flex: 1;
}

p {
  margin: 0;
  overflow-wrap: anywhere;
}
</style>
