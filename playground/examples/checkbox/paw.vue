<script setup lang="ts">
import { ref } from 'vue'

const snacks = ref(true)
const nap = ref(false)
</script>

<template>
  <MlCheckbox v-model="snacks" paw label="今天有吃點心" />
  <MlCheckbox v-model="nap" paw label="午睡時間" />
</template>
