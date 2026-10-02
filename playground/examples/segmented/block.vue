<script setup lang="ts">
import { ref } from 'vue'

const plan = ref('pro')
</script>

<template>
  <div class="box">
    <MlSegmented
      v-model="plan"
      block
      size="lg"
      label="方案"
      :options="[
        { value: 'cub', label: 'Cub' },
        { value: 'pro', label: 'Pro' },
        { value: 'pride', label: 'Pride' },
      ]"
    />
  </div>
</template>

<style scoped>
.box {
  max-width: 480px;
}
</style>
