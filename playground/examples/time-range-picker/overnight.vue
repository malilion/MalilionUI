<script setup lang="ts">
import { ref } from 'vue'
import type { MlTimeRange } from '@malilion/ui'

const shift = ref<MlTimeRange>(['22:00', '06:00'])
</script>

<template>
  <div class="form">
    <MlTimeRangePicker v-model="shift" label="夜班" allow-overnight :minute-step="15" clearable hint="結束早於開始時視為隔日" />
  </div>
</template>

<style scoped>
.form {
  max-width: 380px;
  min-height: 420px;
}
</style>
