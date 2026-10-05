<script setup lang="ts">
import { computed, ref } from 'vue'

const query = ref('獅 ui')
const docs = [
  '碼力獅 Malilion UI：獅子 × 科技 × 金屬的元件庫',
  'MlTaiwanAddress 支援 3+3 郵遞區號與路段巷弄',
  '深色主題 Night Pride 與淺色主題 Daylight Titanium',
  '用 C++ 與 Rust 寫的獅子座星圖 🦁✨',
]
// 以空白分開的每個詞都會被標出來。
const words = computed(() => query.value.split(/\s+/))
</script>

<template>
  <div class="stack">
    <MlInput v-model="query" label="搜尋" placeholder="例如：獅 ui" />
    <ul class="results">
      <li v-for="doc in docs" :key="doc">
        <MlHighlight :text="doc" :keywords="words" />
      </li>
    </ul>
  </div>
</template>

<style scoped>
.stack {
  display: grid;
  gap: 14px;
  max-width: 520px;
}
.results {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
  color: var(--ml-text-dim);
  line-height: 1.7;
}
</style>
