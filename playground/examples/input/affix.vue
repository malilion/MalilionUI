<script setup lang="ts">
import { ref } from 'vue'

const email = ref('')
const price = ref('1280')
</script>

<template>
  <div class="form">
    <MlInput v-model="email" label="Email" type="email" placeholder="lion@malilion.dev" autocomplete="email">
      <template #prefix>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 6h18v12H3zM3 6l9 7 9-7" />
        </svg>
      </template>
    </MlInput>
    <MlInput v-model="price" label="價格" inputmode="numeric">
      <template #prefix>NT$</template>
      <template #suffix>/ 月</template>
    </MlInput>
  </div>
</template>

<style scoped>
.form {
  display: grid;
  gap: 18px;
  max-width: 420px;
}
</style>
