<script setup lang="ts">
import { ref } from 'vue'
import { toast, type MlSchedulerEvent, type MlSchedulerView, type SchedulerRange } from '@malilion/ui'

/** A day (and time) in this month. */
const today = new Date()
const on = (day: number, hour = 0, minute = 0) => new Date(today.getFullYear(), today.getMonth(), day, hour, minute)

const view = ref<MlSchedulerView>('month')
const events = ref<MlSchedulerEvent[]>([
  { id: 'standup', title: '晨會', start: on(6, 9, 30), end: on(6, 10), tone: 'tech' },
  { id: 'review', title: '設計審查', start: on(6, 14), end: on(6, 16), tone: 'gold', location: '獅子廳' },
  { id: 'dinner', title: '部門聚餐', start: on(6, 18, 30), end: on(6, 21), tone: 'success' },
  { id: 'visit', title: '客戶拜訪', start: on(6, 11), end: on(6, 12), tone: 'bean' },
  { id: 'trip', title: '台南出差', start: on(6), end: on(8), allDay: true, tone: 'bean' },
  { id: 'expo', title: '電腦展', start: on(10), end: on(15), allDay: true, tone: 'tech' },
  { id: 'release', title: '發版 v0.15', start: on(16, 15), end: on(16, 17), tone: 'danger' },
  { id: 'night', title: '機房維護', start: on(20, 22), end: on(21, 4), tone: 'steel' },
  { id: 'holiday', title: '連假', start: on(24), end: on(27), allDay: true, tone: 'success', editable: false },
])

function move(event: MlSchedulerEvent, range: SchedulerRange) {
  events.value = events.value.map((e) => (e.id === event.id ? { ...e, start: range.start, end: range.end } : e))
}

let n = 0
function add(range: SchedulerRange) {
  events.value = [...events.value, { id: `new-${++n}`, title: `新行程 ${n}`, start: range.start, end: range.end, allDay: range.allDay, tone: 'gold' }]
}
</script>

<template>
  <MlScheduler
    v-model:view="view"
    :events="events"
    editable
    :month-max-events="3"
    :height="640"
    @change="move"
    @create="add"
    @event-click="(e) => toast.info(e.title)"
  />
</template>
