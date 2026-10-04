<script setup lang="ts">
import { ref } from 'vue'
import type { MlTerminalLine } from '@malilion/ui'

const term = ref<{ play(): void; pause(): void; restart(): void; skip(): void }>()
const speed = ref<string | number>(1)

const lines: MlTerminalLine[] = [
  { type: 'input', text: 'npm test' },
  { type: 'output', text: '{green}{b} PASS {/}{/} tests/terminal.test.ts {dim}(24 tests){/}' },
  { type: 'output', text: '{red}{b} FAIL {/}{/} tests/roar.test.ts', delay: 260 },
  { type: 'output', text: '  ● 吼聲音量 › 應該要超過 120 分貝', tone: 'danger' },
  { type: 'output', text: '  {dim}expected{/} {green}120{/} {dim}received{/} {red}96{/}' },
  { type: 'comment', text: '# 重跑一次，這次大聲一點' },
  { type: 'input', text: 'npm test -- --volume=max' },
  { type: 'progress', text: '執行測試', duration: 1200 },
  { type: 'output', text: 'Tests: {green}25 passed{/}, 25 total', tone: 'success' },
  { type: 'output', text: '警告：鄰居已投訴', tone: 'warning' },
  { type: 'output', text: '<img src=x onerror=alert(1)> 會原樣顯示成文字', tone: 'dim' },
]
</script>

<template>
  <div class="stack">
    <MlTerminal ref="term" :lines="lines" :autoplay="false" :speed="Number(speed)" :max-height="240" title="malilion@den: ~/roar" />
    <div class="row">
      <MlButton size="sm" variant="tech" @click="term?.play()">播放</MlButton>
      <MlButton size="sm" variant="ghost" @click="term?.pause()">暫停</MlButton>
      <MlButton size="sm" variant="ghost" @click="term?.restart()">重來</MlButton>
      <MlButton size="sm" variant="ghost" @click="term?.skip()">跳到結尾</MlButton>
      <MlSegmented v-model="speed" size="sm" label="播放速度" :options="[{ label: '1×', value: 1 }, { label: '2×', value: 2 }, { label: '4×', value: 4 }]" />
    </div>
  </div>
</template>

<style scoped>
.stack {
  display: grid;
  gap: 12px;
}

.row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}
</style>
