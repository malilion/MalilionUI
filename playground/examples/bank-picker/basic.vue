<script setup lang="ts">
import { computed, ref } from 'vue'
import { getTwBank } from '@malilion/ui'

const code = ref<string | null>('822')
const bank = computed(() => (code.value ? getTwBank(code.value) : undefined))
</script>

<template>
  <div class="demo">
    <MlBankPicker v-model:value="code" label="銀行代碼" clearable />
    <dl v-if="bank" class="info">
      <dt>代碼</dt>
      <dd>{{ bank.code }}</dd>
      <dt>簡稱</dt>
      <dd>{{ bank.short }}</dd>
      <dt>英文</dt>
      <dd>{{ bank.en ?? '—' }}</dd>
    </dl>
    <p v-else class="info">試試輸入「中信」「國泰」「Cathay」「郵局」或「82」</p>
  </div>
</template>

<style scoped>
.demo {
  display: grid;
  gap: 14px;
  max-width: 420px;
}

.info {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 4px 14px;
  margin: 0;
  color: var(--ml-text-muted);
  font-size: var(--ml-text-sm);
}

.info dt {
  color: var(--ml-text-dim);
}

.info dd {
  margin: 0;
}
</style>
