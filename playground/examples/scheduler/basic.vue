<script setup lang="ts">
import { ref } from 'vue'
import { toast, type MlSchedulerEvent, type SchedulerRange } from '@malilion/ui'

/** A time in this week: day 0 = Sunday. */
function at(day: number, hour: number, minute = 0) {
  const d = new Date()
  d.setDate(d.getDate() - d.getDay() + day)
  d.setHours(hour, minute, 0, 0)
  return d
}
const dayOf = (day: number) => at(day, 0)

const events = ref<MlSchedulerEvent[]>([
  { id: 'standup', title: '晨會', start: at(1, 9), end: at(1, 9, 30), tone: 'tech', location: '會議室 A' },
  { id: 'review', title: '設計審查', start: at(1, 10), end: at(1, 12), tone: 'gold', location: '獅子廳' },
  { id: 'pair', title: '結對寫程式', start: at(1, 11), end: at(1, 13) , tone: 'bean' },
  { id: 'lunch', title: '午餐', start: at(2, 12), end: at(2, 13), tone: 'success' },
  { id: 'release', title: '發版 v0.14', start: at(3, 15), end: at(3, 17, 30), tone: 'danger', location: 'CI' },
  { id: 'gym', title: '健身', start: at(4, 19), end: at(4, 20, 30), tone: 'steel', editable: false },
  { id: 'night', title: '機房維護', start: at(5, 22), end: at(6, 2), tone: 'tech' },
  { id: 'trip', title: '台南出差', start: dayOf(3), end: dayOf(4), allDay: true, tone: 'bean' },
  { id: 'holiday', title: '連假', start: dayOf(5), end: dayOf(9), allDay: true, tone: 'success' },
])

function move(event: MlSchedulerEvent, range: SchedulerRange) {
  events.value = events.value.map((e) => (e.id === event.id ? { ...e, ...range } : e))
}

let n = 0
function add(range: SchedulerRange) {
  events.value = [...events.value, { id: `new-${++n}`, title: `新行程 ${n}`, ...range, tone: 'gold' }]
}
</script>

<template>
  <MlScheduler
    :events="events"
    editable
    :height="520"
    @change="move"
    @create="add"
    @event-click="(e) => toast.info(e.title)"
  />
</template>
