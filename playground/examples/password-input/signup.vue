<script setup lang="ts">
import { ref } from 'vue'

const password = ref('')
</script>

<template>
  <MlPasswordInput
    v-model="password"
    label="設定新密碼"
    index="01"
    autocomplete="new-password"
    placeholder="至少 8 個字元"
    strength
    rules
    required
  />
</template>
