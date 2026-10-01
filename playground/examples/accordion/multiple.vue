<script setup lang="ts">
import { ref } from 'vue'

const open = ref<string[]>([])
const items = [
  { value: 'a', title: '可以同時展開多個', content: '加上 multiple，每個面板各自開關。' },
  { value: 'b', title: '鍵盤也能操作', content: 'Tab 移到標題，Enter 或 Space 展開。' },
  { value: 'c', title: '停用的項目', content: '', disabled: true },
]
</script>

<template>
  <MlAccordion v-model="open" :items="items" multiple style="max-width: 560px" />
</template>
