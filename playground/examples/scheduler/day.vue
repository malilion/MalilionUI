<script setup lang="ts">
import { ref } from 'vue'
import type { MlSchedulerEvent } from '@malilion/ui'

const today = new Date()
const at = (h: number, m = 0) => new Date(today.getFullYear(), today.getMonth(), today.getDate(), h, m)

const view = ref<'week' | 'day'>('day')
const events: MlSchedulerEvent[] = [
  { id: 'a', title: '門診 · 王先生', start: at(9), end: at(9, 30), tone: 'tech' },
  { id: 'b', title: '門診 · 林小姐', start: at(9, 30), end: at(10), tone: 'tech' },
  { id: 'c', title: '手術', start: at(10, 30), end: at(13), tone: 'danger', location: '第 3 手術室' },
  { id: 'd', title: '巡房', start: at(14), end: at(15), tone: 'success' },
  { id: 'e', title: '病例討論', start: at(16), end: at(17), tone: 'gold' },
]
</script>

<template>
  <MlScheduler v-model:view="view" :events="events" :start-hour="8" :end-hour="19" :hour-height="56" :height="440" :week-starts-on="1" />
</template>
