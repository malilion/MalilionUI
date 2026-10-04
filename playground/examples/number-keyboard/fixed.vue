<script setup lang="ts">
import { ref } from 'vue'

const show = ref(false)
const phone = ref('')
</script>

<template>
  <div class="stack">
    <MlInputMask
      :model-value="phone"
      preset="mobile"
      label="手機號碼（點欄位叫出鍵盤）"
      readonly
      @click="show = true"
    />
    <MlNumberKeyboard v-model="phone" v-model:show="show" fixed :maxlength="10" title="安全鍵盤" />
  </div>
</template>

<style scoped>
.stack {
  max-width: 320px;
}
</style>
