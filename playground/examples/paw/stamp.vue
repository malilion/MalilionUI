<script setup lang="ts">
import { pawStamp } from '@malilion/ui'

function stampCenter(event: MouseEvent) {
  const box = (event.currentTarget as HTMLElement).getBoundingClientRect()
  pawStamp(box.left + box.width / 2, box.top - 8, 'tech')
}
</script>

<template>
  <MlButton stamp>金色腳印</MlButton>
  <MlButton variant="outline" stamp="bean">粉紅肉球</MlButton>
  <MlButton variant="tech" stamp="tech">科技腳印</MlButton>

  <!-- 任何元素都能用 v-paw-stamp -->
  <div v-paw-stamp="'bean'" class="pad">在這裡隨便點點看</div>

  <!-- 或用 pawStamp() 在指定位置手動蓋章 -->
  <MlButton variant="steel" @click="stampCenter">從程式蓋章</MlButton>
</template>

<style scoped>
.pad {
  padding: 18px 28px;
  border: 1px dashed var(--ml-line-strong);
  color: var(--ml-text-muted);
  cursor: pointer;
  user-select: none;
}
</style>
