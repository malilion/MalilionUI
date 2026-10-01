<script setup lang="ts">
import { reactive } from 'vue'

const chips = reactive({ UI: true, React: false, Vue: true, Figma: false, AI: false })
</script>

<template>
  <MlTag v-for="(_, name) in chips" :key="name" v-model:selected="chips[name]" selectable>
    {{ name }}
  </MlTag>
</template>
