<script setup lang="ts">
import { ref } from 'vue'

// 各縣市人口（萬人，取整的示範資料）
const population = {
  新北市: 404, 臺中市: 286, 高雄市: 272, 臺北市: 247, 桃園市: 233, 臺南市: 185,
  彰化縣: 122, 屏東縣: 79, 雲林縣: 66, 新竹縣: 59, 苗栗縣: 53, 嘉義縣: 48,
  南投縣: 47, 宜蘭縣: 45, 新竹市: 45, 基隆市: 36, 花蓮縣: 32, 嘉義市: 26,
  臺東縣: 21, 金門縣: 14, 澎湖縣: 11, 連江縣: 1.4,
}
const tone = ref<'gold' | 'tech'>('gold')
const picked = ref<string | null>('臺中市')
</script>

<template>
  <div style="display: grid; gap: 12px">
    <MlSegmented
      v-model="tone"
      size="sm"
      label="色調"
      :options="[
        { label: '金', value: 'gold' },
        { label: '青', value: 'tech' },
      ]"
    />
    <MlTaiwanMap
      v-model:selected="picked"
      :data="population"
      :tone="tone"
      :format="(v) => `${v.toLocaleString()} 萬人`"
      value-label="人口"
      :height="560"
    />
    <p style="margin: 0; color: var(--ml-text-muted)">選取：{{ picked ?? '（無）' }}</p>
  </div>
</template>
