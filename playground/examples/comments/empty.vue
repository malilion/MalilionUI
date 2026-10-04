<script setup lang="ts">
import { ref } from 'vue'
import type { MlComment } from '@malilion/ui'

const comments = ref<MlComment[]>([])
const archived: MlComment[] = [
  { id: 1, author: { name: '版主' }, content: '本討論已封存，感謝大家參與！', time: '2026-10-01T09:30:00+08:00', likes: 21 },
]
</script>

<template>
  <div class="demo">
    <MlComments v-model:comments="comments" :current-user="{ name: '你' }" :max-length="200" placeholder="寫下第一則留言（最多 200 字）" />
    <MlComments :comments="archived" readonly title="已封存的討論" now="2026-10-04T15:00:00+08:00" />
  </div>
</template>

<style scoped>
.demo { display: grid; gap: 28px; width: 100%; max-width: 640px; }
</style>
