<script setup lang="ts">
import { ref } from 'vue'
import type { MlTaiwanRegionValue } from '@malilion/ui'

const region = ref<MlTaiwanRegionValue | null>({ county: '臺北市', district: '中正區', zip: '100' })
const plain = ref<MlTaiwanRegionValue | null>(null)
</script>

<template>
  <div class="demo">
    <MlTaiwanRegion v-model="region" index="01" label="所在地區" clearable hint="先選縣市，再選鄉鎮市區；郵遞區號跟著帶出。" />
    <MlTaiwanRegion v-model="plain" index="02" label="不顯示郵遞區號" :zip="false" />
    <pre class="value">{{ region ?? 'null' }}</pre>
  </div>
</template>

<style scoped>
.demo {
  display: grid;
  gap: 20px;
  max-width: 520px;
}

.value {
  margin: 0;
  font-family: var(--ml-font-mono);
  font-size: var(--ml-text-xs);
  color: var(--ml-text-muted);
  white-space: pre-wrap;
}
</style>
