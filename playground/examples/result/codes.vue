<script setup lang="ts">
import { ref } from 'vue'

const code = ref<'404' | '403' | '500'>('404')
</script>

<template>
  <div class="wrap">
    <MlSegmented v-model="code" :options="[{ value: '404', label: '404' }, { value: '403', label: '403' }, { value: '500', label: '500' }]" />
    <MlResult :key="code" :status="code">
      <template #actions>
        <MlButton stamp>帶我回家</MlButton>
        <MlButton variant="ghost">回報問題</MlButton>
      </template>
    </MlResult>
  </div>
</template>

<style scoped>
.wrap {
  display: grid;
  justify-items: center;
  gap: 8px;
  width: 100%;
}
</style>
