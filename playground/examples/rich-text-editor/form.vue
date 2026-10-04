<script setup lang="ts">
import { reactive } from 'vue'
import { toast, type MlFormRules } from '@malilion/ui'
import { MlRichTextEditor } from '@malilion/ui/editor'

const model = reactive({ title: '', body: '' })
// The value is HTML, so count the text, not the tags.
const text = (html: string) => html.replace(/<[^>]*>/g, '').trim()
const rules: MlFormRules = {
  title: { required: true },
  body: [{ required: true, message: '請填寫內容' }, { validator: (v) => text(String(v)).length >= 10 || '內容至少 10 個字' }],
}

function onSubmit() {
  toast({ tone: 'success', title: '已發佈', message: model.title })
}
</script>

<template>
  <MlForm :model="model" :rules="rules" class="demo" @submit="onSubmit">
    <MlFormItem prop="title">
      <MlInput v-model="model.title" label="標題" placeholder="公告標題" />
    </MlFormItem>
    <MlFormItem prop="body">
      <MlRichTextEditor
        v-model="model.body"
        label="公告內容"
        hint="支援標題、清單與連結"
        placeholder="寫點什麼給獅群…"
        :max-length="500"
        :min-height="140"
      />
    </MlFormItem>
    <MlButton type="submit">發佈公告</MlButton>
  </MlForm>
</template>

<style scoped>
.demo {
  max-width: 640px;
  justify-items: start;
}

.demo > :not(button) {
  justify-self: stretch;
}
</style>
