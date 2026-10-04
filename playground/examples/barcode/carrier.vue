<script setup lang="ts">
import { computed, ref } from 'vue'
import { isTwMobileBarcode, normalizeTwCarrier } from '@malilion/ui'

const input = ref('/ABC+123')
const carrier = computed(() => normalizeTwCarrier(input.value))
const valid = computed(() => isTwMobileBarcode(carrier.value))
</script>

<template>
  <div class="wrap">
    <div class="card">
      <MlText size="sm" tone="dim">手機條碼載具</MlText>
      <MlBarcode v-if="valid" :value="carrier" format="code39" :height="72" />
      <MlEmpty v-else size="sm" art="paws" title="請輸入正確的手機條碼" />
    </div>
    <MlInput
      v-model="input"
      label="手機條碼"
      hint="斜線開頭共 8 碼，例如 /ABC+123"
      :error="valid ? undefined : '格式應為 / 加 7 碼（0-9、A-Z、. - +）'"
    />
  </div>
</template>

<style scoped>
.wrap {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  align-items: start;
  gap: 24px;
  width: 100%;
}

.card {
  display: grid;
  justify-items: center;
  gap: 10px;
}
</style>
