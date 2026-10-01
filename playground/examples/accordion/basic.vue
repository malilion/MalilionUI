<script setup lang="ts">
import { ref } from 'vue'

const open = ref(['what'])
const items = [
  { value: 'what', title: 'What is Malilion UI?' },
  { value: 'install', title: 'Installation', content: 'npm install @malilion/ui，然後 app.use(MalilionUI)。' },
  { value: 'theme', title: 'Theming & Customization', content: '覆寫 --ml-* CSS 變數，或用 data-ml-theme 切換主題。' },
]
</script>

<template>
  <MlAccordion v-model="open" :items="items" style="max-width: 560px">
    <template #what>
      一個<strong>可愛又強大</strong>的元件庫，為下一代產品而生。獅子 × 科技 × 金屬，再加上肉球腳印。
    </template>
  </MlAccordion>
</template>
