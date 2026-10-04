<script setup lang="ts">
import { ref } from 'vue'
import { parseInvoiceNumber, type MlInvoiceDraw } from '@malilion/ui'

const draws: MlInvoiceDraw[] = [
  { period: '115年 7–8月', special: '89996565', grand: '91098182', first: ['54348835', '44991397', '06595111'] },
]
// Numbers that came from somewhere else — a barcode scan, an e-invoice carrier list…
const scanned = ['AB-10000835', 'CD-89996565', 'EF-12345678']
const checker = ref<{ check: (n: string) => unknown }>()
const note = ref('')

function run(text: string) {
  const parsed = parseInvoiceNumber(text)
  note.value = parsed ? `字軌 ${parsed.track}、號碼 ${parsed.number}` : '格式不正確'
  if (parsed) checker.value?.check(parsed.number)
}
</script>

<template>
  <div class="demo">
    <div class="row">
      <MlButton v-for="s in scanned" :key="s" size="sm" variant="outline" @click="run(s)">{{ s }}</MlButton>
      <span class="note">{{ note }}</span>
    </div>
    <MlInvoiceChecker ref="checker" :draws="draws" :show-numbers="false" />
  </div>
</template>

<style scoped>
.demo {
  display: grid;
  gap: 12px;
}

.row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.note {
  color: var(--ml-text-muted);
  font-size: var(--ml-text-sm);
}
</style>
