<script setup lang="ts">
import { ref } from 'vue'
import type { MlInboxItem } from '@malilion/ui'

// A fixed "now" so the 今天 / 昨天 / 更早 groups never shift.
const now = new Date('2026-10-04T18:00:00+08:00')
const at = (iso: string) => `${iso}+08:00`

const items = ref<MlInboxItem[]>([
  { id: 'a', type: 'mention', title: '小陳在 #設計 提到你', body: '@你 新的 Inbox 樣式可以先 review 嗎？', time: at('2026-10-04T17:52:00') },
  { id: 'b', type: 'info', title: '會議提醒', body: '19:00 週會，記得帶上 Q4 規劃。', time: at('2026-10-04T16:30:00') },
  { id: 'c', type: 'success', title: '訂單已出貨', body: '你訂的「碼力獅貼紙組」已由黑貓宅急便寄出。', time: at('2026-10-03T21:10:00'), read: true },
  { id: 'd', type: 'warning', title: '信用卡即將到期', body: '請在 10/31 前更新付款方式。', time: at('2026-10-03T09:00:00') },
  { id: 'e', type: 'danger', title: '登入異常', body: '偵測到來自新裝置的登入，若不是你本人請立即修改密碼。', time: at('2026-09-28T02:14:00') },
])
const log = ref<string[]>([])
const add = (line: string) => (log.value = [line, ...log.value].slice(0, 5))
</script>

<template>
  <div class="demo">
    <MlInbox
      v-model:items="items"
      inline
      :now="now"
      :width="380"
      :max-height="360"
      @read="(id) => add(`read(${id})`)"
      @read-all="add('read-all')"
      @dismiss="(id) => add(`dismiss(${id})`)"
      @select="(item) => add(`select(${item.id})`)"
    />
    <ul class="log">
      <li v-for="(line, i) in log" :key="i">{{ line }}</li>
      <li v-if="!log.length">↑↓ 移動、Enter 打開、Delete 移除</li>
    </ul>
  </div>
</template>

<style scoped>
.demo { display: flex; flex-wrap: wrap; gap: 20px; align-items: flex-start; width: 100%; }
.log { margin: 0; padding-left: 18px; color: var(--ml-text-muted); font-family: var(--ml-font-mono); font-size: 12px; line-height: 1.9; }
</style>
