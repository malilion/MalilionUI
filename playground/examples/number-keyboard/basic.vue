<script setup lang="ts">
import { ref } from 'vue'

const id = ref('A12345')
const amount = ref('')
</script>

<template>
  <div class="row">
    <div class="col">
      <p class="display">{{ id || '　' }}</p>
      <MlNumberKeyboard v-model="id" extra-key="X" :maxlength="10" title="身分證（含 X 鍵）" />
    </div>
    <div class="col">
      <p class="display">NT$ {{ amount || '0' }}</p>
      <MlNumberKeyboard v-model="amount" theme="custom" :extra-key="['00', '.']" close-text="付款" :maxlength="9" />
    </div>
  </div>
</template>

<style scoped>
.row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 24px;
}
.col {
  display: grid;
  gap: 10px;
  justify-items: center;
}
.display {
  width: 100%;
  max-width: 420px;
  margin: 0;
  padding: 10px 14px;
  background: var(--ml-surface-inset);
  font-family: var(--ml-font-mono);
  font-size: 1.25rem;
  letter-spacing: 0.08em;
  text-align: right;
}
</style>
