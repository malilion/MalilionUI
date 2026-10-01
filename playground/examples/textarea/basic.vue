<script setup lang="ts">
import { ref } from 'vue'

const bio = ref('')
</script>

<template>
  <MlTextarea
    v-model="bio"
    index="04"
    label="自我介紹"
    placeholder="說說你的狩獵技能…"
    :rows="4"
    :hint="`${bio.length} / 200 字`"
    maxlength="200"
    style="max-width: 520px"
  />
</template>
