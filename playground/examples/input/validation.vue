<script setup lang="ts">
import { computed, ref } from 'vue'

const email = ref('lion-at-malilion.dev')
const touched = ref(true)
const error = computed(() =>
  touched.value && email.value && !email.value.includes('@') ? '信箱格式不正確，少了 @' : '',
)
</script>

<template>
  <MlInput
    v-model="email"
    index="01"
    label="Email"
    type="email"
    required
    :error="error"
    hint="我們只會寄重要通知"
    style="max-width: 420px"
    @blur="touched = true"
  />
</template>
