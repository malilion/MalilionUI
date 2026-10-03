<script setup lang="ts">
import { ref } from 'vue'
import type { MlCascaderOption } from '@malilion/ui'

const area = ref<(string | number)[]>([])
const team = ref<(string | number)[]>(['eng', 'web'])

const areas: MlCascaderOption[] = [
  {
    value: 'taipei',
    label: '台北市',
    children: [
      { value: 'xinyi', label: '信義區' },
      { value: 'daan', label: '大安區' },
      { value: 'neihu', label: '內湖區' },
    ],
  },
  {
    value: 'newtaipei',
    label: '新北市',
    children: [
      { value: 'banqiao', label: '板橋區' },
      { value: 'tamsui', label: '淡水區' },
    ],
  },
  {
    value: 'taichung',
    label: '台中市',
    children: [
      { value: 'xitun', label: '西屯區' },
      { value: 'nantun', label: '南屯區', disabled: true },
    ],
  },
  { value: 'kaohsiung', label: '高雄市', children: [{ value: 'gushan', label: '鼓山區' }, { value: 'lingya', label: '苓雅區' }] },
]

const teams: MlCascaderOption[] = [
  {
    value: 'eng',
    label: '工程部',
    children: [
      { value: 'web', label: '前端組', children: [{ value: 'ui', label: 'UI 小隊' }, { value: 'perf', label: '效能小隊' }] },
      { value: 'api', label: '後端組' },
    ],
  },
  { value: 'design', label: '設計部', children: [{ value: 'brand', label: '品牌' }, { value: 'product', label: '產品設計' }] },
]
</script>

<template>
  <div class="form">
    <MlCascader v-model="area" :options="areas" index="01" label="縣市 / 區域" clearable />
    <MlCascader
      v-model="team"
      :options="teams"
      index="02"
      label="所屬團隊"
      change-on-select
      searchable
      hint="可以選到中間層；打字直接搜尋所有路徑"
    />
  </div>
</template>

<style scoped>
.form {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 20px;
  min-height: 380px;
  align-content: start;
}
</style>
