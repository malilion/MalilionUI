<script setup lang="ts">
import { ref } from 'vue'

const name = ref('')
const callsign = ref('MALI-LION')
</script>

<template>
  <div class="form">
    <MlInput v-model="name" index="01" label="名字" placeholder="輸入你的名字" hint="會顯示在獅群名單上" />
    <MlInput v-model="callsign" index="02" label="代號 Callsign" />
    <MlInput index="03" label="已停用" model-value="無法編輯" disabled />
  </div>
</template>

<style scoped>
.form {
  display: grid;
  gap: 18px;
  max-width: 420px;
}
</style>
