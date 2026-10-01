<script setup lang="ts">
import { ref } from 'vue'

const mood = ref('roar')
const theme = ref('dark')
</script>

<template>
  <div class="stack">
    <MlRadioGroup v-model="mood" label="今天的心情" direction="column">
      <MlRadio value="roar" hint="充滿幹勁">🦁 怒吼</MlRadio>
      <MlRadio value="purr" hint="慢慢來">😺 呼嚕</MlRadio>
      <MlRadio value="nap" hint="先睡一下">💤 打盹</MlRadio>
    </MlRadioGroup>

    <!-- 不放在群組裡時，用同一個 v-model 和 name -->
    <div class="row">
      <MlRadio v-model="theme" name="theme" value="dark" label="Night Pride" />
      <MlRadio v-model="theme" name="theme" value="light" label="Daylight" />
    </div>
  </div>
</template>

<style scoped>
.stack {
  display: grid;
  gap: 24px;
}

.row {
  display: flex;
  gap: 22px;
}
</style>
