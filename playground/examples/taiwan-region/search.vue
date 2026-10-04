<script setup lang="ts">
import { ref } from 'vue'
import type { MlTaiwanRegionValue } from '@malilion/ui'

const region = ref<MlTaiwanRegionValue | null>(null)
const islands = ref<MlTaiwanRegionValue | null>(null)
</script>

<template>
  <div class="demo">
    <MlTaiwanRegion
      v-model="region"
      variant="search"
      index="01"
      label="快速搜尋"
      clearable
      hint="試試「板橋」「220」「Banqiao」「台中 北屯」或「新北板橋」，台／臺都找得到。"
    />
    <MlTaiwanRegion
      v-model="islands"
      variant="search"
      index="02"
      label="包含南海諸島與釣魚臺"
      include-islands
      hint="中華郵政另編有 290 釣魚臺、817 東沙群島、819 南沙群島，預設不列出。"
    />
    <p class="value">{{ region ? `${region.zip} ${region.county}${region.district}` : '尚未選擇' }}</p>
  </div>
</template>

<style scoped>
.demo {
  display: grid;
  gap: 20px;
  max-width: 420px;
}

.value {
  margin: 0;
  font-family: var(--ml-font-mono);
  font-size: var(--ml-text-sm);
  color: var(--ml-text-muted);
}
</style>
