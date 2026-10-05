<script setup lang="ts">
import { reactive } from 'vue'
import { timeRangeRules, toast, type MlFormRules, type MlTimeRange } from '@malilion/ui'

const model = reactive({ booking: [null, null] as MlTimeRange })
const rules: MlFormRules = {
  booking: timeRangeRules({ required: true, min: '08:00', max: '22:00' }),
}

function onSubmit() {
  toast({ tone: 'success', title: '已預約', message: model.booking.join(' – ') })
}
</script>

<template>
  <MlForm :model="model" :rules="rules" class="demo" @submit="onSubmit">
    <MlFormItem prop="booking">
      <MlTimeRangePicker v-model="model.booking" label="會議室預約" min="08:00" max="22:00" seconds :second-step="30" />
    </MlFormItem>
    <MlButton type="submit">送出</MlButton>
  </MlForm>
</template>

<style scoped>
.demo {
  display: grid;
  gap: 12px;
  justify-items: start;
  max-width: 380px;
  min-height: 420px;
  align-content: start;
}
</style>
