<script setup lang="ts">
const vue = `<script setup lang="ts">
import { ref } from 'vue'

const roars = ref(0)
<\/script>

<template>
  <MlButton stamp @click="roars++">吼 × {{ roars }}</MlButton>
</template>`

const shell = `# 安裝
npm i @malilion/ui
# 開發
npm run dev`
</script>

<template>
  <div class="stack">
    <MlCodeBlock :code="vue" lang="vue" filename="Roar.vue" line-numbers :highlight="[4, 8]" />
    <MlCodeBlock :code="shell" lang="bash" filename="terminal" />
  </div>
</template>

<style scoped>
.stack {
  display: grid;
  gap: 16px;
  width: 100%;
}
</style>
