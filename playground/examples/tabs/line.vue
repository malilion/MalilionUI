<script setup lang="ts">
import { ref } from 'vue'

const tab = ref('overview')
const items = [
  { value: 'overview', label: '總覽' },
  { value: 'pride', label: '獅群' },
  { value: 'logs', label: '日誌' },
  { value: 'locked', label: '鎖定', disabled: true },
]
</script>

<template>
  <MlTabs v-model="tab" :items="items" label="獅群資訊">
    <template #overview>本週共完成 37 個任務，獅群士氣高昂。</template>
    <template #pride>3 位成員在線，2 位正在午睡。</template>
    <template #logs>
      <pre class="log">[21:04] build ✓  12.4s
[21:05] test  ✓  148 passed
[21:06] deploy → production</pre>
    </template>
  </MlTabs>
</template>

<style scoped>
.log {
  margin: 0;
  color: var(--ml-tech-text);
  font-family: var(--ml-font-mono);
  font-size: 0.8125rem;
  line-height: 1.8;
}
</style>
