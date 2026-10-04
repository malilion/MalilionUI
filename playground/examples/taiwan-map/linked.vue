<script setup lang="ts">
import { ref } from 'vue'
import { getTaiwanDistricts, type MlTaiwanRegionValue } from '@malilion/ui'

const region = ref<MlTaiwanRegionValue | null>({ county: '花蓮縣', district: '花蓮市', zip: '970' })
const county = ref<string | null>('花蓮縣')

// 地圖 → 下拉：換縣市時先帶入第一個鄉鎮市區
function onMap(name: string | string[] | null) {
  const next = typeof name === 'string' ? name : null
  county.value = next
  if (!next) region.value = null
  else if (region.value?.county !== next) {
    const d = getTaiwanDistricts(next)[0]
    region.value = d ? { county: d.county, district: d.name, zip: d.zip } : null
  }
}
// 下拉 → 地圖
function onRegion(value: MlTaiwanRegionValue | null) {
  region.value = value
  if (value) county.value = value.county
}
</script>

<template>
  <div style="display: flex; flex-wrap: wrap; gap: 24px; align-items: flex-start">
    <MlTaiwanMap :selected="county" :height="420" :legend="false" labels @update:selected="onMap" />
    <div style="display: grid; gap: 12px; flex: 1 1 260px">
      <MlTaiwanRegion :model-value="region" label="通訊地區" @update:model-value="onRegion" />
      <p style="margin: 0; color: var(--ml-text-muted)">
        {{ region ? `${region.zip} ${region.county}${region.district}` : '點地圖上的縣市，或從下拉選單挑選' }}
      </p>
    </div>
  </div>
</template>
