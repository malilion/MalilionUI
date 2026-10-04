<script setup lang="ts">
import { ref } from 'vue'

// 2000 行的檔案、散佈 80 處修改：差異演算法 (Myers) 加上摺疊，仍然即時。
const base = Array.from({ length: 2000 }, (_, i) => `export const lion${i} = { id: ${i}, roar: '${'吼'.repeat((i % 3) + 1)}' }`)
const changed = base.map((line, i) => (i % 25 === 7 ? line.replace(/id: (\d+)/, 'id: $1, gold: true') : line))
changed.splice(1200, 0, '// 新來的小獅子', "export const cub = { id: -1, roar: '喵' }")
const before = base.join('\n')
const after = changed.join('\n')
const at = ref('—')
</script>

<template>
  <div class="demo">
    <MlCodeDiff :old-code="before" :new-code="after" filename="pride.ts" :max-height="420" @navigate="(i, n) => (at = `${i + 1} / ${n}`)" />
    <p class="hint">在差異區按 <MlKbd>n</MlKbd> / <MlKbd>p</MlKbd> 跳到下一處、上一處變更。目前：{{ at }}</p>
  </div>
</template>

<style scoped>
.demo {
  display: grid;
  gap: 10px;
  width: 100%;
}
.hint {
  margin: 0;
  color: var(--ml-text-muted);
  font-size: var(--ml-text-sm);
}
</style>
