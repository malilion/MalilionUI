<script setup lang="ts">
import { ref } from 'vue'

const open = ref(false)
const note =
  '版本 0.9 更新：新增文字省略、金屬捲軸與瀑布流三個元件。省略元件只有在文字真的被截斷時才會顯示提示與展開按鈕；視窗縮放、字型載入完成時都會重新量測，所以不會出現「明明放得下卻有省略號」的情況。螢幕閱讀器永遠讀得到完整內容。'
</script>

<template>
  <div class="demo">
    <MlEllipsis v-model:expanded="open" :text="note" :lines="3" expandable :tooltip="false" />
    <p class="state">expanded = {{ open }}</p>
  </div>
</template>

<style scoped>
.demo {
  width: 100%;
  max-width: 440px;
  padding: 14px 16px;
  border-radius: var(--ml-radius);
  background: var(--ml-surface-2);
  box-shadow: inset 0 0 0 1px var(--ml-line-steel);
  font-size: var(--ml-text-sm);
  line-height: 1.7;
}

.state {
  margin: 10px 0 0;
  color: var(--ml-text-dim);
  font-family: var(--ml-font-mono);
  font-size: var(--ml-text-xs);
}
</style>
