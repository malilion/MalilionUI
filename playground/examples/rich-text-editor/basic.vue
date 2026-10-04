<script setup lang="ts">
import { ref } from 'vue'
import { MlRichTextEditor } from '@malilion/ui/editor'

const html = ref(`<h2>碼力獅開發週報</h2>
<p>這週把 <strong>富文字編輯器</strong> 接上了 <a href="https://tiptap.dev">Tiptap</a>，支援 <em>斜體</em>、<u>底線</u>、<s>刪除線</s> 與 <code>行內程式碼</code>。</p>
<ul><li><p>選取文字後按 ⌘B / Ctrl+B 加粗</p></li><li><p>按 ⌘K / Ctrl+K 插入連結</p></li></ul>
<blockquote><p>小獅子說：寫文件也要像鬃毛一樣整齊。</p></blockquote>`)
</script>

<template>
  <div class="demo">
    <MlRichTextEditor v-model="html" index="01" label="週報內容" show-count :max-height="360" />
    <MlCodeBlock :code="html || '（空白）'" lang="html" filename="v-model" :max-height="180" collapsible />
  </div>
</template>

<style scoped>
.demo {
  display: grid;
  gap: 16px;
  width: 100%;
}
</style>
