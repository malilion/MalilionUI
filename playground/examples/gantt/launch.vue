<script setup lang="ts">
import { ref } from 'vue'
import type { MlGanttTask } from '@malilion/ui'

// 碼力獅 App 2.0 上市計畫（示意排程）
const tasks = ref<MlGanttTask[]>([
  { id: 'kickoff', label: '專案啟動', start: '2026-09-28', end: '2026-09-28', milestone: true },
  { id: 'market', label: '市場調查', start: '2026-09-28', end: '2026-10-02', progress: 1, group: '規劃' },
  { id: 'interview', label: '使用者訪談', start: '2026-09-30', end: '2026-10-06', progress: 0.8, group: '規劃' },
  { id: 'spec', label: '規格定稿', start: '2026-10-07', end: '2026-10-09', progress: 0.3, group: '規劃', deps: ['market', 'interview'] },
  { id: 'visual', label: '視覺設計', start: '2026-10-12', end: '2026-10-21', group: '設計', tone: 'bean', deps: ['spec'] },
  { id: 'proto', label: '原型測試', start: '2026-10-19', end: '2026-10-23', group: '設計', tone: 'bean' },
  { id: 'backend', label: '後端 API', start: '2026-10-12', end: '2026-11-04', group: '開發', tone: 'tech', deps: ['spec'] },
  { id: 'frontend', label: '前端介面', start: '2026-10-22', end: '2026-11-06', group: '開發', tone: 'tech', deps: ['visual'] },
  { id: 'qa', label: '整合測試', start: '2026-11-09', end: '2026-11-13', group: '開發', tone: 'tech', deps: ['backend', 'frontend'] },
  { id: 'launch', label: '發表會', start: '2026-11-18', end: '2026-11-18', milestone: true, tone: 'danger', deps: ['qa'] },
])

const log = ref('拖曳長條或右側把手試試看')
const day = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`

function onChange(task: MlGanttTask, range: { start: Date; end: Date }) {
  tasks.value = tasks.value.map((t) => (t.id === task.id ? { ...t, start: range.start, end: range.end } : t))
  log.value = `${task.label}：${day(range.start)} – ${day(range.end)}`
}
</script>

<template>
  <div style="display: grid; gap: 12px">
    <MlGantt :tasks="tasks" editable @change="onChange" />
    <p style="margin: 0; color: var(--ml-text-muted)">{{ log }}</p>
  </div>
</template>
