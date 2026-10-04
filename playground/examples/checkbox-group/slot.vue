<script setup lang="ts">
import { ref } from 'vue'

const notify = ref<(string | number)[]>(['email', 'push'])
</script>

<template>
  <MlCheckboxGroup v-model="notify" label="通知方式" direction="column" :min="1" check-all="全部通知">
    <MlCheckbox value="email" label="電子郵件" hint="每日彙整一封" />
    <MlCheckbox value="push" label="推播通知" />
    <MlCheckbox value="sms">簡訊 <MlTag>付費</MlTag></MlCheckbox>
  </MlCheckboxGroup>
</template>
