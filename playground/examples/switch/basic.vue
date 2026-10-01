<script setup lang="ts">
import { ref } from 'vue'

const notify = ref(true)
</script>

<template>
  <MlSwitch v-model="notify" label="推播通知" />
  <MlSwitch :model-value="false" label="已停用" disabled />
</template>
