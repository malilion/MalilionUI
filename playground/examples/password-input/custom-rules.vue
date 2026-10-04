<script setup lang="ts">
import { ref } from 'vue'
import { scorePassword } from '@malilion/ui'

const pin = ref('')
const visible = ref(true)
</script>

<template>
  <MlPasswordInput
    v-model="pin"
    v-model:visible="visible"
    label="Wi-Fi 密碼"
    autocomplete="off"
    :rules="{ minLength: 12, digit: true }"
    strength
  />
  <p class="ml-hud-label">scorePassword() = {{ scorePassword(pin) }} ／ {{ visible ? '顯示中' : '已隱藏' }}</p>
</template>
