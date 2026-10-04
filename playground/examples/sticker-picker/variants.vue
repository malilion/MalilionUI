<script setup lang="ts">
import { ref } from 'vue'
import type { MlCuteIconVariant } from '@malilion/ui'

const variant = ref<MlCuteIconVariant>('metal')
const last = ref('')
</script>

<template>
  <div class="demo">
    <MlSegmented
      v-model="variant"
      size="sm"
      :options="[
        { value: 'color', label: '彩色' },
        { value: 'metal', label: '金屬' },
        { value: 'mono', label: '單色' },
        { value: 'line', label: '線稿' },
      ]"
    />
    <MlStickerPicker :variant="variant" :columns="5" :size="28" :recent="false" @select="(n) => (last = n)" />
    <span class="ml-hud-label">{{ last ? `選了：${last}` : '方向鍵移動、Enter 選取' }}</span>
  </div>
</template>

<style scoped>
.demo { display: grid; gap: 12px; justify-items: start; }
</style>
