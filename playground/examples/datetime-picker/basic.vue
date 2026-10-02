<script setup lang="ts">
import { ref } from 'vue'

const launch = ref<Date | null>(null)
const now = new Date()
const max = new Date(now.getFullYear(), now.getMonth() + 2, 0, 23, 59)
</script>

<template>
  <div class="form">
    <MlDateTimePicker
      v-model="launch"
      index="01"
      label="上線時間"
      :min="now"
      :max="max"
      :minute-step="5"
      clearable
      hint="只能選從現在起到下個月底。"
    />
    <p class="ml-hud-label">{{ launch ? launch.toISOString() : 'null' }}</p>
  </div>
</template>

<style scoped>
.form {
  display: grid;
  gap: 12px;
  max-width: 360px;
}
</style>
