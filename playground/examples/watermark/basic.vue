<script setup lang="ts">
import { ref } from 'vue'

const text = ref('碼力獅 · 內部文件')
</script>

<template>
  <div class="box">
    <MlInput v-model="text" label="浮水印文字" size="sm" />
    <MlWatermark :content="[text, 'MALILION · 2026']">
      <MlCard eyebrow="Confidential" title="Q4 獅群作戰計畫">
        <p>1. 完成元件庫第三優先：圖片、輪播、評分、取色器、穿梭框、固定與回頂端。</p>
        <p>2. 把所有分支合併回 main。</p>
        <p>3. 午睡。</p>
      </MlCard>
    </MlWatermark>
  </div>
</template>

<style scoped>
.box {
  display: grid;
  gap: 14px;
  max-width: 520px;
}

p {
  margin: 0 0 8px;
}
</style>
