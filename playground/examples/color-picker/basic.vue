<script setup lang="ts">
import { ref } from 'vue'

const brand = ref<string | null>('#f0ad2f')
const overlay = ref<string | null>('#3eeed080')
</script>

<template>
  <div class="form">
    <MlColorPicker v-model="brand" index="01" label="品牌主色" clearable />
    <MlColorPicker v-model="overlay" index="02" label="遮罩（含透明度）" alpha hint="alpha 開啟後值可能是 #rrggbbaa" />
    <div class="preview" :style="{ '--brand': brand ?? 'transparent', '--overlay': overlay ?? 'transparent' }">
      <span>預覽</span>
    </div>
  </div>
</template>

<style scoped>
.form {
  display: grid;
  gap: 16px;
  max-width: 320px;
}

.preview {
  display: grid;
  place-items: center;
  height: 64px;
  background: linear-gradient(var(--overlay), var(--overlay)), var(--brand);
  color: #fff;
  font-weight: 700;
  text-shadow: 0 1px 2px rgb(0 0 0 / 0.5);
}
</style>
