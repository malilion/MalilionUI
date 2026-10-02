<script setup lang="ts">
import { ref } from 'vue'

const start = ref<Date | null>(null)
const deadline = ref<Date | null>(new Date())
const today = new Date()
</script>

<template>
  <div class="form">
    <MlDatePicker v-model="start" index="01" label="開始日期" clearable />
    <MlDatePicker
      v-model="deadline"
      index="02"
      label="截止日期"
      :min="today"
      hint="只能選今天以後"
      :format="{ dateStyle: 'long' }"
    />
  </div>
</template>

<style scoped>
.form {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 20px;
  max-width: 620px;
  min-height: 420px;
  align-content: start;
}
</style>
