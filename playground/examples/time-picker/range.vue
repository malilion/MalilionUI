<script setup lang="ts">
import { ref } from 'vue'

const meeting = ref<string | null>(null)
</script>

<template>
  <div class="form">
    <MlTimePicker
      v-model="meeting"
      label="會議時間"
      min="09:30"
      max="18:00"
      :minute-step="10"
      hint="只能選 09:30 – 18:00；範圍外的時間會變暗。"
    />
  </div>
</template>

<style scoped>
.form {
  max-width: 320px;
}
</style>
