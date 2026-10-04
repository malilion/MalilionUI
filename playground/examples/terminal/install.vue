<script setup lang="ts">
import type { MlTerminalLine } from '@malilion/ui'

const lines: MlTerminalLine[] = [
  { type: 'comment', text: '# 把碼力獅請進專案' },
  { type: 'input', text: 'npm i @malilion/ui' },
  { type: 'progress', text: '下載套件', duration: 1600 },
  { type: 'spinner', text: '已安裝 {b}@malilion/ui{/}', pending: '解析相依套件…', duration: 1100 },
  { type: 'output', text: 'added {gold}1{/} package in {green}1.8s{/}' },
  { type: 'blank' },
  { type: 'input', text: 'npm run dev' },
  { type: 'spinner', text: '開發伺服器啟動完成', pending: '啟動 Vite…', duration: 900 },
  { type: 'output', text: '  {green}➜{/}  Local:   {cyan}{u}http://localhost:5173/{/}{/}' },
  { type: 'output', text: '  {dim}➜  按 h + Enter 顯示說明{/}' },
]
</script>

<template>
  <MlTerminal :lines="lines" title="malilion@den: ~/my-app" copyable />
</template>
