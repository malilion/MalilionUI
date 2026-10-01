<script setup lang="ts">
import { ref } from 'vue'

const loading = ref(false)
const empty = ref(true)

const columns = [
  { key: 'title', title: '獵物' },
  { key: 'place', title: '地點' },
]
const rows = [
  { id: 1, title: '斑馬', place: '東邊草原' },
  { id: 2, title: '羚羊', place: '河岸' },
]
</script>

<template>
  <div class="stack">
    <div class="row">
      <MlSwitch v-model="empty" label="沒有資料" />
      <MlSwitch v-model="loading" tone="tech" label="載入中" />
    </div>
    <MlTable :columns="columns" :rows="empty ? [] : rows" :loading="loading" />
  </div>
</template>

<style scoped>
.stack {
  display: grid;
  gap: 16px;
}

.row {
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
}
</style>
