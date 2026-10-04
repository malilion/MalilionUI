<script setup lang="ts">
import { ref } from 'vue'

const showLunar = ref(true)
const showSolarTerms = ref(true)
const showHolidays = ref(true)
</script>

<template>
  <div class="demo">
    <div class="toggles">
      <MlSwitch v-model="showLunar" label="農曆" />
      <MlSwitch v-model="showSolarTerms" label="節氣" />
      <MlSwitch v-model="showHolidays" label="假日" />
    </div>
    <MlLunarCalendar
      :show-lunar="showLunar"
      :show-solar-terms="showSolarTerms"
      :show-holidays="showHolidays"
      :today="new Date(2026, 5, 19)"
    />
  </div>
</template>

<style scoped>
.demo {
  display: grid;
  gap: 14px;
  justify-items: start;
}

.toggles {
  display: flex;
  flex-wrap: wrap;
  gap: 18px;
}
</style>
