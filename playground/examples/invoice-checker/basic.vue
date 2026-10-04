<script setup lang="ts">
import type { MlInvoiceDraw } from '@malilion/ui'

// 財政部稅務入口網公布的中獎號碼 (https://invoice.etax.nat.gov.tw/) — they change every two
// months, so fetch them from your own backend in a real app.
const draws: MlInvoiceDraw[] = [
  { period: '115年 7–8月', special: '89996565', grand: '91098182', first: ['54348835', '44991397', '06595111'] },
  { period: '115年 5–6月', special: '38548029', grand: '10138845', first: ['24121106', '28589937', '83663333'] },
]
</script>

<template>
  <MlInvoiceChecker :draws="draws" />
</template>
