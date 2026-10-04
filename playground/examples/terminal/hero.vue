<script setup lang="ts">
import type { MlTerminalLine } from '@malilion/ui'

const lines: MlTerminalLine[] = [
  { type: 'input', text: 'npx malilion roar' },
  { type: 'spinner', text: '{gold}獅群已集結{/}', pending: '喚醒獅群…', duration: 1000 },
  { type: 'output', text: '{b}Night Pride{/} 主題已套用 {dim}·{/} 元件全數就緒' },
  { type: 'output', text: '{pink}♥{/} 肉球已上蠟，可以開始寫 code 了', tone: 'dim' },
]
</script>

<template>
  <div class="hero">
    <MlTerminal :lines="lines" loop :loop-delay="2000" dots="paw" title="pride@savanna: ~" prompt="$" />
  </div>
</template>

<style scoped>
.hero {
  width: min(520px, 100%);
}
</style>
