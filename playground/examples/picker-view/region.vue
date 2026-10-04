<script setup lang="ts">
import { computed, ref } from 'vue'
import { getTaiwanCounties, type MlPickerOption, type MlPickerValue } from '@malilion/ui'

// The 縣市 → 鄉鎮市區 tree is built here, so the dataset only ships with this page.
const regions: MlPickerOption[] = getTaiwanCounties().map((county) => ({
  label: county.name,
  value: county.name,
  children: county.districts.map((d) => ({ label: `${d.name} ${d.zip}`, value: d.name })),
}))

const open = ref(false)
const region = ref<MlPickerValue[]>(['臺中市', '西屯區'])
const draft = ref<MlPickerValue[]>([])
const text = computed(() => region.value.join(' '))

function show() {
  draft.value = [...region.value]
  open.value = true
}

function onConfirm(values: MlPickerValue[]) {
  region.value = values
  open.value = false
}
</script>

<template>
  <MlPhone :width="300" label="選擇地區畫面預覽" class="phone">
    <MlNavBar title="收件資料" back />
    <MlList variant="inset" title="收件地址">
      <MlListItem title="所在地區" :meta="text" clickable chevron @select="show" />
      <MlListItem title="郵寄方式" meta="宅配" />
    </MlList>
    <MlDrawer v-model:open="open" placement="bottom" :size="320" hide-close inline>
      <MlPickerView
        v-model="draft"
        :options="regions"
        :labels="['縣市', '鄉鎮市區']"
        title="選擇地區"
        @cancel="open = false"
        @confirm="onConfirm"
      />
    </MlDrawer>
  </MlPhone>
</template>

<style scoped>
/* Keep the inline drawer inside the phone screen instead of the viewport. */
.phone :deep(.ml-drawer) {
  position: absolute;
}

.phone :deep(.ml-drawer__body) {
  padding: 4px 8px 18px;
}
</style>
