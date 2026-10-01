<script setup lang="ts">
import { ref } from 'vue'

const tags = ref(['Design', 'Development', 'AI'])
</script>

<template>
  <MlTag>Gold</MlTag>
  <MlTag tone="tech">Tech</MlTag>
  <MlTag tone="bean">Bean</MlTag>
  <MlTag tone="success" variant="outline">Outline</MlTag>
  <MlTag tone="danger" variant="solid">Sale</MlTag>
  <MlTag v-for="tag in tags" :key="tag" tone="steel" closable @close="tags = tags.filter((t) => t !== tag)">
    {{ tag }}
  </MlTag>
</template>
