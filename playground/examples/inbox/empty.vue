<script setup lang="ts">
import { ref } from 'vue'
import type { MlInboxItem, MlInboxTab } from '@malilion/ui'

const items = ref<MlInboxItem[]>([
  { id: 1, type: 'info', title: '歡迎加入碼力獅！', body: '先到個人檔案設定頭像吧。', time: Date.now() - 3_600_000, read: true },
])
const tab = ref<MlInboxTab>('unread')
</script>

<template>
  <div class="demo">
    <MlInbox v-model:items="items" v-model:tab="tab" inline :width="340" title="通知中心" />
    <MlInbox :items="[]" inline :width="340" />
  </div>
</template>

<style scoped>
.demo { display: flex; flex-wrap: wrap; gap: 20px; align-items: flex-start; }
</style>
