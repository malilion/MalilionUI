<script setup lang="ts">
import { computed, ref } from 'vue'
import { en, formatTaiwanAddress, zhTW, type MlTaiwanRegionValue } from '@malilion/ui'

const lang = ref<'zh' | 'en'>('en')
const locale = computed(() => (lang.value === 'en' ? en : zhTW))
const region = ref<MlTaiwanRegionValue | null>({ county: '新竹市', district: '東區', zip: '300' })
const line = computed(() =>
  region.value ? formatTaiwanAddress(region.value, { lang: lang.value, address: lang.value === 'en' ? 'No. 1, Daxue Rd.' : '大學路 1 號' }) : '',
)
</script>

<template>
  <div class="demo">
    <MlSegmented v-model="lang" :options="[{ value: 'zh', label: '繁體中文' }, { value: 'en', label: 'English' }]" />
    <MlConfigProvider :locale="locale">
      <div class="grid">
        <MlTaiwanRegion v-model="region" label="Region" clearable />
        <MlTaiwanRegion v-model="region" variant="search" label="Search" />
      </div>
    </MlConfigProvider>
    <p class="value">{{ line }}</p>
  </div>
</template>

<style scoped>
.demo {
  display: grid;
  gap: 20px;
  width: 100%;
  min-height: 360px;
  align-content: start;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 16px;
  align-items: start;
}

.value {
  margin: 0;
  font-family: var(--ml-font-mono);
  font-size: var(--ml-text-sm);
  color: var(--ml-text-muted);
}
</style>
