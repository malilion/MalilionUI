<script setup lang="ts">
import { ref } from 'vue'

// 重新縮排（2 → 4 格）加上一行真正的修改：勾選「忽略空白」後只剩那一行。
const lines = Array.from({ length: 40 }, (_, i) => `  const paw${i + 1} = stamp(${i + 1})`)
const before = ['export function stamps() {', ...lines, '  return [paw1, paw40]', '}'].join('\n')
const after = [
  'export function stamps() {',
  ...lines.map((l, i) => (i === 19 ? '    const paw20 = stamp(20, { tone: "gold" })' : `  ${l}`)),
  '    return [paw1, paw40]',
  '}',
].join('\n')

const ignoreWhitespace = ref(true)
const context = ref(3)
</script>

<template>
  <div class="demo">
    <div class="controls">
      <MlSwitch v-model="ignoreWhitespace" label="忽略空白差異" />
      <MlSegmented
        v-model="context"
        size="sm"
        label="前後保留行數"
        :options="[
          { label: '1 行', value: 1 },
          { label: '3 行', value: 3 },
          { label: '全部', value: -1 },
        ]"
      />
    </div>
    <MlCodeDiff :old-code="before" :new-code="after" filename="stamps.ts" :ignore-whitespace="ignoreWhitespace" :context="context" view="unified" />
  </div>
</template>

<style scoped>
.demo {
  display: grid;
  gap: 12px;
  width: 100%;
}
.controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16px;
}
</style>
