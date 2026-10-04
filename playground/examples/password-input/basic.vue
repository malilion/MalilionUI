<script setup lang="ts">
import { ref } from 'vue'

const password = ref('')
</script>

<template>
  <MlPasswordInput v-model="password" label="密碼" placeholder="輸入登入密碼" hint="按眼睛圖示可顯示密碼；大寫鎖定開啟時會提醒你。" />
</template>
