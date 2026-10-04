<script setup lang="ts">
import { ref } from 'vue'

// 各縣市門市數（示範資料）
const stores = [
  { county: '台北市', value: 42 }, { county: '新北市', value: 51 }, { county: '桃園市', value: 28 },
  { county: '台中市', value: 37 }, { county: '台南市', value: 19 }, { county: '高雄市', value: 33 },
  { county: '新竹市', value: 12 }, { county: '新竹縣', value: 8 }, { county: '彰化縣', value: 9 },
  { county: '嘉義市', value: 5 }, { county: '屏東縣', value: 6 }, { county: '宜蘭縣', value: 4 },
  { county: '花蓮縣', value: 3 }, { county: '基隆市', value: 7 }, { county: '苗栗縣', value: 4 },
]
const picked = ref<string[]>(['臺北市', '新北市'])
</script>

<template>
  <div style="display: flex; flex-wrap: wrap; gap: 24px; align-items: flex-start">
    <MlTaiwanMap
      v-model:selected="picked"
      :data="stores"
      tone="tech"
      scale="quantile"
      :steps="4"
      multiple
      labels
      :height="360"
      :highlight="['高雄市']"
      :disabled="['金門縣', '連江縣', '澎湖縣']"
      :format="(v) => `${v} 間`"
      value-label="門市"
    />
    <p style="margin: 0; color: var(--ml-text-muted); flex: 1 1 200px">已選 {{ picked.length }} 個縣市：{{ picked.join('、') || '（無）' }}</p>
  </div>
</template>
