<script setup lang="ts">
import { ref } from 'vue'
import { lionAvatarUrl, type MlMentionOption } from '@malilion/ui'

const text = ref('這個 bug 交給 ')
const members: MlMentionOption[] = [
  { value: 'malilion', label: '碼力獅', avatar: lionAvatarUrl, hint: 'Alpha' },
  { value: 'nala', label: 'Nala', hint: 'Hunter' },
  { value: 'simba', label: 'Simba', hint: 'Hunter' },
  { value: 'kiara', label: 'Kiara', hint: 'Scout' },
  { value: 'timon', label: 'Timon', hint: '已離職', disabled: true },
]
const tags = [
  { value: 'bug', label: 'bug' },
  { value: 'urgent', label: 'urgent' },
  { value: 'design', label: 'design' },
]
</script>

<template>
  <div class="stack">
    <MlMention v-model="text" :options="members" label="留言" hint="輸入 @ 提及成員；↑↓ 選擇、Enter 或 Tab 插入" />
    <MlMention :options="tags" :triggers="['#']" label="標籤" :rows="2" />
  </div>
</template>

<style scoped>
.stack {
  display: grid;
  gap: 20px;
  width: 100%;
  max-width: 560px;
  min-height: 380px;
  align-content: start;
}
</style>
