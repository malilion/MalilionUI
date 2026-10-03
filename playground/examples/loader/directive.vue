<script setup lang="ts">
import { ref } from 'vue'

const busy = ref(true)
const page = ref(false)

function fullscreen() {
  page.value = true
  setTimeout(() => (page.value = false), 1600)
}
</script>

<template>
  <div class="wrap">
    <MlCard v-loading="busy" eyebrow="v-loading" title="本月營收" class="card">
      <MlStat label="營收" value="NT$ 1,284,000" :delta="12.4" />
    </MlCard>
    <MlCard v-loading="{ loading: busy, text: '小獅子正在計算…', variant: 'paws' }" eyebrow="text + paws" title="訂單" class="card">
      <MlStat label="訂單數" value="3,421" :delta="-2.1" />
    </MlCard>
    <div v-loading.fullscreen="page" />
    <MlSpace>
      <MlSwitch v-model="busy" label="載入中" />
      <MlButton variant="outline" size="sm" @click="fullscreen">全螢幕 1.6 秒</MlButton>
    </MlSpace>
  </div>
</template>

<style scoped>
.wrap {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
  width: 100%;
}

.card {
  min-height: 150px;
}
</style>
