<script setup lang="ts">
import { ref } from 'vue'

const open = ref(false)
</script>

<template>
  <MlButton variant="danger" @click="open = true">刪除獅群</MlButton>

  <MlModal v-model:open="open" eyebrow="Danger Zone" title="刪除整個獅群？" :width="440">
    這個動作無法復原。所有成員、紀錄與設定都會被永久刪除。
    <template #footer="{ close }">
      <MlButton variant="ghost" @click="close">保留</MlButton>
      <MlButton variant="danger" @click="close">我確定，刪除</MlButton>
    </template>
  </MlModal>
</template>
