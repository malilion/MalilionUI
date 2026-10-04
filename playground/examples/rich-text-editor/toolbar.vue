<script setup lang="ts">
import { ref } from 'vue'
import type { Editor } from '@tiptap/core'
import { MlRichTextEditor, type MlEditorToolbarItem } from '@malilion/ui/editor'

const toolbar: MlEditorToolbarItem[] = ['bold', 'italic', 'strike', '|', 'bulletList', 'orderedList', '|', 'link', 'clear']
const html = ref('<p>留言區只需要簡單的格式。選取文字試試 <strong>粗體</strong> 與連結。</p>')
const readonly = ref(false)

function stamp(editor?: Editor) {
  editor?.chain().focus().insertContent(` 🦁 ${new Date().toLocaleDateString('zh-TW')} `).run()
}
</script>

<template>
  <div class="demo">
    <MlSwitch v-model="readonly" label="唯讀" />
    <MlRichTextEditor v-model="html" :toolbar="toolbar" :readonly="readonly" :min-height="96" placeholder="留言…">
      <template #toolbar-extra="{ editor, locked }">
        <button type="button" class="ml-editor__tool" aria-label="插入日期戳記" title="插入日期戳記" :aria-disabled="locked || undefined" @mousedown.prevent @click="!locked && stamp(editor)">
          <MlIcon name="calendar" />
        </button>
      </template>
    </MlRichTextEditor>
    <p class="note">在其他地方顯示存下來的 HTML：先消毒，再放進 <code>.ml-prose</code>，外觀就和編輯器裡一樣。</p>
  </div>
</template>

<style scoped>
.demo {
  display: grid;
  gap: 12px;
  width: 100%;
  max-width: 640px;
}

.note {
  margin: 0;
  color: var(--ml-text-muted);
  font-size: var(--ml-text-sm);
}
</style>
