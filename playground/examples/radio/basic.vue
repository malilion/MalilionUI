<script setup lang="ts">
import { ref } from 'vue'

const size = ref('m')
const sizes = [
  { value: 's', label: '小獅子' },
  { value: 'm', label: '青年獅' },
  { value: 'l', label: '獅王' },
  { value: 'xl', label: '傳說', disabled: true },
]
</script>

<template>
  <MlRadioGroup v-model="size" label="體型" :options="sizes" />
  <p class="ml-hud-label">選擇：{{ size }}</p>
</template>
