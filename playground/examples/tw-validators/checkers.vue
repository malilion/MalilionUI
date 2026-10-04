<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  formatTwPhone,
  isKnownTwPostalCode,
  isTwBusinessId,
  isTwCitizenCert,
  isTwLandline,
  isTwMobile,
  isTwMobileBarcode,
  isTwNationalId,
  isTwPostalCode,
  isTwResidentId,
  parseTwPhone,
} from '@malilion/ui'

const value = ref('10458575')

// 純函式，不依賴 Vue / React：伺服器端、Node 腳本也能用。
const checks = computed(() => [
  { name: 'isTwNationalId', label: '身分證字號', ok: isTwNationalId(value.value) },
  { name: 'isTwResidentId', label: '居留證號（新、舊式）', ok: isTwResidentId(value.value) },
  { name: 'isTwBusinessId', label: '統一編號（新制 ÷5）', ok: isTwBusinessId(value.value) },
  { name: 'isTwBusinessId(v, { legacy: true })', label: '統一編號（舊制 ÷10）', ok: isTwBusinessId(value.value, { legacy: true }) },
  { name: 'isTwMobile', label: '手機', ok: isTwMobile(value.value) },
  { name: 'isTwLandline', label: '市話', ok: isTwLandline(value.value) },
  { name: 'isTwMobileBarcode', label: '手機條碼', ok: isTwMobileBarcode(value.value) },
  { name: 'isTwCitizenCert', label: '自然人憑證條碼', ok: isTwCitizenCert(value.value) },
  { name: 'isTwPostalCode', label: '郵遞區號格式', ok: isTwPostalCode(value.value) },
  { name: 'isKnownTwPostalCode', label: '郵遞區號存在', ok: isKnownTwPostalCode(value.value) },
])

const phone = computed(() => parseTwPhone(value.value))
const samples = ['A123456789', '04595252', '0912345678', '+886 2 2345 6789', '0836-22345', '/ABC+123', 'AB12345678901234', '106001']
</script>

<template>
  <div class="demo">
    <MlInput v-model="value" label="輸入任何號碼" placeholder="試試 04595252 或 0836-22345" autocomplete="off" />
    <div class="samples">
      <MlButton v-for="s in samples" :key="s" size="sm" variant="ghost" type="button" @click="value = s">{{ s }}</MlButton>
    </div>
    <ul class="list">
      <li v-for="c in checks" :key="c.name" :class="{ ok: c.ok }">
        <span class="mark" aria-hidden="true">{{ c.ok ? '✓' : '—' }}</span>
        <span>{{ c.label }}</span>
        <code>{{ c.name }}</code>
        <span class="sr-only">{{ c.ok ? '通過' : '不通過' }}</span>
      </li>
    </ul>
    <p v-if="phone" class="phone">
      {{ phone.type === 'mobile' ? '手機' : `區碼 ${phone.area}` }} → <strong>{{ formatTwPhone(value) }}</strong>
    </p>
  </div>
</template>

<style scoped>
.demo {
  display: grid;
  gap: 12px;
  max-width: 560px;
}

.samples {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.list {
  display: grid;
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: var(--ml-text-sm);
}

.list li {
  display: grid;
  grid-template-columns: 1em max-content minmax(0, 1fr);
  align-items: baseline;
  gap: 8px;
  color: var(--ml-text-muted);
}

.list li.ok {
  color: var(--ml-text);
}

.list code {
  overflow-wrap: anywhere;
  text-align: right;
  font-family: var(--ml-font-mono);
  font-size: var(--ml-text-xs);
  color: var(--ml-text-dim);
}

.mark {
  width: 1em;
  text-align: center;
}

.ok .mark {
  color: var(--ml-accent-text);
  font-weight: 700;
}

.phone {
  margin: 0;
  padding: 10px 14px;
  background: var(--ml-surface-inset);
  box-shadow: inset 0 0 0 1px var(--ml-line-steel);
  font-size: var(--ml-text-sm);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}
</style>
