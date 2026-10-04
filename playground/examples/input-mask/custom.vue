<script setup lang="ts">
import { ref } from 'vue'
import { toast } from '@malilion/ui'

const hex = { H: { pattern: /[0-9a-f]/i, upper: true } }
const color = ref('F0AD2F')
const plate = ref('')
const otp = ref('')
</script>

<template>
  <div class="grid">
    <MlInputMask v-model="color" mask="HHHHHH" :tokens="hex" label="自訂 token：色碼">
      <template #prefix><span class="swatch" :style="{ background: `#${color.padEnd(6, '0')}` }" />#</template>
    </MlInputMask>
    <MlInputMask v-model="plate" mask="AAA-9999" label="車牌（新式）" placeholder="ABC-1234" />
    <MlInputMask v-model="otp" mask="999 999" label="填滿觸發 complete" @complete="(raw) => toast.success(`驗證碼 ${raw}`)" />
  </div>
</template>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 20px;
}
.swatch {
  display: inline-block;
  width: 14px;
  height: 14px;
  margin-right: 6px;
  vertical-align: -2px;
  box-shadow: inset 0 0 0 1px rgb(255 255 255 / 0.3);
}
</style>
