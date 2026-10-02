<script setup lang="ts">
import { ref } from 'vue'

const loading = ref(true)
</script>

<template>
  <div class="demo">
    <MlSwitch v-model="loading">載入中</MlSwitch>
    <MlSkeleton :loading="loading" avatar :rows="3">
      <div class="profile">
        <MlAvatar lion size="lg" />
        <div>
          <h4>碼力獅 Malilion</h4>
          <p>獅子 × 科技 × 金屬。負責巡邏程式碼、在 PR 上蓋腳印，偶爾在空狀態裡打瞌睡。</p>
        </div>
      </div>
    </MlSkeleton>
  </div>
</template>

<style scoped>
.demo {
  display: grid;
  gap: 18px;
  max-width: 520px;
}

.profile {
  display: flex;
  gap: 16px;
}

h4 {
  margin: 0 0 6px;
  color: var(--ml-text);
}

p {
  margin: 0;
  color: var(--ml-text-muted);
  font-size: var(--ml-text-sm);
}
</style>
