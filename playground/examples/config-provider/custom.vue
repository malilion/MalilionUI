<script setup lang="ts">
import { zhTW, type MlLocale } from '@malilion/ui'

// Start from a built-in locale and override only what you need.
const lionish: MlLocale = {
  ...zhTW,
  empty: { title: '獅群還在睡午覺 💤' },
  common: { ...zhTW.common, choose: '挑一隻小獅子' },
}
</script>

<template>
  <MlConfigProvider :locale="lionish">
    <div class="row">
      <MlCombobox :options="[{ value: 1, label: 'Simba' }]" :model-value="null" />
      <MlEmpty size="sm" art="paws" />
    </div>
  </MlConfigProvider>
</template>

<style scoped>
.row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 20px;
  align-items: center;
  width: 100%;
}
</style>
