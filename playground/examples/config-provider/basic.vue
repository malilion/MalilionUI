<script setup lang="ts">
import { computed, ref } from 'vue'
import { en, zhTW } from '@malilion/ui'

const lang = ref<'zh' | 'en'>('en')
const locale = computed(() => (lang.value === 'en' ? en : zhTW))
const date = ref<Date | null>(null)
const tags = ref(['Vue'])
const page = ref(3)
</script>

<template>
  <div class="wrap">
    <MlSegmented v-model="lang" :options="[{ value: 'zh', label: '繁體中文' }, { value: 'en', label: 'English' }]" />
    <MlConfigProvider :locale="locale">
      <div class="grid">
        <MlDatePicker v-model="date" clearable />
        <MlCombobox :options="[{ value: 1, label: 'Simba' }, { value: 2, label: 'Nala' }]" :model-value="null" />
        <MlTagInput v-model="tags" :max="3" />
        <MlPagination v-model:page="page" :total="12" />
      </div>
      <MlEmpty size="sm" />
    </MlConfigProvider>
  </div>
</template>

<style scoped>
.wrap {
  display: grid;
  gap: 20px;
  width: 100%;
  min-height: 460px;
  align-content: start;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
  align-items: center;
  margin-bottom: 16px;
}
</style>
