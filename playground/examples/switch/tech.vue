<script setup lang="ts">
import { ref } from 'vue'

const turbo = ref(false)
const shield = ref(true)
</script>

<template>
  <MlSwitch v-model="turbo" tone="tech" label="Turbo 模式" show-state />
  <MlSwitch v-model="shield" label="防護罩" show-state />
</template>
