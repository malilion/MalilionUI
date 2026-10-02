<script setup lang="ts">
import { ref } from 'vue'

const city = ref<string | null>('tpe')
const cities = [
  { value: 'tpe', label: '台北 Taipei' },
  { value: 'ntpc', label: '新北 New Taipei' },
  { value: 'tyn', label: '桃園 Taoyuan' },
  { value: 'hsz', label: '新竹 Hsinchu' },
  { value: 'txg', label: '台中 Taichung' },
  { value: 'tnn', label: '台南 Tainan' },
  { value: 'khh', label: '高雄 Kaohsiung' },
  { value: 'ila', label: '宜蘭 Yilan' },
  { value: 'hun', label: '花蓮 Hualien' },
  { value: 'ttt', label: '台東 Taitung' },
]
</script>

<template>
  <div class="form">
    <MlCombobox
      v-model="city"
      index="02"
      label="據點城市"
      :options="cities"
      searchable
      placeholder="輸入中文或英文搜尋"
      hint="輸入時即時篩選，符合的文字會標亮。"
    >
      <template #prefix><MlIcon name="search" /></template>
    </MlCombobox>
  </div>
</template>

<style scoped>
.form {
  max-width: 420px;
}
</style>
