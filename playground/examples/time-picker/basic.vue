<script setup lang="ts">
import { ref } from 'vue'

const start = ref<string | null>('09:30')
const alarm = ref<string | null>(null)
</script>

<template>
  <div class="form">
    <MlTimePicker v-model="start" index="01" label="開始時間" :minute-step="15" clearable hint="每 15 分鐘一格" />
    <MlTimePicker v-model="alarm" index="02" label="鬧鐘（含秒）" seconds placeholder="HH:mm:ss" />
    <p class="ml-hud-label">start = {{ start ?? 'null' }} · alarm = {{ alarm ?? 'null' }}</p>
  </div>
</template>

<style scoped>
.form {
  display: grid;
  gap: 18px;
  max-width: 320px;
}
</style>
